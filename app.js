/**
 * MUHAMMED (@withmdn.dot) — Mydbucket Style Agency Application Engine
 * Curated Original Created Works & Interactive Components
 */

let allWorks = [];
let filteredWorks = [];
let currentCategory = 'all';
let currentSearchTerm = '';
let currentModalIndex = 0;
let currentZoom = 1;
let isDragging = false;
let startX = 0, startY = 0, translateX = 0, translateY = 0;

// Category metadata and icon mappings
const CATEGORY_ICONS = {
  'all': '🌟',
  'social-media-creatives-handling': '🎯',
  'marketing': '📈',
  'social-media-flyer': '📱',
  'food-poster': '🍔',
  'visiting-card': '💳',
  'edu': '🎓',
  'the-right-way-the-truth': '🕊️'
};

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initPortfolioData();
  setupEventListeners();
  initHeroRotatingWords();
  updateFooterYear();
});

/**
 * Initialize Portfolio Data from window.PORTFOLIO_DATA or LocalStorage override
 */
async function initPortfolioData() {
  applySiteSettings();

  // Check for local admin overrides first
  const localSaved = localStorage.getItem('MDN_CUSTOM_PORTFOLIO_DATA');
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        allWorks = parsed;
        renderApp();
        return;
      }
    } catch (e) {
      console.warn('Error parsing local portfolio data override:', e);
    }
  }

  if (window.PORTFOLIO_DATA && Array.isArray(window.PORTFOLIO_DATA)) {
    allWorks = window.PORTFOLIO_DATA;
    renderApp();
  } else {
    try {
      const res = await fetch('data.json');
      allWorks = await res.json();
      renderApp();
    } catch (err) {
      console.warn('Could not fetch data.json locally, fallback initialized', err);
    }
  }
}

/**
 * Dynamically apply custom site settings (phone, WhatsApp, social links) if configured
 */
function applySiteSettings() {
  const savedSettings = localStorage.getItem('MDN_CUSTOM_SITE_SETTINGS');
  if (!savedSettings) return;
  try {
    const settings = JSON.parse(savedSettings);

    // Update WhatsApp links
    if (settings.phone) {
      const phoneClean = settings.phone.replace(/[^0-9]/g, '');
      const msg = settings.whatsappMsg || 'Hi Muhammed! I saw your portfolio on mhdfaman.com and would like to connect.';
      const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`;
      document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
        link.href = waUrl;
      });
    }

    // Update Instagram links
    if (settings.instagram) {
      document.querySelectorAll('a[href*="instagram.com"]').forEach(link => {
        link.href = settings.instagram;
      });
    }

    // Update LinkedIn links
    if (settings.linkedin) {
      document.querySelectorAll('a[href*="linkedin.com"]').forEach(link => {
        link.href = settings.linkedin;
      });
    }

    // Update Pinterest links
    if (settings.pinterest) {
      document.querySelectorAll('a[href*="pinterest.com"]').forEach(link => {
        link.href = settings.pinterest;
      });
    }
  } catch (e) {
    console.warn('Error applying custom site settings:', e);
  }
}

/**
 * Render the tabs, stats, and initial gallery
 */
function renderApp() {
  const totalCountEl = document.getElementById('totalWorksCount');
  if (totalCountEl) totalCountEl.textContent = `${allWorks.length}`;
  renderCategoryTabs();
  applyFilters();
}

/**
 * Render dynamic category tabs with counts
 */
function renderCategoryTabs() {
  const container = document.getElementById('categoryTabsContainer');
  if (!container) return;

  // Calculate counts for each category
  const counts = { all: allWorks.length };
  allWorks.forEach(item => {
    counts[item.Board] = (counts[item.Board] || 0) + 1;
  });

  const categories = window.PORTFOLIO_CATEGORIES || {};
  let tabsHtml = `
    <button class="tab-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="selectCategory('all')">
      <span>All Work</span>
      <span class="tab-count">${counts['all'] || 0}</span>
    </button>
  `;

  // Standard ordered board keys present in created works
  const orderedKeys = [
    'social-media-creatives-handling',
    'marketing',
    'social-media-flyer',
    'food-poster',
    'visiting-card',
    'edu',
    'the-right-way-the-truth'
  ];

  orderedKeys.forEach(key => {
    if (counts[key] > 0) {
      const config = categories[key] || { name: key.replace(/-/g, ' ') };
      const isActive = currentCategory === key ? 'active' : '';
      tabsHtml += `
        <button class="tab-btn ${isActive}" onclick="selectCategory('${key}')">
          <span>${config.name}</span>
          <span class="tab-count">${counts[key]}</span>
        </button>
      `;
    }
  });

  container.innerHTML = tabsHtml;
}

/**
 * Handle category tab selection
 */
function selectCategory(categoryKey) {
  currentCategory = categoryKey;
  renderCategoryTabs();
  
  // Update description
  const descEl = document.getElementById('activeCategoryDesc');
  const labelEl = document.getElementById('currentCategoryLabel');
  const categories = window.PORTFOLIO_CATEGORIES || {};

  if (categoryKey === 'all') {
    if (descEl) descEl.textContent = 'Showing all authentic graphic design creations uploaded and handcrafted by Mohd Thoduvayil (@withmdn.dot).';
    if (labelEl) labelEl.textContent = 'All Work';
  } else {
    const config = categories[categoryKey];
    if (descEl && config) descEl.textContent = `${config.description}`;
    if (labelEl && config) labelEl.textContent = config.name;
  }

  applyFilters();
}

/**
 * Handle real-time search
 */
function handleSearch(term) {
  currentSearchTerm = term.trim().toLowerCase();
  const clearBtn = document.getElementById('clearSearchBtn');
  if (clearBtn) {
    clearBtn.style.display = currentSearchTerm ? 'flex' : 'none';
  }
  applyFilters();
}

/**
 * Clear search input
 */
function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  handleSearch('');
}

/**
 * Reset all active filters
 */
function resetFilters() {
  clearSearch();
  selectCategory('all');
}

/**
 * Filter items by category and search keywords
 */
function applyFilters() {
  filteredWorks = allWorks.filter(item => {
    const matchesCategory = currentCategory === 'all' || item.Board === currentCategory;
    
    let matchesSearch = true;
    if (currentSearchTerm) {
      const titleStr = (item.Title || '').toLowerCase();
      const descStr = (item.Description || '').toLowerCase();
      const boardStr = (item.BoardName || item.Board || '').toLowerCase();
      matchesSearch = titleStr.includes(currentSearchTerm) || descStr.includes(currentSearchTerm) || boardStr.includes(currentSearchTerm);
    }

    return matchesCategory && matchesSearch;
  });

  // Update visible counter
  const counterEl = document.getElementById('visibleCount');
  if (counterEl) counterEl.textContent = filteredWorks.length;

  renderGallery();
}

/**
 * Render gallery grid
 */
function renderGallery() {
  const gallery = document.getElementById('galleryContainer');
  const emptyState = document.getElementById('emptyState');
  if (!gallery) return;

  if (filteredWorks.length === 0) {
    gallery.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  const categories = window.PORTFOLIO_CATEGORIES || {};

  gallery.innerHTML = filteredWorks.map((item, idx) => {
    const catConfig = categories[item.Board] || { name: item.BoardName || 'Design' };
    const niceName = catConfig.name || item.BoardName;
    const icon = CATEGORY_ICONS[item.Board] || '🎨';

    return `
      <div class="gallery-card" onclick="openLightbox(${idx})">
        <div class="gallery-card-img-wrap">
          <span class="card-badge">${niceName}</span>
          <img 
            src="${item.LocalPath}" 
            alt="${item.Title}" 
            loading="lazy"
            onerror="this.onerror=null; this.src='${item.RemoteUrl}';"
          />
          <div class="card-overlay">
            <div class="overlay-meta">
              <h4 class="overlay-title">${item.Title}</h4>
              <p class="overlay-category">Muhammed Original Design</p>
              <div class="overlay-actions">
                <button class="overlay-btn" onclick="event.stopPropagation(); openLightbox(${idx});">
                  <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  <span>Preview</span>
                </button>
                <a class="overlay-btn" href="${item.HighResUrl || item.RemoteUrl}" target="_blank" download onclick="event.stopPropagation();">
                  <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  <span>Save</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Open Lightbox by Artwork ID (for Spotlight Deck)
 */
function openLightboxById(id) {
  if (!allWorks || allWorks.length === 0) return;
  const index = allWorks.findIndex(w => w.Id === id);
  if (index !== -1) {
    filteredWorks = [...allWorks];
    openLightbox(index);
  }
}

/**
 * FAQ Accordion Toggle
 */
function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  if (!item) return;

  const isActive = item.classList.contains('active');
  
  // Close all other items
  document.querySelectorAll('.faq-item').forEach(other => {
    if (other !== item) other.classList.remove('active');
  });

  // Toggle current item
  if (isActive) {
    item.classList.remove('active');
  } else {
    item.classList.add('active');
  }
}

/**
 * Handle Contact Form Submission & WhatsApp Forwarding
 */
function handleFormSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('formName').value.trim();
  const phone = document.getElementById('formPhone').value.trim();
  const service = document.getElementById('formService').value;
  const message = document.getElementById('formMessage').value.trim();

  const formattedMsg = `Hi Muhammed! My name is ${name} (${phone}). I am interested in: *${service}*. Details: ${message ? message : 'Looking for a project consultation and timeline estimate.'}`;
  const whatsappUrl = `https://wa.me/919946381789?text=${encodeURIComponent(formattedMsg)}`;

  showToast('🚀 Forwarding to WhatsApp with your details...');
  window.open(whatsappUrl, '_blank');
}

/**
 * Lightbox Modal Controls
 */
function openLightbox(index) {
  if (!filteredWorks[index]) return;
  currentModalIndex = index;
  resetZoom();

  const modal = document.getElementById('lightboxModal');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  updateModalContent();
}

function closeLightbox() {
  const modal = document.getElementById('lightboxModal');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  resetZoom();
}

function handleBackdropClick(event) {
  if (event.target.id === 'lightboxModal' || event.target.id === 'imageStage') {
    closeLightbox();
  }
}

function updateModalContent() {
  const item = filteredWorks[currentModalIndex];
  if (!item) return;

  const categories = window.PORTFOLIO_CATEGORIES || {};
  const catConfig = categories[item.Board] || { name: item.BoardName || 'Design' };

  // Update image
  const modalImg = document.getElementById('modalImage');
  modalImg.src = item.LocalPath || item.RemoteUrl;
  modalImg.onerror = function() {
    this.onerror = null;
    this.src = item.RemoteUrl;
  };

  document.getElementById('modalCategoryBadge').textContent = catConfig.name || item.BoardName;
  document.getElementById('modalCounter').textContent = `${currentModalIndex + 1} / ${filteredWorks.length}`;
  document.getElementById('modalTitle').textContent = item.Title;
  
  const descEl = document.getElementById('modalDescription');
  if (descEl) {
    descEl.textContent = item.Description && item.Description.trim() ? item.Description : `Created by Muhammed (@withmdn.dot) under ${catConfig.name}.`;
  }
  
  // Update Pinterest link to original pin
  const pinLink = document.getElementById('modalPinterestLink');
  if (pinLink) {
    pinLink.href = item.PinUrl || `https://www.pinterest.com/pin/${item.PinId}/`;
  }
}

function navigateModal(step) {
  currentModalIndex = (currentModalIndex + step + filteredWorks.length) % filteredWorks.length;
  resetZoom();
  updateModalContent();
}

/**
 * Interactive Zoom & Pan within Lightbox
 */
function zoomIn() {
  currentZoom = Math.min(currentZoom + 0.3, 3);
  applyImageTransform();
}

function zoomOut() {
  currentZoom = Math.max(currentZoom - 0.3, 0.7);
  applyImageTransform();
}

function resetZoom() {
  currentZoom = 1;
  translateX = 0;
  translateY = 0;
  applyImageTransform();
}

function applyImageTransform() {
  const img = document.getElementById('modalImage');
  if (img) {
    img.style.transform = `scale(${currentZoom}) translate(${translateX}px, ${translateY}px)`;
  }
}

/**
 * Download currently opened image
 */
function downloadCurrentImage() {
  const item = filteredWorks[currentModalIndex];
  if (!item) return;

  const downloadUrl = item.LocalPath || item.HighResUrl || item.RemoteUrl;
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `Muhammed_Portfolio_${item.Title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('📥 Downloading design in high quality!');
}

/**
 * Copy Email Action & Toast Notification
 */
function copyContactEmail() {
  const email = "mohdthoduvayil789@gmail.com";
  navigator.clipboard.writeText(email).then(() => {
    showToast('📋 Email copied: ' + email);
  }).catch(() => {
    prompt('Copy designer email:', email);
  });
}

function showToast(message) {
  const toast = document.getElementById('toastAlert');
  const msgEl = document.getElementById('toastMessage');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/**
 * Keyboard Navigation & Touch Events
 */
function setupEventListeners() {
  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('lightboxModal');
    if (modal && !modal.classList.contains('hidden')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') navigateModal(1);
      if (e.key === 'ArrowLeft') navigateModal(-1);
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-' || e.key === '_') zoomOut();
      if (e.key === '0') resetZoom();
    }
  });

  // Touch Swipe on mobile
  let touchStartX = 0;
  let touchEndX = 0;

  const stage = document.getElementById('lightboxModal');
  if (stage) {
    stage.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    stage.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });
  }

  function handleSwipe() {
    if (currentZoom > 1.1) return; // Don't swipe if zoomed in
    const swipeDistance = touchEndX - touchStartX;
    if (swipeDistance > 60) navigateModal(-1); // Swipe Right -> Prev
    if (swipeDistance < -60) navigateModal(1); // Swipe Left -> Next
  }

  // Pan / Drag image when zoomed
  const modalImg = document.getElementById('modalImage');
  if (modalImg) {
    modalImg.addEventListener('mousedown', (e) => {
      if (currentZoom > 1) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        applyImageTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  // Smooth Mouse Drag & Wheel horizontal scroll for category tabs
  const tabsScroll = document.getElementById('tabsScrollContainer');
  if (tabsScroll) {
    let isTabsDragging = false;
    let tabsStartX = 0;
    let scrollLeft = 0;

    tabsScroll.addEventListener('mousedown', (e) => {
      isTabsDragging = true;
      tabsStartX = e.pageX - tabsScroll.offsetLeft;
      scrollLeft = tabsScroll.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      isTabsDragging = false;
    });

    tabsScroll.addEventListener('mousemove', (e) => {
      if (!isTabsDragging) return;
      e.preventDefault();
      const x = e.pageX - tabsScroll.offsetLeft;
      const walk = (x - tabsStartX) * 1.5;
      tabsScroll.scrollLeft = scrollLeft - walk;
    });

    tabsScroll.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && tabsScroll.scrollWidth > tabsScroll.clientWidth) {
        tabsScroll.scrollLeft += e.deltaY;
      }
    }, { passive: true });
  }
}

function updateFooterYear() {
  const el = document.getElementById('currentYear');
  if (el) el.textContent = new Date().getFullYear();
}

/**
 * Dynamic Rotating Hero Specialties with Vibrant Animated Gradient
 */
function initHeroRotatingWords() {
  const rotatingEl = document.getElementById('rotatingHeroWord');
  if (!rotatingEl) return;

  const words = [
    'Social Media Creatives',
    'Brand Identity & Logos',
    'Promotional Posters & Flyers',
    'Company Profiles & Print',
    'Campaign Visual Systems'
  ];

  let currentIndex = 0;

  setInterval(() => {
    currentIndex = (currentIndex + 1) % words.length;
    
    // Add exit transition
    rotatingEl.style.opacity = '0';
    rotatingEl.style.transform = 'translateY(-10px)';
    rotatingEl.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

    setTimeout(() => {
      rotatingEl.textContent = words[currentIndex];
      rotatingEl.classList.remove('word-fade-in');
      void rotatingEl.offsetWidth; // Trigger reflow
      rotatingEl.classList.add('word-fade-in');
      rotatingEl.style.opacity = '1';
      rotatingEl.style.transform = 'translateY(0)';
    }, 300);

  }, 3200);
}

