/**
 * Generate mock follower data for KOLs
 * @param {number} kolId - KOL ID
 * @returns {Object} Object with follower counts for each platform
 */
export function generateMockFollowers(kolId) {
  // Use kolId as seed for consistent random generation
  // Simple seeded random function
  let seed = kolId * 12345;
  const random = (min, max) => {
    seed = (seed * 9301 + 49297) % 233280;
    const value = seed / 233280;
    return Math.floor(value * (max - min + 1)) + min;
  };

  // Generate followers in ranges (in thousands)
  // TEMPORARILY DISABLED: Facebook and TikTok
  const fbFollowers = 0; // DISABLED: random(50, 2000) * 1000; // 50K - 2M
  const igFollowers = random(30, 3000) * 1000; // 30K - 3M
  const tiktokFollowers = 0; // DISABLED: random(100, 5000) * 1000; // 100K - 5M

  return {
    followers_fb: fbFollowers,
    followers_ig: igFollowers,
    followers_tiktok: tiktokFollowers,
    total_followers: fbFollowers + igFollowers + tiktokFollowers
  };
}

/**
 * Generate vibrant rainbow color based on ID for variety
 * @param {number} kolId - KOL ID for color consistency
 * @returns {string} Hex color code
 */
export function getSnakeColor(kolId) {
  // Use ID as seed for consistent random colors
  const seed = kolId * 2654435761;
  const hue = (seed % 360);
  
  // Convert HSL to RGB - vibrant colors (saturation 80-100%, lightness 50-60%)
  const saturation = 85 + ((seed >> 8) % 15); // 85-100%
  const lightness = 50 + ((seed >> 16) % 10); // 50-60%
  
  return hslToHex(hue, saturation, lightness);
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generate color for bubble based on total followers
 * Dynamic gradient from dark green (min/small) to light green (max/large)
 * @param {number} totalFollowers - Total follower count
 * @param {number} minFollowers - Minimum follower count in dataset
 * @param {number} maxFollowers - Maximum follower count in dataset
 * @returns {string} Hex color code
 */
export function getBubbleColor(totalFollowers, minFollowers = 0, maxFollowers = 10000000) {
  // If min and max are the same, return middle color (medium green)
  if (minFollowers === maxFollowers) {
    return '#32CD32'; // Lime Green
  }

  // Normalize follower count to 0-1 range
  const normalized = (totalFollowers - minFollowers) / (maxFollowers - minFollowers);
  const clamped = Math.max(0, Math.min(1, normalized)); // Clamp between 0 and 1

  // Dark Green to Light Green gradient palette (small bubbles = dark, large bubbles = light)
  const greenColors = [
    { r: 0, g: 80, b: 0 },      // Very Dark Green - min (smallest)
    { r: 0, g: 100, b: 0 },     // Dark Green (#006400)
    { r: 0, g: 128, b: 0 },     // Green (#008000)
    { r: 34, g: 139, b: 34 },   // Forest Green (#228B22)
    { r: 50, g: 205, b: 50 },   // Lime Green (#32CD32)
    { r: 124, g: 252, b: 0 },   // Lawn Green (#7CFC00)
    { r: 144, g: 238, b: 144 }  // Light Green (#90EE90) - max (largest)
  ];

  // Interpolate between colors based on normalized value
  const colorIndex = clamped * (greenColors.length - 1);
  const lowerIndex = Math.floor(colorIndex);
  const upperIndex = Math.min(lowerIndex + 1, greenColors.length - 1);
  const t = colorIndex - lowerIndex;

  const lowerColor = greenColors[lowerIndex];
  const upperColor = greenColors[upperIndex];

  // Linear interpolation
  const r = Math.round(lowerColor.r + (upperColor.r - lowerColor.r) * t);
  const g = Math.round(lowerColor.g + (upperColor.g - lowerColor.g) * t);
  const b = Math.round(lowerColor.b + (upperColor.b - lowerColor.b) * t);

  // Convert to hex
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
}

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
export function getInitials(name) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return name.substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

