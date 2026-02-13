"""
z/OS RMF Workload Activity Report Parser & Web Interface
Parses RMF reports to extract APPL% CP Total by Service Class for TFP analysis.
Optimized version with threading, caching, and improved error handling.
"""

import re
import os
import glob
import io
import csv
import time
import logging
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Tuple, Optional, Dict

from flask import Flask, render_template, jsonify, request, send_file
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB max file size
MAX_WORKERS = 4  # Thread pool workers for parallel parsing
CACHE_MAXSIZE = 128  # LRU cache size
PORT = 5001  # Server port
CACHE_TTL_SECONDS = 300  # Parse cache TTL (5 minutes)
RATE_LIMIT_MAX = 10  # Max uploads per IP per window
RATE_LIMIT_WINDOW = 60  # Rate limit window in seconds

_START_TIME = time.time()

# ---------------------------------------------------------------------------
# Rate Limiter (in-memory, per-IP)
# ---------------------------------------------------------------------------

_upload_rate: Dict[str, List[float]] = {}


def _check_rate_limit(ip: str) -> bool:
    """Return True if the IP is within the upload rate limit."""
    now = time.time()
    timestamps = _upload_rate.get(ip, [])
    # Prune entries outside the window
    timestamps = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
    _upload_rate[ip] = timestamps
    if len(timestamps) >= RATE_LIMIT_MAX:
        return False
    timestamps.append(now)
    return True


# ---------------------------------------------------------------------------
# Cache Stats
# ---------------------------------------------------------------------------

_cache_hits = 0
_cache_misses = 0

# ---------------------------------------------------------------------------
# Data Model
# ---------------------------------------------------------------------------

@dataclass
class RMFRecord:
    timestamp: str        # MM/DD/YYYY HH.MM.SS
    datetime_iso: str     # ISO format for JS
    service_class: str
    workload: str
    period: int
    appl_cp_total: float
    file_source: str

    def to_dict(self):
        return asdict(self)

# ---------------------------------------------------------------------------
# RMF Parser (optimized state-machine approach)
# ---------------------------------------------------------------------------

# Compiled regex patterns
RE_TIMESTAMP = re.compile(
    r'START\s+(\d{2}/\d{2}/\d{4})-(\d{2}\.\d{2}\.\d{2})\s+INTERVAL'
)
RE_SERVICE_CLASS = re.compile(
    r'WORKLOAD=(\w+)\s+SERVICE CLASS=(\w+)\s+.*?PERIOD=(\d+)'
)
RE_ALL_DATA_ZERO = re.compile(r'ALL DATA ZERO')
RE_TOTAL_LINE = re.compile(
    r'^\s*AVG\s+.*?TOTAL\s+([\d.]+)'
)

# Fast path strings for pre-filtering
START_MARKER = "START "
WORKLOAD_MARKER = "WORKLOAD="
AVG_MARKER = "AVG"
ALL_DATA_ZERO_MARKER = "ALL DATA ZERO"


def _get_file_hash(filepath: str) -> str:
    """Generate a hash based on file path, mtime, and size for caching."""
    try:
        stat = os.stat(filepath)
        hash_input = f"{filepath}:{stat.st_mtime}:{stat.st_size}"
        return hashlib.md5(hash_input.encode()).hexdigest()
    except (OSError, IOError):
        return None


def parse_rmf_file(filepath: str) -> Tuple[List[RMFRecord], Optional[str]]:
    """
    Parse a single RMF Workload Activity report file.
    Returns (records, error_message).
    """
    records: List[RMFRecord] = []
    filename = os.path.basename(filepath)
    
    # File size check
    try:
        file_size = os.path.getsize(filepath)
        if file_size > MAX_FILE_SIZE:
            return [], f"File too large: {file_size / 1024 / 1024:.1f}MB (max {MAX_FILE_SIZE / 1024 / 1024:.0f}MB)"
        if file_size == 0:
            return [], "File is empty"
    except OSError as e:
        return [], f"Cannot access file: {str(e)}"

    current_ts_display = None
    current_ts_iso = None
    current_workload = None
    current_svc_class = None
    current_period = None
    awaiting_data = False
    skip_class = False
    line_count = 0

    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                line_count += 1
                
                # Fast path: check for START marker before regex
                if START_MARKER in line:
                    m = RE_TIMESTAMP.search(line)
                    if m:
                        date_part, time_part = m.group(1), m.group(2)
                        current_ts_display = f"{date_part} {time_part}"
                        try:
                            dt = datetime.strptime(
                                f"{date_part}-{time_part}", "%m/%d/%Y-%H.%M.%S"
                            )
                            current_ts_iso = dt.isoformat()
                        except ValueError:
                            current_ts_iso = current_ts_display
                        continue

                # Fast path: check for WORKLOAD marker before regex
                if WORKLOAD_MARKER in line:
                    m = RE_SERVICE_CLASS.search(line)
                    if m:
                        current_workload = m.group(1)
                        current_svc_class = m.group(2)
                        current_period = int(m.group(3))
                        awaiting_data = True
                        skip_class = False
                        continue

                # Check for ALL DATA ZERO
                if awaiting_data and ALL_DATA_ZERO_MARKER in line:
                    if RE_ALL_DATA_ZERO.search(line):
                        skip_class = True
                        awaiting_data = False
                        continue

                # Check for TOTAL line - fast path with AVG marker
                if awaiting_data and not skip_class and AVG_MARKER in line:
                    m = RE_TOTAL_LINE.match(line)
                    if m:
                        try:
                            appl_cp = float(m.group(1))
                            records.append(RMFRecord(
                                timestamp=current_ts_display,
                                datetime_iso=current_ts_iso,
                                service_class=current_svc_class,
                                workload=current_workload,
                                period=current_period,
                                appl_cp_total=appl_cp,
                                file_source=filename,
                            ))
                        except ValueError:
                            pass  # Skip invalid numbers
                        awaiting_data = False
                        continue

    except UnicodeDecodeError as e:
        return [], f"File encoding error at line {line_count}: {str(e)}"
    except Exception as e:
        return [], f"Parse error at line {line_count}: {str(e)}"

    return records, None


def _parse_single_file(args: Tuple[str, str]) -> Tuple[str, List[RMFRecord], Optional[str]]:
    """Wrapper for parallel parsing - returns (filepath, records, error)."""
    filepath, file_hash = args
    
    # Check cache first
    if file_hash:
        cached = _get_cached_parse(file_hash)
        if cached is not None:
            logging.info(f"Cache hit for {os.path.basename(filepath)}")
            return filepath, cached, None
    
    records, error = parse_rmf_file(filepath)
    
    # Cache the result
    if file_hash and error is None:
        _set_cached_parse(file_hash, records)
    
    return filepath, records, error


# Simple in-memory cache for parsed results
_parse_cache: Dict[str, Tuple[List[RMFRecord], float]] = {}


def _get_cached_parse(file_hash: str) -> Optional[List[RMFRecord]]:
    """Get cached parse result if not expired."""
    global _cache_hits, _cache_misses
    if file_hash in _parse_cache:
        records, timestamp = _parse_cache[file_hash]
        if time.time() - timestamp < CACHE_TTL_SECONDS:
            _cache_hits += 1
            return records
        else:
            del _parse_cache[file_hash]
    _cache_misses += 1
    return None


def _set_cached_parse(file_hash: str, records: List[RMFRecord]):
    """Cache parse result with timestamp."""
    _parse_cache[file_hash] = (records, time.time())


def parse_all_files(directory: str, pattern: str = "RMFW*.txt") -> Tuple[List[RMFRecord], dict]:
    """
    Parse all matching RMF files in a directory using parallel processing.
    """
    files = sorted(glob.glob(os.path.join(directory, pattern)))
    all_records: List[RMFRecord] = []
    errors: List[str] = []
    t0 = time.time()
    
    # Prepare file hash cache keys
    file_args = []
    for fp in files:
        file_hash = _get_file_hash(fp)
        file_args.append((fp, file_hash))
    
    # Use ThreadPoolExecutor for parallel parsing
    if len(files) > 1:
        with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, len(files))) as executor:
            futures = {executor.submit(_parse_single_file, arg): arg[0] for arg in file_args}
            
            for future in as_completed(futures):
                filepath = futures[future]
                filename = os.path.basename(filepath)
                try:
                    _, records, error = future.result()
                    if error:
                        errors.append(f"{filename}: {error}")
                        logging.warning(f"Error parsing {filename}: {error}")
                    else:
                        all_records.extend(records)
                        logging.info(f"Parsed {filename} -> {len(records)} records")
                except Exception as e:
                    errors.append(f"{filename}: {str(e)}")
                    logging.error(f"Exception parsing {filename}: {e}")
    else:
        # Single file - parse directly
        for filepath, file_hash in file_args:
            filename = os.path.basename(filepath)
            _, records, error = _parse_single_file((filepath, file_hash))
            if error:
                errors.append(f"{filename}: {error}")
            else:
                all_records.extend(records)
                logging.info(f"Parsed {filename} -> {len(records)} records")

    elapsed = time.time() - t0
    stats = {
        "files_parsed": len(files),
        "files_success": len(files) - len(errors),
        "files_failed": len(errors),
        "file_names": [os.path.basename(f) for f in files],
        "total_records": len(all_records),
        "parse_time_seconds": round(elapsed, 3),
        "errors": errors if errors else None,
    }
    logging.info(f"Total: {stats['total_records']} records from {stats['files_parsed']} files in {elapsed:.2f}s")
    return all_records, stats

# ---------------------------------------------------------------------------
# Flask Application
# ---------------------------------------------------------------------------

app = Flask(__name__)
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(DATA_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'txt', 'rmf'}

# Create upload folder
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Update max content length to 50MB
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Global cache
ALL_RECORDS: List[RMFRecord] = []
PARSE_STATS: dict = {}
_METADATA_CACHE = None
_METADATA_CACHE_TIME = 0
METADATA_CACHE_TTL = 5  # 5 seconds


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_filename(filename: str) -> Tuple[bool, str]:
    """Validate filename for security."""
    if not filename or filename == '':
        return False, "Empty filename"
    if filename.startswith('.') or '..' in filename:
        return False, "Invalid filename"
    if not allowed_file(filename):
        return False, f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    return True, ""


def validate_pagination(limit: str, offset: str) -> Tuple[Optional[int], Optional[int], str]:
    """Validate pagination parameters."""
    try:
        limit_val = int(limit) if limit else None
        offset_val = int(offset) if offset else 0
        
        if limit_val is not None and (limit_val < 1 or limit_val > 10000):
            return None, None, "Limit must be between 1 and 10000"
        if offset_val < 0:
            return None, None, "Offset must be non-negative"
            
        return limit_val, offset_val, ""
    except ValueError:
        return None, None, "Invalid pagination parameters"


def clear_uploads():
    """Clear all files in upload folder."""
    for filename in os.listdir(UPLOAD_FOLDER):
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        try:
            if os.path.isfile(file_path):
                os.unlink(file_path)
        except Exception as e:
            logging.error(f"Error deleting {file_path}: {e}")
    # Clear parse cache when uploads are cleared
    _parse_cache.clear()


def init_data():
    """Initialize data from uploaded files."""
    global ALL_RECORDS, PARSE_STATS, _METADATA_CACHE
    ALL_RECORDS, PARSE_STATS = parse_all_files(UPLOAD_FOLDER)
    _METADATA_CACHE = None  # Invalidate metadata cache


# ---------------------------------------------------------------------------
# Error Handlers
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found", "message": str(error)}), 404


@app.errorhandler(500)
def internal_error(error):
    logging.error(f"Internal error: {error}")
    return jsonify({"error": "Internal server error", "message": "An unexpected error occurred"}), 500


@app.errorhandler(RequestEntityTooLarge)
def too_large(error):
    return jsonify({
        "error": "File too large",
        "message": f"Maximum file size is {MAX_FILE_SIZE / 1024 / 1024:.0f}MB"
    }), 413


# ---------------------------------------------------------------------------
# After-Request Handlers (logging, CORS)
# ---------------------------------------------------------------------------

@app.before_request
def _before_request():
    """Record request start time for logging."""
    request._start_time = time.time()


@app.after_request
def _add_cors_headers(response):
    """Add CORS headers for dev environments."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, If-None-Match"
    return response


@app.after_request
def _log_request(response):
    """Log each request with method, path, status, and response time."""
    start = getattr(request, '_start_time', None)
    duration_ms = round((time.time() - start) * 1000, 1) if start else 0
    logging.info(
        "%-6s %-30s %d  %.1fms",
        request.method, request.path, response.status_code, duration_ms,
    )
    return response


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@app.route("/api/health")
def api_health():
    """Health check endpoint for monitoring."""
    total = _cache_hits + _cache_misses
    return jsonify({
        "status": "ok",
        "records_loaded": len(ALL_RECORDS),
        "files_loaded": PARSE_STATS.get("files_parsed", 0),
        "uptime_seconds": round(time.time() - _START_TIME, 1),
        "cache": {
            "ttl_seconds": CACHE_TTL_SECONDS,
            "entries": len(_parse_cache),
            "hits": _cache_hits,
            "misses": _cache_misses,
            "hit_rate": round(_cache_hits / total, 3) if total > 0 else 0,
        },
    })


@app.route("/api/upload", methods=["POST"])
def api_upload():
    """Handle file uploads and parse them."""
    global ALL_RECORDS, PARSE_STATS, _METADATA_CACHE

    # Rate limit check
    client_ip = request.remote_addr or "unknown"
    if not _check_rate_limit(client_ip):
        return jsonify({
            "error": "Rate limit exceeded",
            "message": f"Maximum {RATE_LIMIT_MAX} uploads per {RATE_LIMIT_WINDOW} seconds"
        }), 429

    if 'files' not in request.files:
        return jsonify({"error": "No files provided"}), 400
    
    files = request.files.getlist('files')
    if not files or files[0].filename == '':
        return jsonify({"error": "No files selected"}), 400
    
    # Clear previous uploads if requested
    clear_first = request.form.get('clear_existing', 'false').lower() == 'true'
    if clear_first:
        clear_uploads()
        ALL_RECORDS = []
    
    uploaded_files = []
    errors = []
    
    for file in files:
        if not file or not file.filename:
            continue
            
        # Validate filename
        is_valid, error_msg = validate_filename(file.filename)
        if not is_valid:
            errors.append(f"{file.filename}: {error_msg}")
            continue
        
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Handle duplicate filenames
        counter = 1
        original_name = filename
        while os.path.exists(filepath):
            name, ext = os.path.splitext(original_name)
            filename = f"{name}_{counter}{ext}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            counter += 1
        
        try:
            # Pre-save size check
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            
            if file_size > MAX_FILE_SIZE:
                errors.append(f"{original_name}: File too large ({file_size / 1024 / 1024:.1f}MB)")
                continue
            
            file.save(filepath)
            
            # Post-save verification
            saved_size = os.path.getsize(filepath)
            if saved_size != file_size:
                os.unlink(filepath)
                errors.append(f"{original_name}: File save error (size mismatch)")
                continue
                
            uploaded_files.append(filename)
            
        except Exception as e:
            errors.append(f"{original_name}: {str(e)}")
            # Clean up partial file
            if os.path.exists(filepath):
                try:
                    os.unlink(filepath)
                except OSError:
                    pass
    
    if not uploaded_files:
        return jsonify({
            "error": "No valid files uploaded",
            "details": errors
        }), 400
    
    # Re-parse all files in upload folder
    try:
        ALL_RECORDS, PARSE_STATS = parse_all_files(UPLOAD_FOLDER)
        _METADATA_CACHE = None  # Invalidate cache
    except Exception as e:
        logging.error(f"Parse error: {e}")
        return jsonify({
            "error": f"Parse error: {str(e)}",
            "uploaded": uploaded_files
        }), 500
    
    return jsonify({
        "success": True,
        "uploaded_files": uploaded_files,
        "errors": errors if errors else None,
        "total_records": len(ALL_RECORDS),
        "files_parsed": PARSE_STATS.get('files_parsed', 0),
        "parse_time_seconds": PARSE_STATS.get('parse_time_seconds', 0),
    })


@app.route("/api/files", methods=["GET"])
def api_files():
    """List uploaded files."""
    files = []
    try:
        for filename in os.listdir(UPLOAD_FOLDER):
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                files.append({
                    "name": filename,
                    "size": stat.st_size,
                    "size_human": f"{stat.st_size / 1024:.1f} KB" if stat.st_size < 1024 * 1024 else f"{stat.st_size / 1024 / 1024:.2f} MB",
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                })
    except OSError as e:
        return jsonify({"error": f"Cannot list files: {str(e)}"}), 500
    
    return jsonify({"files": files})


@app.route("/api/files/clear", methods=["POST"])
def api_clear_files():
    """Clear all uploaded files."""
    global ALL_RECORDS, PARSE_STATS, _METADATA_CACHE
    try:
        clear_uploads()
        ALL_RECORDS = []
        PARSE_STATS = {"files_parsed": 0, "total_records": 0}
        _METADATA_CACHE = None
        return jsonify({"success": True, "message": "All files cleared"})
    except Exception as e:
        logging.error(f"Error clearing files: {e}")
        return jsonify({"error": f"Failed to clear files: {str(e)}"}), 500


@app.route("/")
def index():
    """Render main page."""
    return render_template("index.html")


@app.route("/api/metadata")
def api_metadata():
    """Return unique filter values and date range with caching."""
    global _METADATA_CACHE, _METADATA_CACHE_TIME
    
    # Return cached metadata if valid
    current_time = time.time()
    if _METADATA_CACHE and (current_time - _METADATA_CACHE_TIME) < METADATA_CACHE_TTL:
        return jsonify(_METADATA_CACHE)
    
    try:
        workloads = sorted(set(r.workload for r in ALL_RECORDS))
        service_classes = sorted(set(r.service_class for r in ALL_RECORDS))
        dates = sorted(set(r.datetime_iso for r in ALL_RECORDS if r.datetime_iso))
        file_sources = sorted(set(r.file_source for r in ALL_RECORDS))
        
        result = {
            "workloads": workloads,
            "service_classes": service_classes,
            "file_sources": file_sources,
            "date_range": {
                "min": dates[0] if dates else None,
                "max": dates[-1] if dates else None,
            },
            "total_records": len(ALL_RECORDS),
            "parse_stats": PARSE_STATS,
        }
        
        # Cache the result
        _METADATA_CACHE = result
        _METADATA_CACHE_TIME = current_time
        
        return jsonify(result)
    except Exception as e:
        logging.error(f"Metadata error: {e}")
        return jsonify({"error": f"Failed to generate metadata: {str(e)}"}), 500


def _apply_filters(records: List[RMFRecord]) -> List[RMFRecord]:
    """Apply query-string filters to records in a single pass."""
    wl = request.args.get("workload")
    sc = request.args.get("service_class")
    src = request.args.get("file_source")
    start = request.args.get("start_date")
    end = request.args.get("end_date")

    # Short-circuit: no filters active
    if not any((wl, sc, src, start, end)):
        return records

    return [r for r in records if
            (not wl or r.workload == wl) and
            (not sc or r.service_class == sc) and
            (not src or r.file_source == src) and
            (not start or (r.datetime_iso and r.datetime_iso >= start)) and
            (not end or (r.datetime_iso and r.datetime_iso <= end))]


@app.route("/api/data")
def api_data():
    """Return filtered RMF records as JSON with optional pagination."""
    try:
        # Validate pagination params
        limit, offset, error = validate_pagination(
            request.args.get("limit"),
            request.args.get("offset")
        )
        if error:
            return jsonify({"error": error}), 400
        
        # Apply filters
        filtered = _apply_filters(ALL_RECORDS)
        total_filtered = len(filtered)
        
        # Apply pagination
        if offset:
            filtered = filtered[offset:]
        if limit:
            filtered = filtered[:limit]
        
        payload = {
            "data": [r.to_dict() for r in filtered],
            "count": len(filtered),
            "total": len(ALL_RECORDS),
            "total_filtered": total_filtered,
            "pagination": {
                "limit": limit,
                "offset": offset or 0,
            } if limit or offset else None,
        }

        # ETag support - hash the response to avoid resending unchanged data
        response = jsonify(payload)
        etag = hashlib.md5(response.get_data()).hexdigest()
        response.headers["ETag"] = etag
        if request.headers.get("If-None-Match") == etag:
            return "", 304
        return response
    except Exception as e:
        logging.error(f"Data API error: {e}")
        return jsonify({"error": f"Failed to fetch data: {str(e)}"}), 500


@app.route("/api/export/csv")
def api_export_csv():
    """Export filtered data as a downloadable CSV."""
    try:
        filtered = _apply_filters(ALL_RECORDS)

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "DATE-TIME", "SERVICE CLASS", "WORKLOAD",
            "PERIOD", "APPL % CP", "SOURCE FILE",
        ])
        for r in filtered:
            writer.writerow([
                r.timestamp, r.service_class, r.workload,
                r.period, r.appl_cp_total, r.file_source,
            ])

        output = io.BytesIO(buf.getvalue().encode("utf-8"))
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return send_file(
            output,
            mimetype="text/csv",
            as_attachment=True,
            download_name=f"rmf_report_{ts}.csv",
        )
    except Exception as e:
        logging.error(f"Export error: {e}")
        return jsonify({"error": f"Export failed: {str(e)}"}), 500


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    init_data()
    print(f"\n  RMF Analyzer ready -> http://127.0.0.1:{PORT}")
    print(f"  Max file size: {MAX_FILE_SIZE / 1024 / 1024:.0f}MB")
    print(f"  Thread workers: {MAX_WORKERS}")
    print(f"  Cache TTL: {CACHE_TTL_SECONDS}s\n")
    app.run(debug=False, host="127.0.0.1", port=PORT)
