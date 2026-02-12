/**
 * RMF Workload Activity Analyzer - Frontend
 */

let metadata = {};
let currentData = [];
let dataTable = null;
let cpuChart = null;
let selectedFiles = [];

// Color palette
const PALETTE = [
  '#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#d946ef',
];

function colour(i) { return PALETTE[i % PALETTE.length]; }

// Initialize
$(document).ready(async () => {
  await checkExistingFiles();
  wireEvents();
  wireUploadEvents();
  $('#loadingOverlay').addClass('hidden');
});

// Check for existing files
async function checkExistingFiles() {
  try {
    const res = await fetch('/api/files');
    const data = await res.json();
    
    if (data.files && data.files.length > 0) {
      showDataSection();
      await loadMetadata();
      await loadData();
      renderExistingFiles(data.files);
    } else {
      showUploadSection();
    }
  } catch (e) {
    console.error('Error checking files:', e);
    showUploadSection();
  }
}

// Section visibility
function showUploadSection() {
  $('#uploadSection').show();
  $('#dataSection').hide();
  $('#loadingOverlay').addClass('hidden');
}

function showDataSection() {
  $('#uploadSection').hide();
  $('#dataSection').show();
}

// Upload Events
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

  // Click to select files
  dropZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') {
      fileInput.click();
    }
  });

  // File input change
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

  // Clear all button
  $('#btnClearAll').on('click', clearAllFiles);

  // Upload more button
  $('#btnUploadMore').on('click', () => {
    showUploadSection();
    selectedFiles = [];
    updateFileList();
  });
}

function handleFiles(files) {
  const validFiles = Array.from(files).filter(file => 
    file.name.endsWith('.txt') || file.name.endsWith('.rmf')
  );
  
  if (validFiles.length !== files.length) {
    showAlert('Only .txt and .rmf files are allowed', 'warning');
  }
  
  selectedFiles = [...selectedFiles, ...validFiles];
  updateFileList();
}

function updateFileList() {
  const container = $('#fileList');
  container.empty();

  if (selectedFiles.length === 0) {
    $('#fileListSection').hide();
    $('#uploadActions').hide();
    return;
  }

  selectedFiles.forEach((file, index) => {
    const size = (file.size / 1024).toFixed(1);
    container.append(`
      <div class="file-list-item">
        <div class="file-icon">
          <i class="bi bi-file-earmark-text"></i>
        </div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${size} KB</div>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="removeFile(${index})">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    `);
  });

  $('#fileListSection').show();
  $('#uploadActions').show();
}

window.removeFile = function(index) {
  selectedFiles.splice(index, 1);
  updateFileList();
};

window.clearAllFiles = async function() {
  if (!confirm('Are you sure you want to clear all uploaded files?')) return;
  
  showLoading('Clearing files...');
  
  try {
    const res = await fetch('/api/files/clear', { method: 'POST' });
    const data = await res.json();
    
    if (data.success) {
      currentData = [];
      showUploadSection();
      $('#existingFilesSection').hide();
      selectedFiles = [];
      updateFileList();
      showAlert('All files cleared', 'success');
    }
  } catch (e) {
    showAlert('Error clearing files: ' + e.message, 'danger');
  } finally {
    hideLoading();
  }
};

async function uploadFiles() {
  if (selectedFiles.length === 0) {
    showAlert('Please select files to upload', 'warning');
    return;
  }

  showLoading('Uploading and parsing files...');

  const formData = new FormData();
  selectedFiles.forEach(file => formData.append('files', file));
  formData.append('clear_existing', $('#clearExisting').is(':checked'));

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.success) {
      showAlert(`Successfully uploaded ${data.uploaded_files.length} file(s)`, 'success');
      selectedFiles = [];
      updateFileList();
      
      showDataSection();
      await loadMetadata();
      await loadData();
    } else {
      showAlert(data.error || 'Upload failed', 'danger');
    }
  } catch (e) {
    showAlert('Upload failed: ' + e.message, 'danger');
  } finally {
    hideLoading();
  }
}

function renderExistingFiles(files) {
  const container = $('#existingFiles');
  container.empty();
  
  files.forEach(file => {
    const size = (file.size / 1024).toFixed(1);
    container.append(`
      <div class="file-list-item">
        <div class="file-icon">
          <i class="bi bi-file-earmark-check"></i>
        </div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${size} KB</div>
        </div>
      </div>
    `);
  });
  
  $('#existingFilesSection').show();
}

// Metadata
async function loadMetadata() {
  const res = await fetch('/api/metadata');
  metadata = await res.json();

  fillSelect('#filterSource', metadata.file_sources);
  fillSelect('#filterWorkload', metadata.workloads);
  fillSelect('#filterSvcClass', metadata.service_classes);

  if (metadata.date_range.min) {
    $('#filterStart').val(metadata.date_range.min.substring(0, 16));
  }
  if (metadata.date_range.max) {
    $('#filterEnd').val(metadata.date_range.max.substring(0, 16));
  }

  $('#statRecords').text(metadata.total_records.toLocaleString());
  $('#statFiles').text(metadata.parse_stats.files_parsed);
  $('#statClasses').text(metadata.service_classes.length);
  $('#headerBadge').text(metadata.total_records.toLocaleString() + ' records');
}

function fillSelect(sel, items) {
  const currentVal = $(sel).val();
  $(sel).find('option:not(:first)').remove();
  items.forEach(v => $(sel).append(`<option value="${v}">${v}</option>`));
  if (currentVal && items.includes(currentVal)) $(sel).val(currentVal);
}

// Load data
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

// Render table
function renderTable() {
  if (dataTable) { dataTable.destroy(); $('#dataTable tbody').empty(); }

  const tbody = $('#dataTable tbody');
  currentData.forEach(r => {
    tbody.append(`
      <tr>
        <td>${r.timestamp}</td>
        <td><span class="badge bg-primary">${r.service_class}</span></td>
        <td>${r.workload}</td>
        <td>${r.period}</td>
        <td class="fw-bold">${r.appl_cp_total.toFixed(2)}%</td>
        <td><small class="text-muted">${r.file_source}</small></td>
      </tr>
    `);
  });

  dataTable = $('#dataTable').DataTable({
    order: [[0, 'asc']],
    pageLength: 25,
    lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, 'All']],
    language: { search: 'Search:', lengthMenu: 'Show _MENU_ entries' },
  });
}

// Render chart
function renderChart() {
  const grouped = {};
  currentData.forEach(r => {
    const key = r.period > 1 ? `${r.service_class} P${r.period}` : r.service_class;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ x: r.datetime_iso, y: r.appl_cp_total });
  });

  Object.values(grouped).forEach(arr => arr.sort((a, b) => a.x.localeCompare(b.x)));

  const keys = Object.keys(grouped).sort();
  const datasets = keys.map((key, i) => ({
    label: key,
    data: grouped[key],
    borderColor: colour(i),
    backgroundColor: colour(i) + '20',
    borderWidth: 2,
    pointRadius: 3,
    pointHoverRadius: 6,
    tension: 0.3,
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
          labels: { usePointStyle: true, boxWidth: 10, padding: 15, font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            title: ctx => {
              if (!ctx.length) return '';
              return new Date(ctx[0].parsed.x).toLocaleString();
            },
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`,
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'hour', tooltipFormat: 'MMM dd, yyyy HH:mm' },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'APPL % CP' },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
      },
    },
  });
}

// Events
function wireEvents() {
  $('#btnApply').on('click', () => loadData(getFilters()));
  $('#btnReset').on('click', () => {
    $('#filterSource, #filterWorkload, #filterSvcClass').val('');
    if (metadata.date_range.min) $('#filterStart').val(metadata.date_range.min.substring(0, 16));
    if (metadata.date_range.max) $('#filterEnd').val(metadata.date_range.max.substring(0, 16));
    loadData();
  });
  $('#btnExport').on('click', () => {
    const params = new URLSearchParams();
    Object.entries(getFilters()).forEach(([k, v]) => { if (v) params.set(k, v); });
    window.location.href = '/api/export/csv?' + params;
  });
}

function getFilters() {
  return {
    file_source: $('#filterSource').val(),
    workload: $('#filterWorkload').val(),
    service_class: $('#filterSvcClass').val(),
    start_date: $('#filterStart').val() ? new Date($('#filterStart').val()).toISOString() : '',
    end_date: $('#filterEnd').val() ? new Date($('#filterEnd').val()).toISOString() : '',
  };
}

// Utilities
function showLoading(text) {
  $('#loadingText').text(text || 'Loading...');
  $('#loadingOverlay').removeClass('hidden');
}

function hideLoading() {
  $('#loadingOverlay').addClass('hidden');
}

function showAlert(message, type) {
  const alertClass = type === 'success' ? 'alert-success' : 
                     type === 'warning' ? 'alert-warning' : 'alert-danger';
  const icon = type === 'success' ? 'check-circle' : 
               type === 'warning' ? 'exclamation-triangle' : 'exclamation-circle';
  
  $('#uploadStatus').html(`
    <div class="alert-modern ${alertClass}">
      <i class="bi bi-${icon}"></i>
      <span>${message}</span>
    </div>
  `);
  
  setTimeout(() => $('#uploadStatus').empty(), 5000);
}
