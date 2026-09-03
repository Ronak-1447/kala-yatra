/* ============================================================
   filters.js — Category filter pills, timeline slider, search
   ============================================================ */

import { debounce, fuzzyMatch, formatEra, categoryLabel, generateArtPlaceholder } from './utils.js';

/** @type {Set<string>} Currently active category filters */
let activeCategories = new Set();

/** @type {Array} All location data */
let allLocations = [];

/** @type {Map<string, L.Marker>} Marker map from markers.js */
let markerMapRef = null;

/** @type {L.MarkerClusterGroup} Cluster group reference */
let clusterGroupRef = null;

/** @type {number|null} Current era filter value (null = no filter) */
let currentEraFilter = null;

/** @type {Function} Callback when a search result is selected */
let onSearchSelect = null;

/** @type {string} Current search query */
let searchQuery = '';

/**
 * Initialize the filters module.
 * @param {Object} config
 * @param {Array} config.locations - All location data
 * @param {Map} config.markerMap - Map of locationId → L.Marker
 * @param {L.MarkerClusterGroup} config.clusterGroup
 * @param {Function} config.onSelect - Callback(locationId) when search result is selected
 */
export function initFilters({ locations, markerMap, clusterGroup, onSelect }) {
  allLocations = locations;
  markerMapRef = markerMap;
  clusterGroupRef = clusterGroup;
  onSearchSelect = onSelect;

  // Initialize all categories as active
  const categories = [...new Set(locations.map(l => l.category))];
  categories.forEach(c => activeCategories.add(c));

  setupCategoryPills();
  setupSearch();
  setupEraSlider();
}

/* ---- Category Filter Pills ---- */

function setupCategoryPills() {
  const pills = document.querySelectorAll('.filter-pill');
  
  // Mark all pills as active initially
  pills.forEach(pill => {
    pill.classList.add('active');
    
    pill.addEventListener('click', () => {
      const category = pill.dataset.category;
      
      if (pill.classList.contains('active')) {
        // Deactivate this category
        pill.classList.remove('active');
        activeCategories.delete(category);
      } else {
        // Activate this category
        pill.classList.add('active');
        activeCategories.add(category);
      }
      
      applyFilters();
    });
  });
}

/* ---- Search ---- */

function setupSearch() {
  const input = document.querySelector('.search-input');
  const suggestionsEl = document.querySelector('.search-suggestions');
  
  if (!input || !suggestionsEl) return;

  const updateSuggestions = debounce((query) => {
    searchQuery = query;

    if (!query.trim()) {
      suggestionsEl.classList.remove('visible');
      suggestionsEl.innerHTML = '';
      applyFilters();
      return;
    }

    // Search across name, region, art forms, category, description
    const matches = allLocations.filter(loc => {
      const searchText = [
        loc.name,
        loc.region,
        ...loc.artForms,
        categoryLabel(loc.category),
        loc.description
      ].join(' ');
      return fuzzyMatch(query, searchText);
    });

    if (matches.length === 0) {
      suggestionsEl.innerHTML = '<div class="search-suggestion"><span class="suggestion-name" style="color:var(--warm-gray);">No results found</span></div>';
      suggestionsEl.classList.add('visible');
      return;
    }

    suggestionsEl.innerHTML = matches.slice(0, 8).map(loc => {
      const imgUrl = loc.heroImage || (loc.images && loc.images[0] ? loc.images[0].url : null);
      const fallbackImg = generateArtPlaceholder(loc.name, loc.category, 0);

      return `
        <div class="search-suggestion" data-location-id="${loc.id}">
          <div class="suggestion-thumb-wrapper">
            <img class="suggestion-thumb" 
                 src="${imgUrl || fallbackImg}" 
                 alt="${loc.name}" 
                 referrerpolicy="no-referrer"
                 loading="lazy" 
                 onerror="this.src='${fallbackImg}';" />
          </div>
          <div class="suggestion-info">
            <div class="suggestion-name">${loc.name}</div>
            <div class="suggestion-region">${loc.region} · <span class="suggestion-cat-text cat-${loc.category}">${categoryLabel(loc.category)}</span></div>
          </div>
        </div>
      `;
    }).join('');

    suggestionsEl.classList.add('visible');

    // Wire up suggestion clicks
    suggestionsEl.querySelectorAll('.search-suggestion[data-location-id]').forEach(el => {
      el.addEventListener('click', () => {
        const locId = el.dataset.locationId;
        input.value = '';
        searchQuery = '';
        suggestionsEl.classList.remove('visible');
        applyFilters();
        if (onSearchSelect) onSearchSelect(locId);
      });
    });
  }, 200);

  input.addEventListener('input', (e) => updateSuggestions(e.target.value));

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      suggestionsEl.classList.remove('visible');
    }
  });
}

/* ---- Era Slider ---- */

function setupEraSlider() {
  const eraBtn = document.querySelector('.btn-era');
  const eraPopover = document.querySelector('.era-popover');
  const slider = document.querySelector('.era-slider');
  const eraValue = document.querySelector('.era-value');
  const resetBtn = document.querySelector('.era-reset-btn');

  if (!eraBtn || !eraPopover || !slider) return;

  // Toggle popover
  eraBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    eraPopover.classList.toggle('visible');
  });

  // Close popover when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.era-popover') && !e.target.closest('.btn-era')) {
      eraPopover.classList.remove('visible');
    }
  });

  // Slider input
  slider.addEventListener('input', () => {
    const val = parseInt(slider.value);
    const year = sliderToYear(val);
    currentEraFilter = year;
    eraValue.textContent = formatEra(year);
    applyFilters();
  });

  // Reset button
  resetBtn.addEventListener('click', () => {
    currentEraFilter = null;
    slider.value = 500;
    eraValue.textContent = 'All Eras';
    applyFilters();
  });

  // Initialize display
  eraValue.textContent = 'All Eras';
}

/**
 * Convert slider position (0–1000) to a year using nonlinear mapping.
 * @param {number} val - Slider value 0–1000
 * @returns {number} Year (negative = BCE)
 */
function sliderToYear(val) {
  if (val <= 200) return Math.round(-30000 + (val / 200) * 27000);
  if (val <= 400) return Math.round(-3000 + ((val - 200) / 200) * 3000);
  if (val <= 600) return Math.round(0 + ((val - 400) / 200) * 800);
  if (val <= 800) return Math.round(800 + ((val - 600) / 200) * 700);
  return Math.round(1500 + ((val - 800) / 200) * 500);
}

/* ---- Apply Combined Filters ---- */

/**
 * Apply all active filters simultaneously.
 */
function applyFilters() {
  if (!clusterGroupRef || !markerMapRef) return;

  allLocations.forEach(loc => {
    const marker = markerMapRef.get(loc.id);
    if (!marker) return;

    let visible = true;

    // Category filter
    if (!activeCategories.has(loc.category)) {
      visible = false;
    }

    // Era filter
    if (visible && currentEraFilter !== null) {
      if (currentEraFilter < loc.era.start || currentEraFilter > loc.era.end) {
        visible = false;
      }
    }

    // Search filter
    if (visible && searchQuery.trim()) {
      const searchText = [
        loc.name,
        loc.region,
        ...loc.artForms,
        categoryLabel(loc.category)
      ].join(' ');
      if (!fuzzyMatch(searchQuery, searchText)) {
        visible = false;
      }
    }

    // Add/remove from cluster group
    if (visible && !clusterGroupRef.hasLayer(marker)) {
      clusterGroupRef.addLayer(marker);
    } else if (!visible && clusterGroupRef.hasLayer(marker)) {
      clusterGroupRef.removeLayer(marker);
    }
  });
}

/**
 * Reset all filters.
 */
export function resetFilters() {
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(p => {
    p.classList.add('active');
    activeCategories.add(p.dataset.category);
  });
  currentEraFilter = null;
  searchQuery = '';
  
  const slider = document.querySelector('.era-slider');
  const eraValue = document.querySelector('.era-value');
  if (slider) slider.value = 500;
  if (eraValue) eraValue.textContent = 'All Eras';
  
  const input = document.querySelector('.search-input');
  if (input) input.value = '';

  applyFilters();
}
