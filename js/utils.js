/* ============================================================
   utils.js — Helper utilities for Kala Yatra
   ============================================================ */

/**
 * Convert a name to a URL-friendly slug
 * @param {string} text 
 * @returns {string}
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

/**
 * Debounce a function call
 * @param {Function} fn 
 * @param {number} delay - milliseconds
 * @returns {Function}
 */
export function debounce(fn, delay = 250) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Format a year into a human-readable era string
 * Handles BCE/CE notation and special cases
 * @param {number} year - Negative for BCE, positive for CE
 * @returns {string}
 */
export function formatEra(year) {
  if (year <= -1000) {
    return `${Math.abs(Math.round(year / 1000))}000 BCE`;
  }
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  if (year === 0) return '1 CE';
  return `${year} CE`;
}

/**
 * Format an era range (start–end) into a human-readable string
 * @param {{ start: number, end: number }} era 
 * @returns {string}
 */
export function formatEraRange(era) {
  return `${formatEra(era.start)} – ${formatEra(era.end)}`;
}

/**
 * Simple fuzzy match — checks if the query words appear in the target
 * @param {string} query 
 * @param {string} target 
 * @returns {boolean}
 */
export function fuzzyMatch(query, target) {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  const words = q.split(/\s+/);
  const t = target.toLowerCase();
  return words.every(w => t.includes(w));
}

/**
 * Get the display label for a category
 * @param {string} category 
 * @returns {string}
 */
export function categoryLabel(category) {
  const labels = {
    ancient: 'Ancient',
    medieval: 'Medieval Temple Art',
    miniature: 'Miniature Painting',
    folk: 'Folk & Tribal',
    colonial_modern: 'Colonial / Modern',
    contemporary: 'Contemporary'
  };
  return labels[category] || category;
}

/**
 * Get the CSS variable color for a category
 * @param {string} category 
 * @returns {string}
 */
export function categoryColor(category) {
  const colors = {
    ancient: '#B87333',
    medieval: '#8B4513',
    miniature: '#6B3FA0',
    folk: '#2E7D32',
    colonial_modern: '#37474F',
    contemporary: '#C62828'
  };
  return colors[category] || '#7A6E60';
}

/**
 * Generate a decorative SVG placeholder for artwork images
 * Creates a stylized card with geometric patterns in the category color
 * @param {string} caption 
 * @param {string} category 
 * @param {number} [index=0] - Varies the pattern
 * @returns {string} SVG data URI
 */
export function generateArtPlaceholder(caption, category, index = 0) {
  const color = categoryColor(category);
  const patterns = [
    // Pattern 1: Mandala-inspired concentric circles
    `<circle cx="120" cy="70" r="45" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.3"/>
     <circle cx="120" cy="70" r="30" fill="none" stroke="${color}" stroke-width="1" opacity="0.4"/>
     <circle cx="120" cy="70" r="15" fill="${color}" opacity="0.2"/>
     <path d="M120 25 L120 115 M75 70 L165 70 M90 40 L150 100 M150 40 L90 100" stroke="${color}" stroke-width="0.5" opacity="0.2"/>`,
    // Pattern 2: Temple-inspired geometric
    `<polygon points="120,30 160,70 120,110 80,70" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.3"/>
     <polygon points="120,45 148,70 120,95 92,70" fill="${color}" opacity="0.15"/>
     <line x1="120" y1="20" x2="120" y2="120" stroke="${color}" stroke-width="0.5" opacity="0.2"/>
     <circle cx="120" cy="70" r="8" fill="${color}" opacity="0.3"/>`,
    // Pattern 3: Paisley-inspired curves
    `<path d="M80,90 Q80,30 120,30 Q160,30 160,70 Q160,110 120,110 Q100,110 90,100" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.3"/>
     <path d="M95,85 Q95,45 120,45 Q145,45 145,70 Q145,95 120,95" fill="${color}" opacity="0.12"/>
     <circle cx="115" cy="65" r="5" fill="${color}" opacity="0.3"/>`
  ];

  const pattern = patterns[index % patterns.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="140" viewBox="0 0 240 140">
    <defs>
      <linearGradient id="bg${index}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.9"/>
      </linearGradient>
    </defs>
    <rect width="240" height="140" rx="8" fill="url(#bg${index})"/>
    ${pattern}
    <rect y="100" width="240" height="40" rx="0" fill="rgba(0,0,0,0.3)"/>
    <text x="120" y="122" text-anchor="middle" fill="white" font-family="Georgia,serif" font-size="11" font-style="italic" opacity="0.9">${escapeXml(caption.substring(0, 35))}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Escape special XML characters in a string
 * @param {string} str 
 * @returns {string}
 */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a hero background SVG for the detail panel
 * @param {string} name 
 * @param {string} category 
 * @returns {string} CSS background value
 */
export function generateHeroBg(name, category) {
  const color = categoryColor(category);
  return `linear-gradient(135deg, ${color}dd, ${color}88)`;
}
