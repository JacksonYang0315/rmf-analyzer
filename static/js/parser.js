/**
 * RMF Workload Activity Report Parser (Client-Side)
 * Ported from Python server-side parser to run entirely in the browser.
 * Parses RMF reports to extract APPL% CP Total by Service Class.
 */

// Compiled regex patterns
const RE_TIMESTAMP = /START\s+(\d{2}\/\d{2}\/\d{4})-(\d{2}\.\d{2}\.\d{2})\s+INTERVAL/;
const RE_SERVICE_CLASS = /WORKLOAD=(\w+)\s+SERVICE CLASS=(\w+)\s+.*?PERIOD=(\d+)/;
const RE_ALL_DATA_ZERO = /ALL DATA ZERO/;
const RE_TOTAL_LINE = /^\s*AVG\s+.*?TOTAL\s+([\d.]+)/;

// Fast path marker strings for pre-filtering
const START_MARKER = 'START ';
const WORKLOAD_MARKER = 'WORKLOAD=';
const AVG_MARKER = 'AVG';
const ALL_DATA_ZERO_MARKER = 'ALL DATA ZERO';

/**
 * Parse a single RMF file content string.
 * @param {string} text - File content as text
 * @param {string} filename - Original filename for record tracking
 * @returns {{ records: Array, error: string|null }}
 */
function parseRMFText(text, filename) {
  const records = [];

  let currentTsDisplay = null;
  let currentTsIso = null;
  let currentWorkload = null;
  let currentSvcClass = null;
  let currentPeriod = null;
  let awaitingData = false;
  let skipClass = false;

  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fast path: check for START marker before regex
    if (line.includes(START_MARKER)) {
      const m = RE_TIMESTAMP.exec(line);
      if (m) {
        const datePart = m[1]; // MM/DD/YYYY
        const timePart = m[2]; // HH.MM.SS
        currentTsDisplay = datePart + ' ' + timePart;
        try {
          // Parse MM/DD/YYYY-HH.MM.SS to ISO
          const [month, day, year] = datePart.split('/');
          const [hour, minute, second] = timePart.split('.');
          const dt = new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hour, 10),
            parseInt(minute, 10),
            parseInt(second, 10)
          );
          currentTsIso = dt.toISOString();
        } catch (_) {
          currentTsIso = currentTsDisplay;
        }
        continue;
      }
    }

    // Fast path: check for WORKLOAD marker before regex
    if (line.includes(WORKLOAD_MARKER)) {
      const m = RE_SERVICE_CLASS.exec(line);
      if (m) {
        currentWorkload = m[1];
        currentSvcClass = m[2];
        currentPeriod = parseInt(m[3], 10);
        awaitingData = true;
        skipClass = false;
        continue;
      }
    }

    // Check for ALL DATA ZERO
    if (awaitingData && line.includes(ALL_DATA_ZERO_MARKER)) {
      if (RE_ALL_DATA_ZERO.test(line)) {
        skipClass = true;
        awaitingData = false;
        continue;
      }
    }

    // Check for TOTAL line - fast path with AVG marker
    if (awaitingData && !skipClass && line.includes(AVG_MARKER)) {
      const m = RE_TOTAL_LINE.exec(line);
      if (m) {
        const applCp = parseFloat(m[1]);
        if (!isNaN(applCp)) {
          records.push({
            timestamp: currentTsDisplay,
            datetime_iso: currentTsIso,
            service_class: currentSvcClass,
            workload: currentWorkload,
            period: currentPeriod,
            appl_cp_total: applCp,
            file_source: filename,
          });
        }
        awaitingData = false;
        continue;
      }
    }
  }

  return { records, error: null };
}

/**
 * Read a File object and parse its RMF content.
 * @param {File} file - File object from file input
 * @returns {Promise<{ filename: string, records: Array, error: string|null }>}
 */
function parseRMFFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const text = e.target.result;
      const { records, error } = parseRMFText(text, file.name);
      resolve({ filename: file.name, records, error });
    };
    reader.onerror = function () {
      resolve({ filename: file.name, records: [], error: 'Failed to read file' });
    };
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Parse multiple File objects in parallel.
 * @param {File[]} files - Array of File objects
 * @returns {Promise<{ allRecords: Array, stats: object }>}
 */
async function parseAllFiles(files) {
  const t0 = performance.now();
  const results = await Promise.all(files.map(f => parseRMFFile(f)));

  const allRecords = [];
  const errors = [];
  const fileNames = [];

  results.forEach(({ filename, records, error }) => {
    fileNames.push(filename);
    if (error) {
      errors.push(filename + ': ' + error);
    } else {
      allRecords.push(...records);
    }
  });

  const elapsed = (performance.now() - t0) / 1000;
  const stats = {
    files_parsed: files.length,
    files_success: files.length - errors.length,
    files_failed: errors.length,
    file_names: fileNames,
    total_records: allRecords.length,
    parse_time_seconds: Math.round(elapsed * 1000) / 1000,
    errors: errors.length > 0 ? errors : null,
  };

  return { allRecords, stats };
}

/**
 * Compute metadata (unique filter values, date range) from records.
 * @param {Array} records
 * @param {object} parseStats
 * @returns {object}
 */
function computeMetadata(records, parseStats) {
  const workloadSet = new Set();
  const svcClassSet = new Set();
  const fileSourceSet = new Set();
  const dates = [];

  records.forEach(r => {
    workloadSet.add(r.workload);
    svcClassSet.add(r.service_class);
    fileSourceSet.add(r.file_source);
    if (r.datetime_iso) dates.push(r.datetime_iso);
  });

  dates.sort();

  return {
    workloads: Array.from(workloadSet).sort(),
    service_classes: Array.from(svcClassSet).sort(),
    file_sources: Array.from(fileSourceSet).sort(),
    date_range: {
      min: dates.length > 0 ? dates[0] : null,
      max: dates.length > 0 ? dates[dates.length - 1] : null,
    },
    total_records: records.length,
    parse_stats: parseStats || {},
  };
}

/**
 * Apply filters to records.
 * @param {Array} records
 * @param {object} filters - { workload, service_class, file_source, start_date, end_date }
 * @returns {Array}
 */
function applyFilters(records, filters) {
  if (!filters) return records;

  const { workload, service_class, file_source, start_date, end_date } = filters;

  if (!workload && !service_class && !file_source && !start_date && !end_date) {
    return records;
  }

  return records.filter(r =>
    (!workload || r.workload === workload) &&
    (!service_class || r.service_class === service_class) &&
    (!file_source || r.file_source === file_source) &&
    (!start_date || (r.datetime_iso && r.datetime_iso >= start_date)) &&
    (!end_date || (r.datetime_iso && r.datetime_iso <= end_date))
  );
}

/**
 * Export records to CSV and trigger download.
 * @param {Array} records
 */
function exportToCSV(records) {
  const header = ['DATE-TIME', 'SERVICE CLASS', 'WORKLOAD', 'PERIOD', 'APPL % CP', 'SOURCE FILE'];
  const rows = records.map(r => [
    r.timestamp,
    r.service_class,
    r.workload,
    r.period,
    r.appl_cp_total,
    r.file_source,
  ]);

  let csv = header.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(v => {
      const s = String(v);
      // Quote fields containing commas, quotes, or newlines
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rmf_report_' + ts + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
