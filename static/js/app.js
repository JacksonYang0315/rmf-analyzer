/* -----------------------------------------------------------------------
   z/OS RMF Workload Activity Analyzer - Frontend
   ----------------------------------------------------------------------- */

let metadata = {};
let currentData = [];
let dataTable = null;
let cpuChart = null;
let selectedFiles = [];

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
  await checkExistingFiles();
  wireEvents();
  wireUploadEvents();
  $('#loadingOverlay').addClass('hidden');
});

// ── Check for existing files ──────────────────────────────────────────
async function checkExistingFiles() {
  try {
    const res = await fetch('/api/files');
    const data = await res.json();
    
    if (data.files && data.files.length > 0) {
      // Has existing files, load data
      showDataSection();
      await loadMetadata();
      await loadData();
      renderExistingFiles(data.files);
    } else {
      // No files, show upload section
      showUploadSection();
    }
  } catch (e) {
    console.error('Error checking files:', e);
    showUploadSection();
  }
}

// ── Section visibility ────────────────────────────────────────────────
function showUploadSection() {
  $('#uploadSection').show();
  $('#dataSection').hide();
  $('#loadingOverlay').addClass('hidden');
}

function showDataSection() {
  $('#uploadSection').hide();
  $('#dataSection').show();
}

// ── Upload Events ─────────────────────────────────────────────────────
function wireUploadEvents() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  // Drag & Drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  // File input
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  // Upload button
  $('#btnUpload').on('click', uploadFiles);
  
  // Clear files button
  $('#btnClearFiles').on('click', () => {
    selectedFiles = [];
    updateFileList();
  });

  // Clear all existing files
  $('#btnClearAll').on('click', clearAllFiles);

  // Upload more button (from data section)
  $('#btnUploadMore').on('click', () => {
    showUploadSection();
    selectedFiles = [];
    updateFileList();
  });
}

function handleFiles(files) {
  selectedFiles = [...selectedFiles, ...Array.from(files)];
  updateFileList();
}

function updateFileList() {
  const container = $('#fileListContent');
  container.empty();

  if (selectedFiles.length === 0) {
    $('#fileList').hide();
    $('#uploadActions').hide();
    return;
  }

  selectedFiles.forEach((file, index) => {
    container.append(`
      <div class="file-item">
        <span>
          <i class="bi bi-file-earmark-text me-2 text-primary"></i>
          ${file.name} <small class="text-muted">(${(file.size / 1024).toFixed(1)} KB)</small>
        </span>
        <button class="btn btn-sm btn-outline-danger" onclick="removeFile(${index})" title="Remove">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `);
  });

  $('#fileList').show();
  $('#uploadActions').css('display', 'flex');
}

// Make removeFile globally accessible
window.removeFile = function(index) {
  selectedFiles.splice(index, 1);
  updateFileList();
};

// Make clearAllFiles globally accessible
window.clearAllFiles = async function() {
  if (!confirm('Are you sure you want to clear all uploaded files?')) return;
  
  $('#loadingOverlay').removeClass('hidden');
  $('#loadingText').text('Clearing files...');
  
  try {
    const res = await fetch('/api/files/clear', { method: 'POST' });
    const data = await res.json();
    
    if (data.success) {
      currentData = [];
      showUploadSection();
      $('#existingFiles').hide();
      selectedFiles = [];
      updateFileList();
    }
  } catch (e) {
    console.error('Error clearing files:', e);
    alert('Error clearing files: ' + e.message);
  } finally {
    $('#loadingOverlay').addClass('hidden');
  }
};

async function uploadFiles() {
  if (selectedFiles.length === 0) {
    alert('Please select files to upload');
    return;
  }

  $('#loadingOverlay').removeClass('hidden');
  $('#loadingText').text('Uploading and parsing...');

  const formData = new FormData();
  selectedFiles.forEach(file => {
    formData.append('files', file);
  });
  formData.append('clear_existing', $('#clearExisting').is(':checked'));

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      $('#uploadStatus').html(`
        <div class="alert alert-success">
          <i class="bi bi-check-circle me-2"></i>
          Uploaded ${data.uploaded_files.length} file(s), parsed ${data.total_records} records
        </div>
      `);
      
      selectedFiles = [];
      updateFileList();
      
      // Switch to data view
      showDataSection();
      await loadMetadata();
      await loadData();
    } else {
      $('#uploadStatus').html(`
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          ${data.error || 'Upload failed'}
        </div>
      `);
    }
  } catch (e) {
    console.error('Upload error:', e);
    $('#uploadStatus').html(`
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Upload failed: ${e.message}
      </div>
    `);
  } finally {
    $('#loadingOverlay').addClass('hidden');
  }
}

function renderExistingFiles(files) {
  const container = $('#existingFilesList');
  container.empty();
  
  files.forEach(file => {
    const size = (file.size / 1024).toFixed(1);
    container.append(`
      <div class="file-item">
        <span>
          <i class="bi bi-file-earmark-check me-2 text-success"></i>
          ${file.name} <small class="text-muted">(${size} KB)</small>
        </span>
      </div>
    `);
  });
  
  $('#existingFiles').show();
}

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
  // Save current selection
  const currentVal = $(sel).val();
  
  $(sel).find('option:not(:first)').remove();
  items.forEach(v => $(sel).append(`<option value="${v}">${v}</option>`));
  
  // Restore selection if still valid
  if (currentVal && items.includes(currentVal)) {
    $(sel).val(currentVal);
  }
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
