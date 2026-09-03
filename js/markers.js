/* ============================================================
   markers.js — Marker creation, custom icons, and clustering
   ============================================================ */

import { categoryColor } from './utils.js';

/**
 * SVG icon templates for different art form types.
 * Each returns an inline SVG string sized for the marker.
 */
const ICON_SVGS = {
  // Paintbrush — for painting traditions
  painting: `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.71 4.04c.39-.39.39-1.02 0-1.41l-1.34-1.34a1 1 0 00-1.41 0L9 10.25 13.75 15l6.96-6.96zM7 14a3 3 0 00-3 3c0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2a4 4 0 004-4 3 3 0 00-3-3z"/>
  </svg>`,

  // Temple — for architectural sites
  temple: `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3 9v1h2v9H3v1h18v-1h-2v-9h2V9L12 2zm5 17H7v-9.45l5-3.89 5 3.89V19zm-6-4h2v4h-2v-4zm-2-2a2 2 0 114 0H9z"/>
  </svg>`,

  // Sculpture — for sculptural traditions
  sculpture: `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C9.24 2 7 4.24 7 7c0 1.64.8 3.09 2.03 4H7v2h2v7h2v-3h2v3h2v-7h-2.03A4.98 4.98 0 0017 7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/>
  </svg>`,

  // Scroll — for folk/scroll painting traditions
  scroll: `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 12h2v5H7v-5zm4-3h2v8h-2V9zm4-2h2v10h-2V7z"/>
  </svg>`,

  // Palette — for modern/contemporary art
  palette: `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10a2.5 2.5 0 002.5-2.5c0-.61-.23-1.21-.64-1.67A.528.528 0 0114 17.5a.5.5 0 01.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zM5.5 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-4a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3 4a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
  </svg>`,

  // Camera — for photography/contemporary (fallback)
  camera: `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 10.8a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
  </svg>`
};

/**
 * Create a Leaflet DivIcon for a given art category and icon type.
 * @param {string} category - e.g. 'ancient', 'medieval'
 * @param {string} iconType - e.g. 'painting', 'temple', 'sculpture'
 * @returns {L.DivIcon}
 */
export function createIcon(category, iconType) {
  const svgContent = ICON_SVGS[iconType] || ICON_SVGS.painting;
  
  const html = `
    <div class="marker-inner">
      ${svgContent}
    </div>
  `;

  return L.divIcon({
    className: `art-marker marker-${category}`,
    html: html,
    iconSize: [38, 44],
    iconAnchor: [19, 44],
    popupAnchor: [0, -44]
  });
}

/**
 * Create a custom cluster icon styled as a terracotta medallion.
 * @param {L.MarkerCluster} cluster 
 * @returns {L.DivIcon}
 */
function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count < 5 ? 44 : count < 10 ? 50 : 56;

  return L.divIcon({
    className: 'marker-cluster-custom',
    html: `<span class="cluster-count">${count}</span>`,
    iconSize: [size, size]
  });
}

/**
 * Build all markers from location data and add them to a MarkerClusterGroup.
 * Returns the cluster group and a map of locationId → marker for direct access.
 * 
 * @param {Array} locations - Array of location objects from JSON
 * @param {L.Map} map - The Leaflet map instance
 * @param {Function} onMarkerClick - Callback when a marker is clicked, receives (location, marker)
 * @returns {{ clusterGroup: L.MarkerClusterGroup, markerMap: Map<string, L.Marker> }}
 */
export function buildMarkers(locations, map, onMarkerClick) {
  // Create cluster group with custom styling
  const clusterGroup = L.markerClusterGroup({
    iconCreateFunction: createClusterIcon,
    maxClusterRadius: 45,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    animate: true,
    animateAddingMarkers: true,
    disableClusteringAtZoom: 8
  });

  const markerMap = new Map();

  locations.forEach(loc => {
    const icon = createIcon(loc.category, loc.icon);
    const marker = L.marker([loc.lat, loc.lng], { icon });

    // Store location data on the marker for easy access
    marker.locationData = loc;

    // Tooltip on hover showing location name
    marker.bindTooltip(loc.name, {
      className: 'marker-tooltip',
      direction: 'top',
      offset: [0, -48]
    });

    // Click handler
    marker.on('click', () => {
      if (onMarkerClick) onMarkerClick(loc, marker);
    });

    clusterGroup.addLayer(marker);
    markerMap.set(loc.id, marker);
  });

  map.addLayer(clusterGroup);

  return { clusterGroup, markerMap };
}

/**
 * Highlight a specific marker with a bounce animation.
 * @param {L.Marker} marker 
 */
export function highlightMarker(marker) {
  const el = marker.getElement();
  if (el) {
    el.classList.add('marker-highlight');
    setTimeout(() => el.classList.remove('marker-highlight'), 1500);
  }
}
