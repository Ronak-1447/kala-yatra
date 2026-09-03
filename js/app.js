/* ============================================================
   app.js — Main application initialization for Kala Yatra
   ============================================================ */

import { buildMarkers, highlightMarker } from './markers.js';
import { initPanel, openPanel, closePanel } from './panel.js';
import { initFilters } from './filters.js';
import { initTour } from './tour.js';

/** @type {L.Map} The main Leaflet map instance */
let map = null;

/** @type {Array} All location data loaded from JSON */
let locations = [];

/** @type {Map<string, L.Marker>} Map of locationId → Leaflet marker */
let markerMap = null;

/** @type {L.MarkerClusterGroup} The marker cluster group */
let clusterGroup = null;

/* ---- Boot ---- */
document.addEventListener('DOMContentLoaded', init);

/**
 * Initialize the entire application.
 */
async function init() {
  try {
    // 1. Load location data
    locations = await loadLocations();

    // 2. Initialize the Leaflet map
    map = initMap();

    // 3. Build markers and add to map
    const result = buildMarkers(locations, map, handleMarkerClick);
    markerMap = result.markerMap;
    clusterGroup = result.clusterGroup;

    // 4. Initialize the detail panel
    initPanel(
      document.querySelector('.detail-panel'),
      navigateToLocation,
      locations
    );

    // 5. Initialize filters (category pills, search, era slider)
    initFilters({
      locations,
      markerMap,
      clusterGroup,
      onSelect: navigateToLocation
    });

    // 6. Initialize tour mode
    initTour({
      locations,
      map,
      markerMap,
      openPanel: (loc) => {
        openPanel(loc);
      }
    });

    // 7. Hide loading overlay
    setTimeout(() => {
      document.querySelector('.loading-overlay').classList.add('hidden');
    }, 600);

  } catch (err) {
    console.error('Failed to initialize Kala Yatra:', err);
    document.querySelector('.loading-text').textContent = 'Failed to load. Please refresh.';
  }
}

/**
 * Load location data from the JSON file.
 * @returns {Promise<Array>}
 */
async function loadLocations() {
  const response = await fetch('./data/locations.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * Initialize and configure the Leaflet map.
 * @returns {L.Map}
 */
function initMap() {
  const m = L.map('map', {
    center: [22.5, 82.0],
    zoom: 5,
    minZoom: 4,
    maxZoom: 12,
    zoomControl: true,
    attributionControl: true,
    maxBounds: [
      [5, 60],    // Southwest corner
      [40, 100]   // Northeast corner
    ],
    maxBoundsViscosity: 0.8
  });

  // Primary tile layer: Stadia Alidade Smooth (warm, muted)
  // Fallback to standard OSM if Stadia tiles fail
  const stadiaLayer = L.tileLayer(
    'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 20,
      errorTileUrl: ''
    }
  );

  const osmLayer = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }
  );

  // Try Stadia first, fall back to OSM
  stadiaLayer.on('tileerror', () => {
    if (!m.hasLayer(osmLayer)) {
      m.removeLayer(stadiaLayer);
      osmLayer.addTo(m);
    }
  });

  stadiaLayer.addTo(m);

  return m;
}

/**
 * Handle marker click: open the detail panel for that location.
 * @param {Object} location - Location data
 * @param {L.Marker} marker - The clicked marker
 */
function handleMarkerClick(location, marker) {
  openPanel(location);
  highlightMarker(marker);
}

/**
 * Navigate to a location by ID: fly to it, highlight it, and open its panel.
 * Used by related location links and search results.
 * @param {string} locationId 
 */
function navigateToLocation(locationId) {
  const loc = locations.find(l => l.id === locationId);
  if (!loc) return;

  const marker = markerMap.get(locationId);
  if (!marker) return;

  // Close current panel first
  closePanel();

  if (clusterGroup && clusterGroup.hasLayer(marker)) {
    // If the marker is currently clustered, zoom in to reveal and spiderfy it
    clusterGroup.zoomToShowLayer(marker, () => {
      openPanel(loc);
      highlightMarker(marker);
    });
  } else {
    // Fly to the location
    map.flyTo([loc.lat, loc.lng], 8, {
      duration: 1.2,
      easeLinearity: 0.3
    });

    setTimeout(() => {
      openPanel(loc);
      highlightMarker(marker);
    }, 1300);
  }
}
