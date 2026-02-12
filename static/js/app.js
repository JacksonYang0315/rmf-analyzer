/* -----------------------------------------------------------------------
   z/OS RMF Workload Activity Analyzer - Frontend
   ----------------------------------------------------------------------- */

let metadata = {};
let currentData = [];
let dataTable = null;
let cpuChart = null;

// ── Colour palette (distinct, colour-blind friendly) ──────────────────
const PALETTE = [
  '#4e54c8','#f5576c','#4facfe','#43e97b','#fa709a','#fee140',
  '#a18cd1','#fbc2eb','#f68084','#fccb90','#d4fc79','#96e6a1',
  '#84fab0','#8fd3f4','#cfd9df','#e2ebf0','#667eea','#764ba2',
  '#f093fb','#00f2fe','#38f9d7','#0ba360','#3cba92','#ff6a00',
];

function colour(i) { return PALETTE[i % PALETTE.length]; }

// ── Bootstrap on ready ────────────────────────────────────────────────
$(document).ready(async () => {
  await loadMetadata();
  await loadData();
  wireEvents();
  $('#loadingOverlay').addClass('hidden');
});

// ── Load metadata (filter options) ────────────────────────────────────
async function loadMetadata() {
  const res = await fetch('/api/metadata');
  metadata = await res.json();

  // Populate dropdowns
  fillSelect('#filterSource',   metadata.file_sources);
  fillSelect('#filterWorkload', metadata.workloads);
  fillSelect('#filterSvcClass', metadata.service_classes);

  // Date pickers
  if (metadata.date_range.min) {
    $('#filterStart').val(metadata.date_range.min.substring(0, 16));
  }
  if (metadata.date_range.max) {
    $('#filterEnd').val(metadata.date_range.max.substring(0, 16));
  }

  // Stats
  $('#statRecords').text(metadata.total_records.toLocaleString());
  $('#statFiles').text(metadata.parse_stats.files_parsed);
  $('#statClasses').text(metadata.service_classes.length);
  $('#headerBadge').text(metadata.total_records + ' records');
}

function fillSelect(sel, items) {
  items.forEach(v => $(sel).append(`<option value="${v}">${v}</option>`));
}

// ── Load data (with optional filters) ─────────────────────────────────
async function loadData(filters) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  }
  const res = await fetch('/api/data?' + params);
  const json = await res.json();
  currentData = json.data;

  $('#statFiltered').text(json.count.toLocaleString());
  renderTable();
  renderChart();
}

// ── DataTable ─────────────────────────────────────────────────────────
function renderTable() {
  if (dataTable) { dataTable.destroy(); $('#dataTable tbody').empty(); }

  const tbody = $('#dataTable tbody');
  currentData.forEach(r => {
    tbody.append(`<tr>
      <td>${r.timestamp}</td>
      <td><span class="badge bg-primary bg-opacity-75">${r.service_class}</span></td>
      <td>${r.workload}</td>
      <td>${r.period}</td>
      <td class="fw-semibold">${r.appl_cp_total.toFixed(2)}</td>
      <td><small class="text-muted">${r.file_source}</small></td>
    </tr>`);
  });

  dataTable = $('#dataTable').DataTable({
    order: [[0, 'asc']],
    pageLength: 25,
    lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, 'All']],
    language: { search: 'Search:' },
  });
}

// ── Chart.js ──────────────────────────────────────────────────────────
function renderChart() {
  // Group by service_class (+ period suffix if > 1)
  const grouped = {};
  currentData.forEach(r => {
    const key = r.period > 1
      ? `${r.service_class} P${r.period}`
      : r.service_class;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ x: r.datetime_iso, y: r.appl_cp_total });
  });

  // Sort each series chronologically
  Object.values(grouped).forEach(arr => arr.sort((a, b) => a.x.localeCompare(b.x)));

  // Build datasets
  const keys = Object.keys(grouped).sort();
  const datasets = keys.map((key, i) => ({
    label: key,
    data: grouped[key],
    borderColor: colour(i),
    backgroundColor: colour(i) + '22',
    borderWidth: 2,
    pointRadius: 2.5,
    pointHoverRadius: 5,
    tension: 0.25,
    fill: false,
  }));

  if (cpuChart) cpuChart.destroy();

  const ctx = document.getElementById('cpuChart').getContext('2d');
  cpuChart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            title: ctx => {
              if (!ctx.length) return '';
              const d = new Date(ctx[0].parsed.x);
              return d.toLocaleString();
            },
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} %`,
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'hour', tooltipFormat: 'MMM dd, yyyy HH:mm' },
          title: { display: true, text: 'Time', font: { weight: 'bold' } },
          grid: { color: 'rgba(0,0,0,.05)' },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'APPL % CP Total', font: { weight: 'bold' } },
          grid: { color: 'rgba(0,0,0,.06)' },
        },
      },
    },
  });
}

// ── Events ────────────────────────────────────────────────────────────
function wireEvents() {
  $('#btnApply').on('click', () => {
    loadData(getFilters());
  });

  $('#btnReset').on('click', () => {
    $('#filterSource').val('');
    $('#filterWorkload').val('');
    $('#filterSvcClass').val('');
    if (metadata.date_range.min) $('#filterStart').val(metadata.date_range.min.substring(0, 16));
    if (metadata.date_range.max) $('#filterEnd').val(metadata.date_range.max.substring(0, 16));
    loadData();
  });

  $('#btnExport').on('click', () => {
    const params = new URLSearchParams();
    const f = getFilters();
    Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v); });
    window.location.href = '/api/export/csv?' + params;
  });
}

function getFilters() {
  return {
    file_source:    $('#filterSource').val(),
    workload:       $('#filterWorkload').val(),
    service_class:  $('#filterSvcClass').val(),
    start_date:     $('#filterStart').val() ? new Date($('#filterStart').val()).toISOString() : '',
    end_date:       $('#filterEnd').val()   ? new Date($('#filterEnd').val()).toISOString()   : '',
  };
}
