/**
 * Avatar cache utility
 * Caches loaded avatar images as blob URLs to avoid re-fetching
 */

const avatarCache = new Map();

/**
 * Get cached avatar URL
 * @param {string} avatarUrl - Original avatar URL
 * @returns {string|null} Cached blob URL or null
 */
export function getCachedAvatar(avatarUrl) {
  if (!avatarUrl) return null;
  return avatarCache.get(avatarUrl) || null;
}

/**
 * Cache avatar URL
 * @param {string} avatarUrl - Original avatar URL
 * @param {string} blobUrl - Blob URL to cache
 */
export function cacheAvatar(avatarUrl, blobUrl) {
  if (avatarUrl && blobUrl) {
    avatarCache.set(avatarUrl, blobUrl);
  }
}

/**
 * Clear avatar cache
 */
export function clearAvatarCache() {
  // Revoke all blob URLs before clearing
  avatarCache.forEach(blobUrl => {
    if (blobUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        // Ignore errors
      }
    }
  });
  avatarCache.clear();
}

