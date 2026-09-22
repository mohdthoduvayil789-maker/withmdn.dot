/**
 * MUHAMMED PORTFOLIO (@withmdn.dot) — ADMIN DASHBOARD ENGINE
 * Artworks CRUD, Site Settings, LocalStorage & GitHub 1-Click Sync
 */

const STORAGE_KEY_WORKS = 'MDN_CUSTOM_PORTFOLIO_DATA';
const STORAGE_KEY_SETTINGS = 'MDN_CUSTOM_SITE_SETTINGS';
const STORAGE_KEY_PIN = 'MDN_ADMIN_PIN';
const STORAGE_KEY_AUTH = 'MDN_ADMIN_AUTH_SESSION';
const STORAGE_KEY_GH_TOKEN = 'MDN_GITHUB_TOKEN';

const DEFAULT_PIN = '7890';
const GITHUB_REPO_OWNER = 'mohdthoduvayil789-maker';
const GITHUB_REPO_NAME = 'withmdn.dot';
const GITHUB_BRANCH = 'main';

let adminWorks = [];
let filteredAdminWorks = [];
let currentFilterCategory = 'all';
let currentSearchTerm = '';
let currentEditId = null;

// Initialize Admin App on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});

/* ==========================================================================
   1. Authentication & PIN Security Gate
   ========================================================================== */
function initAuth() {
  const isAuth = sessionStorage.getItem(STORAGE_KEY_AUTH) === 'true';
  const authGate = document.getElementById('authGate');
  const adminApp = document.getElementById('adminApp');

  if (isAuth) {
    if (authGate) authGate.classList.add('hidden');
    if (adminApp) adminApp.classList.remove('hidden');
    loadAdminData();
  } else {
    if (authGate) authGate.classList.remove('hidden');
    if (adminApp) adminApp.classList.add('hidden');
  }
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const inputPin = document.getElementById('pinInput').value.trim();
  const savedPin = localStorage.getItem(STORAGE_KEY_PIN) || DEFAULT_PIN;
  const errorEl = document.getElementById('authError');

  if (inputPin === savedPin) {
    sessionStorage.setItem(STORAGE_KEY_AUTH, 'true');
    if (errorEl) errorEl.classList.add('hidden');
    initAuth();
    showToast('Dashboard unlocked successfully', '🔓');
  } else {
    if (errorEl) errorEl.classList.remove('hidden');
    document.getElementById('pinInput').value = '';
    document.getElementById('pinInput').focus();
  }
}

function handleLogout() {
  sessionStorage.removeItem(STORAGE_KEY_AUTH);
  window.location.reload();
}

/* ==========================================================================
   2. Data Loading & Initialization
   ========================================================================== */
function loadAdminData() {
  // Load custom works from localStorage or fallback to window.PORTFOLIO_DATA
  const savedData = localStorage.getItem(STORAGE_KEY_WORKS);
  if (savedData) {
    try {
      adminWorks = JSON.parse(savedData);
    } catch (err) {
      console.error('Error parsing stored works, falling back to default', err);
      adminWorks = window.PORTFOLIO_DATA ? [...window.PORTFOLIO_DATA] : [];
    }
  } else {
    adminWorks = window.PORTFOLIO_DATA ? [...window.PORTFOLIO_DATA] : [];
    localStorage.setItem(STORAGE_KEY_WORKS, JSON.stringify(adminWorks));
  }

  loadSiteSettings();
  loadSavedGitHubToken();
  renderAdminTable();
  updateMetrics();
}

function updateMetrics() {
  const totalEl = document.getElementById('metricTotalWorks');
  const badgeEl = document.getElementById('totalArtworksBadge');
  const catEl = document.getElementById('metricTotalCategories');

  if (totalEl) totalEl.textContent = adminWorks.length;
  if (badgeEl) badgeEl.textContent = adminWorks.length;

  const categories = new Set(adminWorks.map(w => w.Board));
  if (catEl) catEl.textContent = categories.size;
}

/* ==========================================================================
   3. Tab Switching
   ========================================================================== */
function switchAdminTab(tabId) {
  document.querySelectorAll('.admin-tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));

  const targetContent = document.getElementById(`tab-${tabId}`);
  const targetBtn = document.getElementById(`tabBtn-${tabId}`);

  if (targetContent) targetContent.classList.add('active');
  if (targetBtn) targetBtn.classList.add('active');
}

/* ==========================================================================
   4. Artworks Table Rendering & Filtering
   ========================================================================== */
function renderAdminTable() {
  const tbody = document.getElementById('adminArtworksTableBody');
  if (!tbody) return;

  // Filter works by category and search
  filteredAdminWorks = adminWorks.filter(item => {
    const matchesCategory = currentFilterCategory === 'all' || item.Board === currentFilterCategory;
    const term = currentSearchTerm.toLowerCase();
    const matchesSearch = !term || 
      (item.Title && item.Title.toLowerCase().includes(term)) ||
      (item.BoardName && item.BoardName.toLowerCase().includes(term)) ||
      (item.Description && item.Description.toLowerCase().includes(term));
    return matchesCategory && matchesSearch;
  });

  if (filteredAdminWorks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          🔍 No artworks found matching your search.
        </td>
      </tr>
    `;
    return;
  }

  const categories = window.PORTFOLIO_CATEGORIES || {};

  tbody.innerHTML = filteredAdminWorks.map(item => {
    const catConfig = categories[item.Board] || { name: item.BoardName || item.Board };
    const categoryName = catConfig.name || item.BoardName || item.Board;
    const imgUrl = item.LocalPath || item.RemoteUrl || item.HighResUrl;

    return `
      <tr>
        <td>
          <img src="${imgUrl}" alt="${item.Title}" class="table-thumb" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><rect width=\\'100\\' height=\\'100\\' fill=\\'%23eee\\'/><text y=\\'.9em\\' font-size=\\'90\\'>🎨</text></svg>'" />
        </td>
        <td>
          <span class="table-title">${escapeHtml(item.Title)}</span>
          <span class="table-desc">${escapeHtml(item.Description || 'No description provided.')}</span>
        </td>
        <td>
          <span class="table-badge">${escapeHtml(categoryName)}</span>
        </td>
        <td>
          <a href="${item.PinUrl || item.RemoteUrl || '#'}" target="_blank" rel="noopener noreferrer" class="table-link">
            ${item.PinUrl ? 'View Source ↗' : 'No Link'}
          </a>
        </td>
        <td>
          <div class="table-actions">
            <button onclick="openEditArtworkModal(${item.Id})" class="btn-action-icon" title="Edit Design">
              <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button onclick="handleDeleteArtwork(${item.Id})" class="btn-action-icon btn-action-delete" title="Delete Design">
              <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function handleAdminSearch(term) {
  currentSearchTerm = term;
  renderAdminTable();
}

function handleAdminCategoryFilter(category) {
  currentFilterCategory = category;
  renderAdminTable();
}

/* ==========================================================================
   5. Artwork Add & Edit Modals
   ========================================================================== */
function openAddArtworkModal() {
  currentEditId = null;
  document.getElementById('artworkModalTitle').textContent = 'Add New Artwork';
  document.getElementById('btnSaveArtworkLabel').textContent = 'Save & Publish';
  document.getElementById('artworkEditId').value = '';
  document.getElementById('artTitle').value = '';
  document.getElementById('artCategory').value = 'social-media-creatives-handling';
  document.getElementById('artPinUrl').value = '';
  document.getElementById('artImageUrl').value = '';
  document.getElementById('artDescription').value = '';
  
  handleImagePreview('');
  document.getElementById('artworkModal').classList.remove('hidden');
}

function openEditArtworkModal(id) {
  const item = adminWorks.find(w => w.Id === id);
  if (!item) return;

  currentEditId = id;
  document.getElementById('artworkModalTitle').textContent = 'Edit Artwork';
  document.getElementById('btnSaveArtworkLabel').textContent = 'Update Artwork';
  document.getElementById('artworkEditId').value = id;
  document.getElementById('artTitle').value = item.Title || '';
  document.getElementById('artCategory').value = item.Board || 'social-media-creatives-handling';
  document.getElementById('artPinUrl').value = item.PinUrl || '';
  document.getElementById('artImageUrl').value = item.LocalPath || item.RemoteUrl || '';
  document.getElementById('artDescription').value = item.Description || '';

  handleImagePreview(item.LocalPath || item.RemoteUrl || '');
  document.getElementById('artworkModal').classList.remove('hidden');
}

function closeArtworkModal() {
  document.getElementById('artworkModal').classList.add('hidden');
}

function handleModalBackdropClick(e) {
  if (e.target.id === 'artworkModal') {
    closeArtworkModal();
  }
}

function handleImagePreview(url) {
  const img = document.getElementById('artworkImagePreview');
  const placeholder = document.getElementById('artworkPreviewPlaceholder');

  if (url && url.trim()) {
    img.src = url.trim();
    img.classList.remove('hidden');
    placeholder.classList.add('hidden');
    img.onerror = () => {
      img.classList.add('hidden');
      placeholder.classList.remove('hidden');
    };
  } else {
    img.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }
}

function handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    document.getElementById('artImageUrl').value = dataUrl;
    handleImagePreview(dataUrl);
  };
  reader.readAsDataURL(file);
}

function handleSaveArtwork(e) {
  e.preventDefault();

  const title = document.getElementById('artTitle').value.trim();
  const board = document.getElementById('artCategory').value;
  const pinUrl = document.getElementById('artPinUrl').value.trim();
  const imageUrl = document.getElementById('artImageUrl').value.trim();
  const description = document.getElementById('artDescription').value.trim();

  const categories = window.PORTFOLIO_CATEGORIES || {};
  const boardName = (categories[board] && categories[board].name) ? categories[board].name : board.replace(/-/g, ' ');

  if (currentEditId) {
    // Edit existing
    const index = adminWorks.findIndex(w => w.Id === currentEditId);
    if (index !== -1) {
      adminWorks[index] = {
        ...adminWorks[index],
        Title: title,
        Board: board,
        BoardName: boardName,
        Description: description,
        PinUrl: pinUrl || 'https://www.instagram.com/withmdn.dot',
        LocalPath: imageUrl,
        RemoteUrl: imageUrl,
        HighResUrl: imageUrl
      };
      showToast('Artwork updated successfully', '✨');
    }
  } else {
    // Add new
    const maxId = adminWorks.reduce((max, w) => Math.max(max, w.Id || 0), 0);
    const newWork = {
      Id: maxId + 1,
      PinId: `custom_${Date.now()}`,
      Title: title,
      Description: description,
      Board: board,
      BoardName: boardName,
      LocalPath: imageUrl,
      RemoteUrl: imageUrl,
      HighResUrl: imageUrl,
      PinUrl: pinUrl || 'https://www.instagram.com/withmdn.dot'
    };
    adminWorks.unshift(newWork);
    showToast('New artwork published to list', '🎉');
  }

  // Save to localStorage
  localStorage.setItem(STORAGE_KEY_WORKS, JSON.stringify(adminWorks));
  closeArtworkModal();
  renderAdminTable();
  updateMetrics();
}

function handleDeleteArtwork(id) {
  const item = adminWorks.find(w => w.Id === id);
  if (!item) return;

  if (confirm(`Are you sure you want to delete "${item.Title}"?`)) {
    adminWorks = adminWorks.filter(w => w.Id !== id);
    localStorage.setItem(STORAGE_KEY_WORKS, JSON.stringify(adminWorks));
    renderAdminTable();
    updateMetrics();
    showToast('Artwork deleted', '🗑️');
  }
}

/* ==========================================================================
   6. Site Settings Management
   ========================================================================== */
function loadSiteSettings() {
  const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
  let settings = {};
  if (saved) {
    try { settings = JSON.parse(saved); } catch (e) {}
  }

  document.getElementById('settingPhone').value = settings.phone || '919946381789';
  document.getElementById('settingEmail').value = settings.email || 'mohdthoduvayil789@gmail.com';
  document.getElementById('settingWhatsAppMsg').value = settings.whatsappMsg || 'Hi Muhammed! I saw your portfolio on mhdfaman.com and would like to connect.';
  document.getElementById('settingInstagram').value = settings.instagram || 'https://www.instagram.com/withmdn.dot';
  document.getElementById('settingPinterest').value = settings.pinterest || 'https://www.pinterest.com/mohdthoduvayil789/_created/';
  document.getElementById('settingLinkedin').value = settings.linkedin || 'https://www.linkedin.com/in/muhammed-nadapuram-7229aa235';
  document.getElementById('settingStat1').value = settings.stat1 || '400+ Creative Deliveries';
  document.getElementById('settingStat2').value = settings.stat2 || '100% Custom & Authentic';
  document.getElementById('settingMasterPin').value = localStorage.getItem(STORAGE_KEY_PIN) || DEFAULT_PIN;
}

function handleSaveSettings(e) {
  e.preventDefault();

  const settings = {
    phone: document.getElementById('settingPhone').value.trim(),
    email: document.getElementById('settingEmail').value.trim(),
    whatsappMsg: document.getElementById('settingWhatsAppMsg').value.trim(),
    instagram: document.getElementById('settingInstagram').value.trim(),
    pinterest: document.getElementById('settingPinterest').value.trim(),
    linkedin: document.getElementById('settingLinkedin').value.trim(),
    stat1: document.getElementById('settingStat1').value.trim(),
    stat2: document.getElementById('settingStat2').value.trim()
  };

  const newPin = document.getElementById('settingMasterPin').value.trim();
  if (newPin && newPin.length >= 4) {
    localStorage.setItem(STORAGE_KEY_PIN, newPin);
  }

  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  showToast('Site settings saved successfully', '⚙️');
}

function handleResetSettings() {
  if (confirm('Reset site settings to default configuration?')) {
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    localStorage.removeItem(STORAGE_KEY_PIN);
    loadSiteSettings();
    showToast('Settings reset to defaults', '🔄');
  }
}

/* ==========================================================================
   7. GitHub 1-Click Direct Sync & Export
   ========================================================================== */
function loadSavedGitHubToken() {
  const token = localStorage.getItem(STORAGE_KEY_GH_TOKEN) || '';
  const tokenInput = document.getElementById('githubTokenInput');
  if (tokenInput && token) {
    tokenInput.value = token;
  }
}

function handleDeployModal() {
  switchAdminTab('deploy');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleGitHubSync(e) {
  e.preventDefault();

  const tokenInput = document.getElementById('githubTokenInput').value.trim();
  if (!tokenInput) {
    alert('Please enter a GitHub Personal Access Token to deploy.');
    return;
  }

  localStorage.setItem(STORAGE_KEY_GH_TOKEN, tokenInput);

  const consoleBox = document.getElementById('syncConsole');
  const logsEl = document.getElementById('syncLogs');
  const statusBadge = document.getElementById('syncStatusBadge');
  const btnSync = document.getElementById('btnSyncGitHub');

  consoleBox.classList.remove('hidden');
  statusBadge.textContent = 'Syncing...';
  statusBadge.style.background = '#0284c7';
  btnSync.disabled = true;

  function appendLog(msg) {
    logsEl.textContent += `\n[${new Date().toLocaleTimeString()}] ${msg}`;
    logsEl.scrollTop = logsEl.scrollHeight;
  }

  logsEl.textContent = `Initiating direct sync to ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}...`;

  try {
    // 1. Prepare generated portfolio-data.js content
    appendLog('Preparing portfolio-data.js content...');
    const generatedJs = generatePortfolioDataJs();

    // 2. Fetch current file SHA from GitHub API
    appendLog('Fetching current commit SHA from GitHub API...');
    const fileUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/portfolio-data.js?ref=${GITHUB_BRANCH}`;
    const getRes = await fetch(fileUrl, {
      headers: {
        'Authorization': `token ${tokenInput}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let currentSha = null;
    if (getRes.ok) {
      const fileData = await getRes.json();
      currentSha = fileData.sha;
      appendLog(`Found existing file SHA: ${currentSha.substring(0, 7)}`);
    } else {
      appendLog('No existing SHA found, creating new file commit...');
    }

    // 3. Commit updated portfolio-data.js
    appendLog('Committing updated portfolio data...');
    const putRes = await fetch(fileUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${tokenInput}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Admin Update: Sync portfolio artworks and settings [${new Date().toISOString()}]`,
        content: btoa(unescape(encodeURIComponent(generatedJs))),
        sha: currentSha,
        branch: GITHUB_BRANCH
      })
    });

    if (!putRes.ok) {
      const errData = await putRes.json();
      throw new Error(errData.message || 'Failed to commit to GitHub.');
    }

    appendLog('✅ Successfully committed changes to main branch!');
    appendLog('🚀 GitHub Pages deployment triggered automatically. Site will update in ~30 seconds.');
    statusBadge.textContent = 'Success / Deployed';
    statusBadge.style.background = '#10b981';
    showToast('Changes committed & deployed to live site!', '🚀');

  } catch (err) {
    appendLog(`❌ Error: ${err.message}`);
    statusBadge.textContent = 'Error';
    statusBadge.style.background = '#ef4444';
  } finally {
    btnSync.disabled = false;
  }
}

function generatePortfolioDataJs() {
  const categories = window.PORTFOLIO_CATEGORIES || {};
  return `const CATEGORIES_CONFIG = ${JSON.stringify(categories, null, 4)};

window.PORTFOLIO_CATEGORIES = CATEGORIES_CONFIG;
window.PORTFOLIO_DATA = ${JSON.stringify(adminWorks, null, 4)};
`;
}

function handleExportDataFile() {
  const content = generatePortfolioDataJs();
  downloadFile('portfolio-data.js', content, 'application/javascript');
  showToast('Downloaded portfolio-data.js', '📥');
}

function handleExportJsonFile() {
  const content = JSON.stringify(adminWorks, null, 2);
  downloadFile('data.json', content, 'application/json');
  showToast('Downloaded data.json', '📥');
}

function downloadFile(filename, text, type) {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ==========================================================================
   Utilities
   ========================================================================== */
function showToast(message, icon = '✨') {
  const toast = document.getElementById('adminToast');
  const msgEl = document.getElementById('adminToastMessage');
  const iconEl = document.getElementById('adminToastIcon');

  if (!toast || !msgEl) return;
  msgEl.textContent = message;
  if (iconEl) iconEl.textContent = icon;

  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
