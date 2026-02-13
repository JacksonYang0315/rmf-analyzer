/**
 * RMF Workload Activity Analyzer - Frontend
 * Optimized: vanilla JS (no jQuery except DataTables), AbortController,
 * toast notifications, keyboard shortcuts, improved chart defaults, i18n
 */

// ============================================================
// i18n Translation System
// ============================================================
const I18N = {
  en: {
    // Navbar
    brand: 'z/OS RMF Workload Analyzer',
    // Upload section
    uploadTitle: 'Upload RMF Reports',
    uploadDesc: 'Parse and analyze z/OS RMF Workload Activity reports',
    backToDashboard: 'Back to Dashboard',
    dropFiles: 'Drop your RMF files here',
    orBrowse: 'or click to browse files (.txt, .rmf)',
    selectFiles: 'Select Files',
    selectedFiles: 'Selected Files',
    uploadParse: 'Upload & Parse',
    clear: 'Clear',
    replaceExisting: 'Replace existing files',
    uploadedFiles: 'Uploaded Files',
    clearAll: 'Clear All Files',
    uploadNew: 'Upload New Files',
    uploadMore: 'Upload More',
    // Stats
    totalRecords: 'Total Records',
    filtered: 'Filtered',
    filesParsed: 'Files Parsed',
    serviceClasses: 'Service Classes',
    // Filters
    filters: 'Filters',
    sourceFile: 'Source File',
    workload: 'Workload',
    serviceClass: 'Service Class',
    startDate: 'Start Date',
    endDate: 'End Date',
    allFiles: 'All Files',
    allWorkloads: 'All Workloads',
    allClasses: 'All Classes',
    applyFilters: 'Apply Filters',
    apply: 'Apply',
    reset: 'Reset',
    exportCsv: 'Export CSV',
    // Chart & Table
    chartTitle: 'APPL % CP Trend by Service Class',
    tableTitle: 'Detailed Records',
    scrollHint: 'Swipe to see more columns',
    colDateTime: 'Date-Time',
    colServiceClass: 'Service Class',
    colWorkload: 'Workload',
    colPeriod: 'Period',
    colApplCp: 'APPL % CP',
    colSource: 'Source',
    // Footer
    footer: 'RMF Workload Activity Analyzer &mdash; z/OS Performance Analytics',
    // DataTables
    dtSearch: '',
    dtSearchPlaceholder: 'Search records...',
    dtLengthMenu: 'Show _MENU_',
    dtInfo: '_START_-_END_ of _TOTAL_',
    dtInfoEmpty: '0 records',
    dtFirst: '\u00ab',
    dtLast: '\u00bb',
    dtNext: '\u203a',
    dtPrevious: '\u2039',
    // Toasts
    toastUploadSuccess: 'Successfully uploaded {0} file(s) in {1}s',
    toastClearConfirm: 'Are you sure you want to clear all uploaded files?',
    toastCleared: 'All files cleared',
    toastOnlyTxtRmf: 'Only .txt and .rmf files are allowed',
    toastSelectFiles: 'Please select files to upload',
    toastSizeLimit: 'Total file size exceeds 50MB limit',
    toastUploadFail: 'Upload failed',
    toastLoadFail: 'Failed to load data',
    toastMetaFail: 'Failed to load metadata',
    toastCheckFail: 'Failed to check existing files. Please refresh.',
    toastClearFail: 'Error clearing files',
    // Loading
    loadingData: 'Loading data...',
    loadingUpload: 'Uploading and parsing files...',
    loadingClear: 'Clearing files...',
    loadingDefault: 'Loading...',
    // Header badge
    headerRecords: '{0} records',
  },
  zh: {
    brand: 'z/OS RMF 工作負載分析器',
    uploadTitle: '上傳 RMF 報告',
    uploadDesc: '解析並分析 z/OS RMF 工作負載活動報告',
    backToDashboard: '返回儀表板',
    dropFiles: '將 RMF 檔案拖曳至此',
    orBrowse: '或點擊瀏覽檔案 (.txt, .rmf)',
    selectFiles: '選擇檔案',
    selectedFiles: '已選檔案',
    uploadParse: '上傳並解析',
    clear: '清除',
    replaceExisting: '取代現有檔案',
    uploadedFiles: '已上傳檔案',
    clearAll: '清除所有檔案',
    uploadNew: '上傳新檔案',
    uploadMore: '上傳更多',
    totalRecords: '總記錄數',
    filtered: '已篩選',
    filesParsed: '已解析檔案',
    serviceClasses: '服務類別',
    filters: '篩選條件',
    sourceFile: '來源檔案',
    workload: '工作負載',
    serviceClass: '服務類別',
    startDate: '開始日期',
    endDate: '結束日期',
    allFiles: '所有檔案',
    allWorkloads: '所有工作負載',
    allClasses: '所有類別',
    applyFilters: '套用篩選',
    apply: '套用',
    reset: '重設',
    exportCsv: '匯出 CSV',
    chartTitle: '各服務類別 APPL % CP 趨勢',
    tableTitle: '詳細記錄',
    scrollHint: '左右滑動查看更多欄位',
    colDateTime: '日期時間',
    colServiceClass: '服務類別',
    colWorkload: '工作負載',
    colPeriod: '期間',
    colApplCp: 'APPL % CP',
    colSource: '來源',
    footer: 'RMF 工作負載活動分析器 &mdash; z/OS 效能分析',
    dtSearch: '',
    dtSearchPlaceholder: '搜尋記錄...',
    dtLengthMenu: '顯示 _MENU_',
    dtInfo: '第 _START_ - _END_ 筆，共 _TOTAL_ 筆',
    dtInfoEmpty: '無記錄',
    dtFirst: '\u00ab',
    dtLast: '\u00bb',
    dtNext: '\u203a',
    dtPrevious: '\u2039',
    toastUploadSuccess: '成功上傳 {0} 個檔案，耗時 {1} 秒',
    toastClearConfirm: '確定要清除所有已上傳的檔案嗎？',
    toastCleared: '所有檔案已清除',
    toastOnlyTxtRmf: '僅允許 .txt 和 .rmf 檔案',
    toastSelectFiles: '請選擇要上傳的檔案',
    toastSizeLimit: '檔案總大小超過 50MB 限制',
    toastUploadFail: '上傳失敗',
    toastLoadFail: '載入資料失敗',
    toastMetaFail: '載入元資料失敗',
    toastCheckFail: '檢查現有檔案失敗，請重新整理頁面。',
    toastClearFail: '清除檔案時發生錯誤',
    loadingData: '載入資料中...',
    loadingUpload: '上傳並解析檔案中...',
    loadingClear: '清除檔案中...',
    loadingDefault: '載入中...',
    headerRecords: '{0} 筆記錄',
  }
};

let currentLang = 'en';

function detectLanguage() {
  const saved = localStorage.getItem('rmf-lang');
  if (saved && I18N[saved]) return saved;
  const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  if (browserLang.startsWith('zh')) return 'zh';
  return 'en';
}

function t(key, ...args) {
  let text = (I18N[currentLang] && I18N[currentLang][key]) || (I18N.en[key]) || key;
  args.forEach((arg, i) => {
    text = text.replace(`{${i}}`, arg);
  });
  return text;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    if (el.tagName === 'INPUT' && el.type !== 'checkbox') {
      el.placeholder = translated;
    } else {
      el.innerHTML = translated;
    }
  });
  document.documentElement.lang = currentLang === 'zh' ? 'zh-TW' : 'en';
  document.getElementById('langLabel').textContent = currentLang === 'en' ? 'EN' : '中';
  // Re-render table if data exists to update DataTables language
  if (currentData.length > 0) {
    renderTable();
  }
}

function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'zh' : 'en';
  localStorage.setItem('rmf-lang', currentLang);
  applyI18n();
}

// ============================================================
// Global state
// ============================================================
let metadata = {};
let currentData = [];
let dataTable = null;
let cpuChart = null;
let selectedFiles = [];
let hasExistingData = false;

// Debounce timer
let filterDebounceTimer = null;
const DEBOUNCE_DELAY = 300;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// AbortController for cancelling in-flight GET requests
let currentFetchController = null;

// Chart optimization thresholds
const CHART_MAX_POINTS = 1000;

// Color palette - CRT terminal phosphor colors
const PALETTE = [
  '#33ff66', '#ffb800', '#00e5ff', '#ff4444', '#a78bfa',
  '#22d3ee', '#f97316', '#84cc16', '#f472b6', '#60a5fa',
  '#34d399', '#fbbf24', '#c084fc', '#fb923c', '#38bdf8',
];

function colour(i) { return PALETTE[i % PALETTE.length]; }

// Utility: Debounce function - each instance has its own timer
function debounce(func, wait) {
  let timeout = null;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      timeout = null;
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Utility: Format large numbers with locale separators
function formatNumber(n) {
  return new Intl.NumberFormat().format(n);
}

// Utility: Fetch with retry logic and AbortController (GET only)
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  const method = (options.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  // For GET requests, cancel any previous in-flight request
  if (!isMutating) {
    if (currentFetchController) currentFetchController.abort();
    currentFetchController = new AbortController();
    options.signal = currentFetchController.signal;
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  } catch (error) {
    // Don't retry aborted requests
    if (error.name === 'AbortError') throw error;
    // Don't retry mutating requests to avoid duplicates
    if (retries > 0 && !isMutating) {
      console.warn(`Fetch failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (MAX_RETRIES - retries + 1)));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Toast notification system
function getToastIcon(type) {
  switch (type) {
    case 'success': return 'check-circle-fill';
    case 'warning': return 'exclamation-triangle-fill';
    case 'error': return 'exclamation-circle-fill';
    default: return 'info-circle-fill';
  }
}

function showToast(message, type = 'info', duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="bi bi-${getToastIcon(type)}"></i><span>${escapeHtml(message)}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// System clock for terminal header
function startSystemClock() {
  const el = document.getElementById('systemClock');
  if (!el) return;
  function tick() {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-US', { hour12: false }) + '.' +
      String(now.getMilliseconds()).padStart(3, '0').slice(0, 2);
  }
  tick();
  setInterval(tick, 100);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  currentLang = detectLanguage();
  applyI18n();
  startSystemClock();
  await checkExistingFiles();
  wireEvents();
  wireUploadEvents();
  wireKeyboardShortcuts();
  wireMobileCardsSearch();
  document.getElementById('loadingOverlay').classList.add('hidden');
});

// Mobile cards search input
function wireMobileCardsSearch() {
  const searchInput = document.getElementById('mobileCardsSearch');
  if (!searchInput) return;
  const debouncedSearch = debounce((term) => {
    mobileCardsSearchTerm = term;
    mobileCardsPage = 1;
    renderMobileCards();
  }, DEBOUNCE_DELAY);
  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value.trim());
  });
}

// Keyboard shortcuts
function wireKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Escape to close loading overlay if stuck
    if (e.key === 'Escape') {
      const overlay = document.getElementById('loadingOverlay');
      if (!overlay.classList.contains('hidden')) {
        overlay.classList.add('hidden');
      }
    }
    // Ctrl+E to export CSV
    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      const dataSection = document.getElementById('dataSection');
      if (dataSection.style.display !== 'none') {
        exportCSV();
      }
    }
  });
}

// Check for existing files with retry
async function checkExistingFiles() {
  try {
    const res = await fetchWithRetry('/api/files');
    const data = await res.json();

    if (data.files && data.files.length > 0) {
      hasExistingData = true;
      showDataSection();
      await loadMetadata();
      await loadData();
      renderExistingFiles(data.files);
    } else {
      hasExistingData = false;
      showUploadSection();
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
    console.error('Error checking files:', e);
    showToast(t('toastCheckFail'), 'error');
    showUploadSection();
  }
}

// Section visibility
function showUploadSection() {
  document.getElementById('uploadSection').style.display = '';
  document.getElementById('dataSection').style.display = 'none';
  document.getElementById('loadingOverlay').classList.add('hidden');
  // Show back button if data exists
  const backBtn = document.getElementById('backToDashboard');
  if (backBtn) {
    backBtn.style.display = hasExistingData ? '' : 'none';
  }
}

function showDataSection() {
  document.getElementById('uploadSection').style.display = 'none';
  document.getElementById('dataSection').style.display = '';
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

  // Stop clicks on the file-input-wrapper (a <label>) from bubbling to dropZone.
  // The native <input type="file"> inside the label handles taps directly.
  const fileInputWrapper = dropZone.querySelector('.file-input-wrapper');
  if (fileInputWrapper) {
    fileInputWrapper.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Click on drop zone area (not the file input wrapper) to open file picker
  dropZone.addEventListener('click', (e) => {
    // The file-input-wrapper click is stopped above; this handles the rest
    if (e.target === dropZone || e.target.closest('.upload-zone-icon') || e.target.tagName === 'H3' || e.target.tagName === 'P') {
      fileInput.click();
    }
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  // Upload button
  document.getElementById('btnUpload').addEventListener('click', uploadFiles);

  // Clear files button
  document.getElementById('btnClearFiles').addEventListener('click', () => {
    selectedFiles = [];
    updateFileList();
  });

  // Clear all button
  document.getElementById('btnClearAll').addEventListener('click', clearAllFiles);

  // Upload more button
  document.getElementById('btnUploadMore').addEventListener('click', () => {
    showUploadSection();
    selectedFiles = [];
    updateFileList();
  });

  // Back to Dashboard button
  document.getElementById('btnBackToDashboard').addEventListener('click', () => {
    if (hasExistingData) {
      showDataSection();
    }
  });
}

function handleFiles(files) {
  const validFiles = Array.from(files).filter(file =>
    file.name.endsWith('.txt') || file.name.endsWith('.rmf')
  );

  if (validFiles.length !== files.length) {
    showToast(t('toastOnlyTxtRmf'), 'warning');
  }

  selectedFiles = [...selectedFiles, ...validFiles];
  updateFileList();
}

function updateFileList() {
  const container = document.getElementById('fileList');
  container.innerHTML = '';

  if (selectedFiles.length === 0) {
    document.getElementById('fileListSection').style.display = 'none';
    document.getElementById('uploadActions').style.display = 'none';
    return;
  }

  const fragment = document.createDocumentFragment();

  selectedFiles.forEach((file, index) => {
    const size = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / 1024 / 1024).toFixed(2)} MB`;

    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
      <div class="file-item-icon">
        <i class="bi bi-file-earmark-text"></i>
      </div>
      <div class="file-item-info">
        <div class="file-item-name">${escapeHtml(file.name)}</div>
        <div class="file-item-size">${size}</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="removeFile(${index})" title="Remove">
        <i class="bi bi-x-lg"></i>
      </button>
    `;
    fragment.appendChild(div);
  });

  container.appendChild(fragment);

  document.getElementById('fileListSection').style.display = '';
  document.getElementById('uploadActions').style.display = '';
}

window.removeFile = function(index) {
  selectedFiles.splice(index, 1);
  updateFileList();
};

window.clearAllFiles = async function() {
  if (!confirm(t('toastClearConfirm'))) return;

  showLoading(t('loadingClear'));

  try {
    const res = await fetchWithRetry('/api/files/clear', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      currentData = [];
      hasExistingData = false;
      showUploadSection();
      document.getElementById('existingFilesSection').style.display = 'none';
      selectedFiles = [];
      updateFileList();
      showToast(t('toastCleared'), 'success');
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
    showToast(t('toastClearFail') + ': ' + e.message, 'error');
  } finally {
    hideLoading();
  }
};

async function uploadFiles() {
  if (selectedFiles.length === 0) {
    showToast(t('toastSelectFiles'), 'warning');
    return;
  }

  // Check total size (50MB limit)
  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > 50 * 1024 * 1024) {
    showToast(t('toastSizeLimit'), 'error');
    return;
  }

  showLoading(t('loadingUpload'));

  const formData = new FormData();
  selectedFiles.forEach(file => formData.append('files', file));
  formData.append('clear_existing', document.getElementById('clearExisting').checked);

  try {
    const res = await fetchWithRetry('/api/upload', {
      method: 'POST',
      body: formData
    }, MAX_RETRIES);

    const data = await res.json();

    if (data.success) {
      showToast(t('toastUploadSuccess', data.uploaded_files.length, data.parse_time_seconds || 0), 'success');
      selectedFiles = [];
      updateFileList();

      hasExistingData = true;
      showDataSection();
      await loadMetadata();
      await loadData();
    } else {
      showToast(data.error || t('toastUploadFail'), 'error');
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
    showToast(t('toastUploadFail') + ': ' + e.message, 'error');
  } finally {
    hideLoading();
  }
}

function renderExistingFiles(files) {
  const container = document.getElementById('existingFiles');
  container.innerHTML = '';

  const fragment = document.createDocumentFragment();

  files.forEach(file => {
    const size = file.size_human || (file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / 1024 / 1024).toFixed(2)} MB`);

    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
      <div class="file-item-icon">
        <i class="bi bi-file-earmark-check"></i>
      </div>
      <div class="file-item-info">
        <div class="file-item-name">${escapeHtml(file.name)}</div>
        <div class="file-item-size">${size}</div>
      </div>
    `;
    fragment.appendChild(div);
  });

  container.appendChild(fragment);

  document.getElementById('existingFilesSection').style.display = '';
}

// Metadata with retry
async function loadMetadata() {
  try {
    const res = await fetchWithRetry('/api/metadata');
    metadata = await res.json();

    fillSelect('filterSource', metadata.file_sources);
    fillSelect('filterWorkload', metadata.workloads);
    fillSelect('filterSvcClass', metadata.service_classes);

    if (metadata.date_range.min) {
      document.getElementById('filterStart').value = metadata.date_range.min.substring(0, 16);
    }
    if (metadata.date_range.max) {
      document.getElementById('filterEnd').value = metadata.date_range.max.substring(0, 16);
    }

    document.getElementById('statRecords').textContent = formatNumber(metadata.total_records);
    document.getElementById('statFiles').textContent = metadata.parse_stats.files_parsed;
    document.getElementById('statClasses').textContent = metadata.service_classes.length;
    document.getElementById('headerBadge').textContent = t('headerRecords', formatNumber(metadata.total_records));
  } catch (e) {
    if (e.name === 'AbortError') return;
    console.error('Error loading metadata:', e);
    showToast(t('toastMetaFail'), 'error');
  }
}

function fillSelect(id, items) {
  const el = document.getElementById(id);
  const currentVal = el.value;
  // Remove all options except the first (placeholder)
  while (el.options.length > 1) {
    el.remove(1);
  }
  items.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    el.appendChild(opt);
  });
  if (currentVal && items.includes(currentVal)) el.value = currentVal;
}

// Load data with optional pagination
async function loadData(filters = null, limit = null, offset = null) {
  showLoading(t('loadingData'));

  try {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    }
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);

    const res = await fetchWithRetry('/api/data?' + params);
    const json = await res.json();
    currentData = json.data;

    document.getElementById('statFiltered').textContent = formatNumber(json.total_filtered || json.count);
    renderTable();
    renderChart();
  } catch (e) {
    if (e.name === 'AbortError') return;
    console.error('Error loading data:', e);
    showToast(t('toastLoadFail') + ': ' + e.message, 'error');
  } finally {
    hideLoading();
  }
}

// Render table - keep jQuery only for DataTables
function renderTable() {
  if (dataTable) {
    dataTable.destroy();
    document.querySelector('#dataTable tbody').innerHTML = '';
  }

  const tbody = document.querySelector('#dataTable tbody');
  const fragment = document.createDocumentFragment();

  currentData.forEach(r => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(r.timestamp)}</td>
      <td><span class="badge badge-primary">${escapeHtml(r.service_class)}</span></td>
      <td>${escapeHtml(r.workload)}</td>
      <td>${r.period}</td>
      <td class="fw-bold">${r.appl_cp_total.toFixed(2)}%</td>
      <td><small class="text-muted">${escapeHtml(r.file_source)}</small></td>
    `;
    fragment.appendChild(row);
  });

  tbody.appendChild(fragment);

  // DataTables requires jQuery - keep this as jQuery call
  dataTable = $('#dataTable').DataTable({
    order: [[0, 'asc']],
    pageLength: 25,
    lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, 'All']],
    language: {
      search: t('dtSearch'),
      searchPlaceholder: t('dtSearchPlaceholder'),
      lengthMenu: t('dtLengthMenu'),
      info: t('dtInfo'),
      infoEmpty: t('dtInfoEmpty'),
      paginate: {
        first: t('dtFirst'),
        last: t('dtLast'),
        next: t('dtNext'),
        previous: t('dtPrevious')
      }
    },
    dom: '<"datatable-controls"lf>rt<"datatable-footer"ip>',
    drawCallback: function() {
      document.querySelectorAll('.badge-primary').forEach(el => {
        Object.assign(el.style, {
          background: '#e0f2fe',
          color: '#0284c7',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '500'
        });
      });
    }
  });

  // Render mobile cards if on mobile
  if (window.innerWidth <= 768) {
    mobileCardsPage = 1;
    mobileCardsSearchTerm = '';
    const searchInput = document.getElementById('mobileCardsSearch');
    if (searchInput) searchInput.value = '';
    renderMobileCards();
  }
}

// LTTB (Largest Triangle Three Buckets) downsampling algorithm
function lttbDownsample(data, threshold) {
  if (data.length <= threshold) return data;

  const sampled = [];
  let sampledIndex = 0;

  // Bucket size
  const bucketSize = (data.length - 2) / (threshold - 2);

  // Add first point
  sampled[sampledIndex++] = data[0];

  for (let i = 0; i < threshold - 2; i++) {
    const bucketStart = Math.floor((i + 0) * bucketSize) + 1;
    const bucketEnd = Math.floor((i + 1) * bucketSize) + 1;
    const bucket = data.slice(bucketStart, bucketEnd);

    const pointA = data[Math.floor(i * bucketSize)];
    const pointC = data[Math.floor((i + 1) * bucketSize)];

    let maxArea = -1;
    let maxIndex = bucketStart;

    for (let j = 0; j < bucket.length; j++) {
      const pointB = bucket[j];
      const area = Math.abs(
        (pointA.x - pointC.x) * (pointB.y - pointA.y) -
        (pointA.x - pointB.x) * (pointC.y - pointA.y)
      ) / 2;

      if (area > maxArea) {
        maxArea = area;
        maxIndex = bucketStart + j;
      }
    }

    sampled[sampledIndex++] = data[maxIndex];
  }

  // Add last point
  sampled[sampledIndex++] = data[data.length - 1];

  return sampled.slice(0, sampledIndex);
}

// Render chart with optimization
function renderChart() {
  const grouped = {};
  currentData.forEach(r => {
    const key = r.period > 1 ? `${r.service_class} P${r.period}` : r.service_class;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ x: r.datetime_iso, y: r.appl_cp_total });
  });

  // Sort each group
  Object.values(grouped).forEach(arr => arr.sort((a, b) => a.x.localeCompare(b.x)));

  const keys = Object.keys(grouped).sort();

  // Apply downsampling for large datasets
  const datasets = keys.map((key, i) => {
    let data = grouped[key];

    // Downsample if too many points
    if (data.length > CHART_MAX_POINTS) {
      console.log(`Downsampling ${key} from ${data.length} to ${CHART_MAX_POINTS} points`);
      data = lttbDownsample(data, CHART_MAX_POINTS);
    }

    return {
      label: key,
      data: data,
      borderColor: colour(i),
      backgroundColor: colour(i) + '20',
      borderWidth: 2,
      pointRadius: data.length > 100 ? 0 : 3,
      pointHoverRadius: 6,
      tension: 0.3,
      fill: false,
    };
  });

  if (cpuChart) cpuChart.destroy();

  const isMobile = window.innerWidth <= 768;
  const ctx = document.getElementById('cpuChart').getContext('2d');
  cpuChart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      interaction: {
        mode: 'nearest',
        intersect: true,
        axis: 'x'
      },
      plugins: {
        legend: {
          display: !isMobile,
          position: 'top',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            padding: 10,
            font: { size: 11, family: 'Inter' }
          },
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
        decimation: {
          enabled: true,
          algorithm: 'lttb',
          samples: CHART_MAX_POINTS
        },
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour',
            tooltipFormat: 'MMM dd, yyyy HH:mm',
            displayFormats: {
              hour: 'MMM d HH:mm',
              day: 'MMM d'
            }
          },
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            font: { family: 'Inter', size: isMobile ? 9 : 10 },
            maxRotation: 45,
            autoSkip: true,
            maxTicksLimit: isMobile ? 4 : 6
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: !isMobile,
            text: 'APPL % CP',
            font: { family: 'Inter', weight: '600', size: 11 }
          },
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            font: { family: 'Inter', size: isMobile ? 9 : 10 },
            callback: function(value) {
              return value + '%';
            }
          }
        },
      },
    },
  });

  // Build custom scrollable legend for mobile
  if (isMobile) {
    renderMobileLegend(keys, datasets);
  }
}

// Mobile legend: vertical stack below chart with collapse/expand
function renderMobileLegend(keys, datasets) {
  let legendEl = document.getElementById('mobileLegend');
  if (!legendEl) {
    legendEl = document.createElement('div');
    legendEl.id = 'mobileLegend';
    const chartContainer = document.querySelector('.chart-container');
    chartContainer.appendChild(legendEl);
  }
  legendEl.className = 'mobile-legend vertical' + (datasets.length > 5 ? ' collapsed' : '');
  legendEl.innerHTML = '';

  datasets.forEach((ds, i) => {
    const item = document.createElement('button');
    item.className = 'legend-item';
    item.dataset.index = i;
    item.innerHTML = `<span class="legend-dot" style="background:${ds.borderColor}"></span><span class="legend-label">${escapeHtml(ds.label)}</span>`;
    item.addEventListener('click', () => {
      const meta = cpuChart.getDatasetMeta(i);
      meta.hidden = !meta.hidden;
      item.classList.toggle('hidden', meta.hidden);
      cpuChart.update();
    });
    legendEl.appendChild(item);
  });

  // Add expand/collapse toggle if more than 5 items
  if (datasets.length > 5) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'legend-toggle-btn';
    toggleBtn.id = 'legendToggleBtn';
    toggleBtn.innerHTML = `<i class="bi bi-chevron-down"></i> Show all ${datasets.length} items`;
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = legendEl.classList.toggle('collapsed');
      toggleBtn.innerHTML = isCollapsed
        ? `<i class="bi bi-chevron-down"></i> Show all ${datasets.length} items`
        : `<i class="bi bi-chevron-up"></i> Show top 5`;
    });
    legendEl.appendChild(toggleBtn);
  }
}

// ============================================================
// Mobile Card-based Table
// ============================================================
const CARDS_PER_PAGE = 20;
let mobileCardsPage = 1;
let mobileCardsFilteredData = [];
let mobileCardsSearchTerm = '';

function renderMobileCards() {
  const container = document.getElementById('mobileCardsContent');
  const paginationEl = document.getElementById('mobileCardsPagination');
  if (!container) return;

  // Filter data based on search
  if (mobileCardsSearchTerm) {
    const term = mobileCardsSearchTerm.toLowerCase();
    mobileCardsFilteredData = currentData.filter(r =>
      r.timestamp.toLowerCase().includes(term) ||
      r.service_class.toLowerCase().includes(term) ||
      r.workload.toLowerCase().includes(term) ||
      r.file_source.toLowerCase().includes(term) ||
      String(r.appl_cp_total).includes(term)
    );
  } else {
    mobileCardsFilteredData = currentData;
  }

  const totalPages = Math.max(1, Math.ceil(mobileCardsFilteredData.length / CARDS_PER_PAGE));
  if (mobileCardsPage > totalPages) mobileCardsPage = totalPages;

  const start = (mobileCardsPage - 1) * CARDS_PER_PAGE;
  const end = Math.min(start + CARDS_PER_PAGE, mobileCardsFilteredData.length);
  const pageData = mobileCardsFilteredData.slice(start, end);

  container.innerHTML = '';
  const fragment = document.createDocumentFragment();

  pageData.forEach(r => {
    const card = document.createElement('div');
    card.className = 'data-card';
    card.innerHTML = `
      <div class="data-card-row">
        <span class="data-card-label">${t('colDateTime')}</span>
        <span class="data-card-value">${escapeHtml(r.timestamp)}</span>
      </div>
      <div class="data-card-row">
        <span class="data-card-label">${t('colServiceClass')}</span>
        <span class="data-card-value">${escapeHtml(r.service_class)}</span>
      </div>
      <div class="data-card-row">
        <span class="data-card-label">${t('colWorkload')}</span>
        <span class="data-card-value">${escapeHtml(r.workload)}</span>
      </div>
      <div class="data-card-row">
        <span class="data-card-label">${t('colPeriod')}</span>
        <span class="data-card-value">${r.period}</span>
      </div>
      <div class="data-card-row">
        <span class="data-card-label">${t('colApplCp')}</span>
        <span class="data-card-value highlight">${r.appl_cp_total.toFixed(2)}%</span>
      </div>
      <div class="data-card-row">
        <span class="data-card-label">${t('colSource')}</span>
        <span class="data-card-value">${escapeHtml(r.file_source)}</span>
      </div>
    `;
    fragment.appendChild(card);
  });

  if (pageData.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'text-center text-muted';
    empty.style.padding = 'var(--space-lg)';
    empty.textContent = 'No records found';
    fragment.appendChild(empty);
  }

  container.appendChild(fragment);

  // Render pagination
  paginationEl.innerHTML = '';
  if (totalPages > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-secondary btn-sm';
    prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
    prevBtn.disabled = mobileCardsPage <= 1;
    prevBtn.addEventListener('click', () => {
      if (mobileCardsPage > 1) { mobileCardsPage--; renderMobileCards(); }
    });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-secondary btn-sm';
    nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
    nextBtn.disabled = mobileCardsPage >= totalPages;
    nextBtn.addEventListener('click', () => {
      if (mobileCardsPage < totalPages) { mobileCardsPage++; renderMobileCards(); }
    });

    const info = document.createElement('span');
    info.className = 'page-info';
    info.textContent = `${start + 1}-${end} / ${mobileCardsFilteredData.length}`;

    paginationEl.appendChild(prevBtn);
    paginationEl.appendChild(info);
    paginationEl.appendChild(nextBtn);
  }
}

// Debounced filter handler
const debouncedLoadData = debounce(() => {
  loadData(getFilters());
}, DEBOUNCE_DELAY);

// Export CSV helper
function exportCSV() {
  const params = new URLSearchParams();
  Object.entries(getFilters()).forEach(([k, v]) => { if (v) params.set(k, v); });
  window.location.href = '/api/export/csv?' + params;
}

// Events
function wireEvents() {
  // Language toggle
  document.getElementById('btnLangToggle').addEventListener('click', toggleLanguage);

  // Apply filters
  document.getElementById('btnApply').addEventListener('click', () => loadData(getFilters()));

  // Debounced filter inputs
  ['filterSource', 'filterWorkload', 'filterSvcClass'].forEach(id => {
    document.getElementById(id).addEventListener('change', debouncedLoadData);
  });
  ['filterStart', 'filterEnd'].forEach(id => {
    document.getElementById(id).addEventListener('change', debouncedLoadData);
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    document.getElementById('filterSource').value = '';
    document.getElementById('filterWorkload').value = '';
    document.getElementById('filterSvcClass').value = '';
    if (metadata.date_range && metadata.date_range.min) {
      document.getElementById('filterStart').value = metadata.date_range.min.substring(0, 16);
    }
    if (metadata.date_range && metadata.date_range.max) {
      document.getElementById('filterEnd').value = metadata.date_range.max.substring(0, 16);
    }
    loadData();
  });

  document.getElementById('btnExport').addEventListener('click', exportCSV);

  // Mobile upload more button
  document.getElementById('btnMobileUploadMore').addEventListener('click', () => {
    showUploadSection();
    selectedFiles = [];
    updateFileList();
  });

  // Mobile filter drawer functionality
  const filterDrawer = document.getElementById('filterDrawer');
  const filterDrawerOverlay = document.getElementById('filterDrawerOverlay');
  const btnFilterToggle = document.getElementById('btnFilterToggle');
  const btnFilterDrawerClose = document.getElementById('btnFilterDrawerClose');
  const btnMobileApply = document.getElementById('btnMobileApply');
  const btnMobileReset = document.getElementById('btnMobileReset');

  function openFilterDrawer() {
    filterDrawer.classList.add('visible');
    filterDrawerOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeFilterDrawer() {
    filterDrawer.classList.remove('visible');
    filterDrawerOverlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  if (btnFilterToggle) {
    btnFilterToggle.addEventListener('click', openFilterDrawer);
  }

  if (btnFilterDrawerClose) {
    btnFilterDrawerClose.addEventListener('click', closeFilterDrawer);
  }

  if (filterDrawerOverlay) {
    filterDrawerOverlay.addEventListener('click', closeFilterDrawer);
  }

  if (btnMobileApply) {
    btnMobileApply.addEventListener('click', () => {
      loadData(getMobileFilters());
      closeFilterDrawer();
    });
  }

  if (btnMobileReset) {
    btnMobileReset.addEventListener('click', () => {
      document.getElementById('mobileFilterSource').value = '';
      document.getElementById('mobileFilterWorkload').value = '';
      document.getElementById('mobileFilterSvcClass').value = '';
      if (metadata.date_range && metadata.date_range.min) {
        document.getElementById('mobileFilterStart').value = metadata.date_range.min.substring(0, 16);
      }
      if (metadata.date_range && metadata.date_range.max) {
        document.getElementById('mobileFilterEnd').value = metadata.date_range.max.substring(0, 16);
      }
      loadData();
      closeFilterDrawer();
    });
  }

  function getMobileFilters() {
    return {
      file_source: document.getElementById('mobileFilterSource').value,
      workload: document.getElementById('mobileFilterWorkload').value,
      service_class: document.getElementById('mobileFilterSvcClass').value,
      start_date: document.getElementById('mobileFilterStart').value ? new Date(document.getElementById('mobileFilterStart').value).toISOString() : '',
      end_date: document.getElementById('mobileFilterEnd').value ? new Date(document.getElementById('mobileFilterEnd').value).toISOString() : '',
    };
  }
}

function getFilters() {
  return {
    file_source: document.getElementById('filterSource').value,
    workload: document.getElementById('filterWorkload').value,
    service_class: document.getElementById('filterSvcClass').value,
    start_date: document.getElementById('filterStart').value ? new Date(document.getElementById('filterStart').value).toISOString() : '',
    end_date: document.getElementById('filterEnd').value ? new Date(document.getElementById('filterEnd').value).toISOString() : '',
  };
}

// Utilities
function showLoading(text) {
  document.getElementById('loadingText').textContent = text || t('loadingDefault');
  document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}
