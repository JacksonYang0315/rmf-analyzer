"""
z/OS RMF Workload Activity Report Parser & Web Interface
Parses RMF reports to extract APPL% CP Total by Service Class for TFP analysis.
"""

import re
import os
import glob
import io
import csv
import time
import logging
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Tuple, Optional

from flask import Flask, render_template, jsonify, request, send_file

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
# RMF Parser (state-machine approach)
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


def parse_rmf_file(filepath: str) -> List[RMFRecord]:
    """Parse a single RMF Workload Activity report file."""
    records: List[RMFRecord] = []
    filename = os.path.basename(filepath)

    current_ts_display = None   # "MM/DD/YYYY HH.MM.SS"
    current_ts_iso = None       # ISO string for JS
    current_workload = None
    current_svc_class = None
    current_period = None
    awaiting_data = False       # True when we have a service class and need TOTAL
    skip_class = False          # True after ALL DATA ZERO

    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            # --- Check for timestamp ---
            m = RE_TIMESTAMP.search(line)
            if m:
                date_part, time_part = m.group(1), m.group(2)
                current_ts_display = f"{date_part} {time_part}"
                # Parse to ISO: "05/15/2025" "00.00.00"
                try:
                    dt = datetime.strptime(
                        f"{date_part}-{time_part}", "%m/%d/%Y-%H.%M.%S"
                    )
                    current_ts_iso = dt.isoformat()
                except ValueError:
                    current_ts_iso = current_ts_display
                continue

            # --- Check for service class header ---
            m = RE_SERVICE_CLASS.search(line)
            if m:
                current_workload = m.group(1)
                current_svc_class = m.group(2)
                current_period = int(m.group(3))
                awaiting_data = True
                skip_class = False
                continue

            # --- Check for ALL DATA ZERO ---
            if awaiting_data and RE_ALL_DATA_ZERO.search(line):
                skip_class = True
                awaiting_data = False
                continue

            # --- Check for TOTAL line (AVG ... TOTAL x.xx) ---
            if awaiting_data and not skip_class:
                m = RE_TOTAL_LINE.match(line)
                if m:
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
                    awaiting_data = False
                    continue

    return records


def parse_all_files(directory: str, pattern: str = "RMFW*.txt") -> Tuple[List[RMFRecord], dict]:
    """Parse all matching RMF files in a directory."""
    files = sorted(glob.glob(os.path.join(directory, pattern)))
    all_records: List[RMFRecord] = []
    t0 = time.time()

    for fp in files:
        logging.info(f"Parsing {fp} ...")
        records = parse_rmf_file(fp)
        all_records.extend(records)
        logging.info(f"  -> {len(records)} records extracted")

    elapsed = time.time() - t0
    stats = {
        "files_parsed": len(files),
        "file_names": [os.path.basename(f) for f in files],
        "total_records": len(all_records),
        "parse_time_seconds": round(elapsed, 3),
    }
    logging.info(f"Total: {stats['total_records']} records from {stats['files_parsed']} files in {elapsed:.2f}s")
    return all_records, stats

# ---------------------------------------------------------------------------
# Flask Application
# ---------------------------------------------------------------------------

app = Flask(__name__)
DATA_DIR = os.path.dirname(os.path.abspath(__file__))

# Global cache
ALL_RECORDS: List[RMFRecord] = []
PARSE_STATS: dict = {}


def init_data():
    global ALL_RECORDS, PARSE_STATS
    ALL_RECORDS, PARSE_STATS = parse_all_files(DATA_DIR)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/metadata")
def api_metadata():
    """Return unique filter values and date range."""
    workloads = sorted(set(r.workload for r in ALL_RECORDS))
    service_classes = sorted(set(r.service_class for r in ALL_RECORDS))
    dates = sorted(set(r.datetime_iso for r in ALL_RECORDS))
    file_sources = sorted(set(r.file_source for r in ALL_RECORDS))

    return jsonify({
        "workloads": workloads,
        "service_classes": service_classes,
        "file_sources": file_sources,
        "date_range": {
            "min": dates[0] if dates else None,
            "max": dates[-1] if dates else None,
        },
        "total_records": len(ALL_RECORDS),
        "parse_stats": PARSE_STATS,
    })


def _apply_filters(records: List[RMFRecord]) -> List[RMFRecord]:
    """Apply query-string filters to records."""
    filtered = records

    wl = request.args.get("workload")
    if wl:
        filtered = [r for r in filtered if r.workload == wl]

    sc = request.args.get("service_class")
    if sc:
        filtered = [r for r in filtered if r.service_class == sc]

    src = request.args.get("file_source")
    if src:
        filtered = [r for r in filtered if r.file_source == src]

    start = request.args.get("start_date")
    if start:
        filtered = [r for r in filtered if r.datetime_iso >= start]

    end = request.args.get("end_date")
    if end:
        filtered = [r for r in filtered if r.datetime_iso <= end]

    return filtered


@app.route("/api/data")
def api_data():
    """Return filtered RMF records as JSON."""
    filtered = _apply_filters(ALL_RECORDS)
    return jsonify({
        "data": [r.to_dict() for r in filtered],
        "count": len(filtered),
        "total": len(ALL_RECORDS),
    })


@app.route("/api/export/csv")
def api_export_csv():
    """Export filtered data as a downloadable CSV."""
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


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    init_data()
    print("\n  RMF Analyzer ready -> http://127.0.0.1:5001\n")
    app.run(debug=False, host="127.0.0.1", port=5001)
