/**
 * Three.js utility functions for KOL Bubbles
 */

/**
 * Calculate scale for Three.js spheres based on follower count
 * @param {number} followers - Follower count
 * @param {number} minFollowers - Minimum followers in dataset
 * @param {number} maxFollowers - Maximum followers in dataset
 * @returns {number} Scale value for Three.js object
 */
export function calculateSphereScale(followers, minFollowers, maxFollowers) {
  if (minFollowers === maxFollowers) {
    return 1.5; // Default scale if all values are the same
  }
  
  const normalized = (followers - minFollowers) / (maxFollowers - minFollowers);
  const clamped = Math.max(0, Math.min(1, normalized));
  
  // Scale from 0.5 to 3.0 for good visual range
  return 0.5 + (clamped * 2.5);
}

/**
 * Convert hex color to Three.js Color format
 * @param {string} hexColor - Hex color string (e.g., "#ff0000")
 * @returns {string} Color string for Three.js
 */
export function hexToThreeColor(hexColor) {
  return hexColor; // Three.js accepts hex strings directly
}

/**
 * Format follower count for display in Three.js Text
 * @param {number} count - Follower count
 * @returns {string} Formatted string
 */
export function formatFollowerCount(count) {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K`;
  }
  return count.toString();
}

/**
 * Truncate text for display in Three.js
 * @param {string} text - Original text
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 12) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 2) + '..';
}

/**
 * Generate random initial position for spheres
 * @param {number} spread - Position spread range
 * @returns {Array} [x, y, z] position array
 */
export function generateRandomPosition(spread = 10) {
  return [
    (Math.random() - 0.5) * spread,
    (Math.random() - 0.5) * spread,
    0
  ];
}

/**
 * Calculate viewport-based camera zoom for responsive design
 * @param {number} width - Viewport width
 * @param {number} height - Viewport height
 * @returns {number} Camera zoom value
 */
export function calculateCameraZoom(width, height) {
  const baseZoom = 30;
  const aspectRatio = width / height;
  
  // Adjust zoom based on aspect ratio and screen size
  if (width < 768) {
    return baseZoom * 0.7; // Zoom out on mobile
  } else if (aspectRatio < 1) {
    return baseZoom * 0.8; // Zoom out on portrait
  }
  
  return baseZoom;
}

/**
 * Validate KOL data for Three.js rendering
 * @param {Array} data - KOL data array
 * @returns {Array} Validated data array
 */
export function validateKOLData(data) {
  if (!Array.isArray(data)) {
    return [];
  }
  
  return data.filter(kol => 
    kol && 
    typeof kol.id !== 'undefined' && 
    typeof kol.name === 'string' && 
    typeof kol.total_followers === 'number' &&
    kol.total_followers > 0
  );
}
