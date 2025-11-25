/**
 * Avatar cache utility
 * Caches loaded avatar images as blob URLs to avoid re-fetching
 */

const avatarCache = new Map();

/**
 * Avatar loading queue with concurrency control
 * Maximum 2 avatars loading in parallel with delay between requests
 */
class AvatarLoadQueue {
  constructor(maxConcurrency = 2, delayMs = 500) {
    this.queue = [];
    this.active = 0;
    this.maxConcurrency = maxConcurrency;
    this.delayMs = delayMs; // Delay between requests to avoid rate limiting
    this.lastRequestTime = 0;
  }

  /**
   * Add avatar loading task to queue
   * @param {Function} loadFn - Function that returns a Promise to load the avatar
   * @returns {Promise} Promise that resolves when avatar is loaded
   */
  async add(loadFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        loadFn,
        resolve,
        reject
      });
      this.process();
    });
  }

  /**
   * Process queue - start loading avatars up to maxConcurrency
   */
  async process() {
    if (this.active >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    // Add delay between requests to avoid rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.delayMs) {
      const waitTime = this.delayMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.active++;
    this.lastRequestTime = Date.now();
    const task = this.queue.shift();

    try {
      const result = await task.loadFn();
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this.active--;
      // Process next task in queue
      this.process();
    }
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
    this.active = 0;
    this.lastRequestTime = 0;
  }
}

// Global avatar loading queue instance - max 2 concurrent, 500ms delay
const avatarLoadQueue = new AvatarLoadQueue(2, 500);

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

/**
 * Load avatar through queue with concurrency control
 * @param {string} avatarUrl - Original avatar URL
 * @param {Function} loadFn - Function that loads the avatar (returns Promise)
 * @returns {Promise<string|null>} Blob URL, original URL, or null if failed
 */
export async function loadAvatarWithQueue(avatarUrl, loadFn) {
  if (!avatarUrl) return null;
  
  // Check cache first
  const cached = getCachedAvatar(avatarUrl);
  if (cached) {
    return cached;
  }

  // Load through queue
  try {
    const blobUrl = await avatarLoadQueue.add(loadFn);
    if (blobUrl) {
      cacheAvatar(avatarUrl, blobUrl);
      return blobUrl;
    }
    return null;
  } catch (error) {
    console.warn(`Failed to load avatar: ${avatarUrl}`, error);
    return null;
  }
}

/**
 * Clear avatar loading queue
 */
export function clearAvatarQueue() {
  avatarLoadQueue.clear();
}

