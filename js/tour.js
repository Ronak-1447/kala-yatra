/* ============================================================
   tour.js — Guided chronological tour through art history
   ============================================================ */

import { formatEraRange, categoryLabel } from './utils.js';

/** @type {Array} Locations sorted chronologically by era.start */
let tourStops = [];

/** @type {number} Current stop index in the tour */
let currentStop = -1;

/** @type {boolean} Whether the tour is currently active */
let isActive = false;

/** @type {number|null} Auto-advance timer ID */
let autoTimer = null;

/** @type {number} Auto-advance interval in milliseconds */
const AUTO_ADVANCE_MS = 10000;

/** @type {L.Map} Map reference */
let mapRef = null;

/** @type {Map} Marker map reference */
let markerMapRef = null;

/** @type {Function} Callback to open detail panel */
let openPanelFn = null;

/** @type {HTMLElement} Tour overlay element */
let overlayEl = null;

/** @type {HTMLElement} Tour button in controls bar */
let tourBtnEl = null;

/**
 * Initialize the tour module.
 * @param {Object} config
 * @param {Array} config.locations - All location data
 * @param {L.Map} config.map - Leaflet map instance
 * @param {Map} config.markerMap - Location ID → marker map
 * @param {Function} config.openPanel - Callback(location) to open detail panel
 */
export function initTour({ locations, map, markerMap, openPanel }) {
  mapRef = map;
  markerMapRef = markerMap;
  openPanelFn = openPanel;
  overlayEl = document.querySelector('.tour-overlay');
  tourBtnEl = document.querySelector('.btn-tour');

  // Sort locations chronologically
  tourStops = [...locations].sort((a, b) => a.era.start - b.era.start);

  // Tour button toggle
  tourBtnEl.addEventListener('click', () => {
    if (isActive) {
      endTour();
    } else {
      startTour();
    }
  });

  // Wire up overlay controls
  overlayEl.querySelector('.tour-prev').addEventListener('click', prevStop);
  overlayEl.querySelector('.tour-next').addEventListener('click', nextStop);
  overlayEl.querySelector('.tour-exit').addEventListener('click', endTour);
  overlayEl.querySelector('.tour-details').addEventListener('click', () => {
    if (currentStop >= 0 && currentStop < tourStops.length) {
      openPanelFn(tourStops[currentStop]);
    }
  });
}

/**
 * Start the guided tour from the first chronological stop.
 */
function startTour() {
  if (tourStops.length === 0) return;

  isActive = true;
  currentStop = -1;
  tourBtnEl.classList.add('active');
  tourBtnEl.innerHTML = '<span class="btn-icon">⏹</span> End Tour';
  overlayEl.classList.add('visible');

  nextStop();
}

/**
 * End the tour and clean up.
 */
function endTour() {
  isActive = false;
  currentStop = -1;
  clearAutoAdvance();
  tourBtnEl.classList.remove('active');
  tourBtnEl.innerHTML = '<span class="btn-icon">▶</span> Tour';
  overlayEl.classList.remove('visible');
}

/**
 * Navigate to the next tour stop.
 */
function nextStop() {
  if (!isActive) return;
  
  currentStop++;
  if (currentStop >= tourStops.length) {
    currentStop = tourStops.length - 1;
    return;
  }
  
  goToStop(currentStop);
}

/**
 * Navigate to the previous tour stop.
 */
function prevStop() {
  if (!isActive || currentStop <= 0) return;
  
  currentStop--;
  goToStop(currentStop);
}

/**
 * Fly to a specific tour stop and update the overlay.
 * @param {number} index - Stop index
 */
function goToStop(index) {
  const loc = tourStops[index];
  if (!loc) return;

  // Fly to location
  mapRef.flyTo([loc.lat, loc.lng], 7, {
    duration: 1.5,
    easeLinearity: 0.25
  });

  // Highlight marker
  const marker = markerMapRef.get(loc.id);
  if (marker) {
    setTimeout(() => {
      const el = marker.getElement();
      if (el) {
        el.classList.add('marker-highlight');
        setTimeout(() => el.classList.remove('marker-highlight'), 2000);
      }
    }, 1500);
  }

  // Update overlay content
  updateOverlay(loc, index);

  // Reset auto-advance timer
  resetAutoAdvance();
}

/**
 * Update the tour overlay with current stop information.
 * @param {Object} loc - Location data
 * @param {number} index - Current stop index
 */
function updateOverlay(loc, index) {
  overlayEl.querySelector('.tour-location-name').textContent = loc.name;
  overlayEl.querySelector('.tour-narration').textContent = loc.description;
  overlayEl.querySelector('.tour-progress').textContent = 
    `${index + 1} of ${tourStops.length} · ${categoryLabel(loc.category)} · ${formatEraRange(loc.era)}`;

  // Tour image preview
  let tourThumb = overlayEl.querySelector('.tour-thumbnail');
  const imgUrl = loc.heroImage || (loc.images && loc.images[0] ? loc.images[0].url : null);
  if (imgUrl) {
    if (!tourThumb) {
      tourThumb = document.createElement('div');
      tourThumb.className = 'tour-thumbnail';
      const nar = overlayEl.querySelector('.tour-body-wrapper') || overlayEl.querySelector('.tour-narration');
      if (nar && nar.parentElement) {
        nar.parentElement.insertBefore(tourThumb, nar);
      }
    }
    tourThumb.innerHTML = `<img src="${imgUrl}" alt="${loc.name}" referrerpolicy="no-referrer" loading="lazy" />`;
    tourThumb.style.display = 'block';
  } else if (tourThumb) {
    tourThumb.style.display = 'none';
  }

  // Update progress bar
  const progressFill = overlayEl.querySelector('.tour-progress-fill');
  const pct = ((index + 1) / tourStops.length) * 100;
  progressFill.style.width = `${pct}%`;

  // Disable prev on first, disable next on last
  const prevBtn = overlayEl.querySelector('.tour-prev');
  const nextBtn = overlayEl.querySelector('.tour-next');
  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === tourStops.length - 1;
  prevBtn.style.opacity = index === 0 ? '0.4' : '1';
  nextBtn.style.opacity = index === tourStops.length - 1 ? '0.4' : '1';
}

/**
 * Reset the auto-advance timer.
 */
function resetAutoAdvance() {
  clearAutoAdvance();
  if (isActive && currentStop < tourStops.length - 1) {
    autoTimer = setTimeout(nextStop, AUTO_ADVANCE_MS);
  }
}

/**
 * Clear the auto-advance timer.
 */
function clearAutoAdvance() {
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
}
