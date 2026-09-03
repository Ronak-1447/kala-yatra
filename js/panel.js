/* ============================================================
   panel.js — Detail side panel for location information
   ============================================================ */

import { 
  formatEraRange, 
  categoryLabel, 
  categoryColor, 
  generateArtPlaceholder, 
  generateHeroBg 
} from './utils.js';

/** @type {HTMLElement} */
let panelEl;
/** @type {Function|null} Callback to navigate to a related location */
let navigateToLocation = null;
/** @type {string|null} Currently displayed location ID */
let currentLocationId = null;
/** @type {HTMLElement|null} Lightbox modal element */
let lightboxEl = null;
/** @type {Array} Location list for looking up related names */
let locationsList = [];

/**
 * Initialize the panel module.
 * @param {HTMLElement} panelElement - The .detail-panel DOM element
 * @param {Function} onNavigate - Callback(locationId) to fly to a related location
 * @param {Array} [allLocations=[]] - Full locations array
 */
export function initPanel(panelElement, onNavigate, allLocations = []) {
  panelEl = panelElement;
  navigateToLocation = onNavigate;
  locationsList = allLocations;

  // Close button
  panelEl.querySelector('.panel-close').addEventListener('click', closePanel);

  // Setup Lightbox Modal
  setupLightbox();

  // Keyboard: Escape to close panel or lightbox
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lightboxEl && lightboxEl.classList.contains('active')) {
        closeLightbox();
      } else {
        closePanel();
      }
    }
  });
}

/**
 * Setup image lightbox for enlarged viewing
 */
function setupLightbox() {
  lightboxEl = document.getElementById('image-lightbox');
  if (!lightboxEl) {
    lightboxEl = document.createElement('div');
    lightboxEl.id = 'image-lightbox';
    lightboxEl.className = 'image-lightbox';
    lightboxEl.innerHTML = `
      <div class="lightbox-backdrop"></div>
      <div class="lightbox-content">
        <button class="lightbox-close" aria-label="Close image">✕</button>
        <div class="lightbox-img-wrapper">
          <img class="lightbox-img" referrerpolicy="no-referrer" src="" alt="" />
        </div>
        <div class="lightbox-caption"></div>
      </div>
    `;
    document.body.appendChild(lightboxEl);

    lightboxEl.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
    lightboxEl.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  }
}

/**
 * Open image in lightbox
 * @param {string} src 
 * @param {string} caption 
 */
export function openLightbox(src, caption) {
  if (!lightboxEl) setupLightbox();
  const img = lightboxEl.querySelector('.lightbox-img');
  const cap = lightboxEl.querySelector('.lightbox-caption');
  img.src = src;
  img.alt = caption || 'Artwork image';
  cap.textContent = caption || '';
  lightboxEl.classList.add('active');
}

/**
 * Close image lightbox
 */
export function closeLightbox() {
  if (lightboxEl) {
    lightboxEl.classList.remove('active');
  }
}

/**
 * Open the detail panel and populate it with location data.
 * @param {Object} location - Location data object
 */
export function openPanel(location) {
  currentLocationId = location.id;

  // --- Hero section ---
  const hero = panelEl.querySelector('.panel-hero');
  const heroImage = hero.querySelector('.panel-hero-image');
  const heroOverlay = hero.querySelector('.panel-hero-overlay');

  const heroUrl = location.heroImage || (location.images && location.images[0] ? location.images[0].url : null);
  const fallbackBg = generateHeroBg(location.name, location.category);

  if (heroUrl) {
    heroImage.style.background = '#1a1410';
    heroImage.innerHTML = `
      <img src="${heroUrl}" 
           alt="${location.name}" 
           class="hero-img-cover" 
           referrerpolicy="no-referrer"
           loading="lazy"
           onerror="this.style.display='none'; this.parentElement.style.background='${fallbackBg}';" />
    `;
    // Click hero to enlarge
    heroImage.onclick = () => openLightbox(heroUrl, `${location.name} — ${location.region}`);
    heroImage.style.cursor = 'zoom-in';
  } else {
    heroImage.style.background = fallbackBg;
    heroImage.innerHTML = '';
    heroImage.onclick = null;
    heroImage.style.cursor = 'default';
  }

  heroOverlay.querySelector('h2').textContent = location.name;
  heroOverlay.querySelector('.panel-region').textContent = location.region;

  // --- Content section ---
  const content = panelEl.querySelector('.panel-content');
  content.innerHTML = buildPanelContent(location);

  // Wire up gallery images for lightbox
  content.querySelectorAll('.gallery-card').forEach(card => {
    card.addEventListener('click', () => {
      const src = card.dataset.src;
      const cap = card.dataset.caption;
      if (src) openLightbox(src, cap);
    });
  });

  // Wire up related location links
  content.querySelectorAll('.related-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.dataset.locationId;
      if (navigateToLocation) navigateToLocation(targetId);
    });
  });

  // Open panel with animation
  panelEl.classList.add('open');
}

/**
 * Close the detail panel.
 */
export function closePanel() {
  panelEl.classList.remove('open');
  currentLocationId = null;
}

/**
 * Check if the panel is currently open.
 * @returns {boolean}
 */
export function isPanelOpen() {
  return panelEl.classList.contains('open');
}

/**
 * Get the currently displayed location ID.
 * @returns {string|null}
 */
export function getCurrentLocationId() {
  return currentLocationId;
}

/**
 * Build the HTML content for the panel body.
 * @param {Object} loc - Location data
 * @returns {string} HTML string
 */
function buildPanelContent(loc) {
  const imagesHtml = (loc.images && loc.images.length > 0) ? `
    <!-- Gallery -->
    <div class="panel-section">
      <h4 class="panel-section-title">Visual Gallery <span class="gallery-hint">(click to enlarge)</span></h4>
      <div class="panel-gallery">
        ${loc.images.map((img, i) => {
          const imgSrc = img.url || generateArtPlaceholder(img.caption, loc.category, i);
          const fallbackPlaceholder = generateArtPlaceholder(img.caption, loc.category, i);
          return `
            <div class="gallery-card" data-src="${imgSrc}" data-caption="${escapeAttr(img.caption)}">
              <img src="${imgSrc}" 
                   alt="${escapeAttr(img.caption)}" 
                   class="gallery-card-img"
                   referrerpolicy="no-referrer"
                   loading="lazy"
                   onerror="this.src='${fallbackPlaceholder}';" />
              <div class="gallery-card-overlay">
                <span class="gallery-zoom-icon">🔍</span>
              </div>
              <div class="gallery-card-caption">${img.caption}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  return `
    <!-- Badges -->
    <div class="panel-badges">
      <span class="panel-badge cat-${loc.category}">${categoryLabel(loc.category)}</span>
      <span class="panel-badge era-badge">${formatEraRange(loc.era)}</span>
    </div>

    <!-- Art Forms -->
    <div class="panel-section">
      <div class="art-form-tags">
        ${loc.artForms.map(af => `<span class="art-form-tag">${af}</span>`).join('')}
      </div>
    </div>

    <!-- Description -->
    <div class="panel-section">
      <h4 class="panel-section-title">Overview</h4>
      <p class="panel-description">${loc.description}</p>
    </div>

    <!-- Gallery -->
    ${imagesHtml}

    <!-- Historical Context -->
    <div class="panel-section">
      <h4 class="panel-section-title">Historical Context</h4>
      <div class="panel-context">${loc.historicalContext}</div>
    </div>

    <!-- Key Artists / Patronage -->
    <div class="panel-section">
      <h4 class="panel-section-title">Key Artists & Patronage</h4>
      <ul class="panel-list">
        ${loc.keyArtists.map(a => `<li>${a}</li>`).join('')}
        <li><em>Patronage: ${loc.patronage}</em></li>
      </ul>
    </div>

    <!-- Materials & Techniques -->
    <div class="panel-section">
      <h4 class="panel-section-title">Materials & Techniques</h4>
      <ul class="panel-list">
        ${loc.materials.map(m => `<li>${m}</li>`).join('')}
      </ul>
    </div>

    <!-- Notable Works -->
    <div class="panel-section">
      <h4 class="panel-section-title">Notable Works & Artifacts</h4>
      <ul class="panel-list">
        ${loc.notableWorks.map(w => `<li>${w}</li>`).join('')}
      </ul>
    </div>

    <!-- Related Locations -->
    ${loc.relatedLocations && loc.relatedLocations.length > 0 ? `
      <div class="panel-section">
        <h4 class="panel-section-title">Related Locations</h4>
        <div class="related-links">
          ${loc.relatedLocations.map(relId => {
            const relLoc = locationsList ? locationsList.find(l => l.id === relId) : null;
            const displayName = relLoc ? relLoc.name : relId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return `
              <a href="#" class="related-link" data-location-id="${relId}">
                → ${displayName}
              </a>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
