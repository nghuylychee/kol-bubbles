/**
 * Avatar cache utility
 * Caches loaded avatar images as blob URLs to avoid re-fetching
 */

const avatarCache = new Map();

/**
 * Avatar loading queue with smart rate limiting
 * Handles 429 errors with exponential backoff
 */
class AvatarLoadQueue {
  constructor(maxConcurrency = 1, delayMs = 1000) {
    this.queue = [];
    this.active = 0;
    this.maxConcurrency = maxConcurrency;
    this.baseDelayMs = delayMs;
    this.currentDelayMs = delayMs; // Dynamic delay that increases on rate limit
    this.lastRequestTime = 0;
    this.rateLimitCount = 0; // Track consecutive rate limits
    this.lastRateLimitTime = 0;
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
   * Handle rate limit by increasing delay
   */
  handleRateLimit() {
    this.rateLimitCount++;
    this.lastRateLimitTime = Date.now();
    
    // Exponential backoff: 1s -> 2s -> 4s -> 8s (max)
    this.currentDelayMs = Math.min(
      this.baseDelayMs * Math.pow(2, this.rateLimitCount),
      8000
    );
    
    if (import.meta.env.DEV) {
      console.warn(`⚠️ Rate limited! Slowing down to ${this.currentDelayMs}ms between requests`);
    }
  }

  /**
   * Reset rate limit tracking if we've been okay for a while
   */
  resetRateLimitIfNeeded() {
    const timeSinceLastRateLimit = Date.now() - this.lastRateLimitTime;
    // Reset after 30 seconds of no rate limiting
    if (timeSinceLastRateLimit > 30000 && this.rateLimitCount > 0) {
      this.rateLimitCount = 0;
      this.currentDelayMs = this.baseDelayMs;
    }
  }

  /**
   * Process queue - start loading avatars up to maxConcurrency
   */
  async process() {
    if (this.active >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    this.resetRateLimitIfNeeded();

    // Add delay between requests to avoid rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.currentDelayMs) {
      const waitTime = this.currentDelayMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.active++;
    this.lastRequestTime = Date.now();
    const task = this.queue.shift();

    try {
      const result = await task.loadFn();
      task.resolve(result);
    } catch (error) {
      // Check if it's a rate limit error
      if (error?.statusCode === 429 || error?.message?.includes('429')) {
        this.handleRateLimit();
      }
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
    this.rateLimitCount = 0;
    this.currentDelayMs = this.baseDelayMs;
  }
}

// Global avatar loading queue instance
// Settings depend on environment:
// - Vercel: Fast (3 concurrent, 200ms delay) - own proxy is reliable
// - GitHub Pages: Conservative (1 concurrent, 1000ms delay) - public proxies have rate limits
const isVercel = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('vercel.app');
};

const avatarLoadQueue = new AvatarLoadQueue(
  isVercel() ? 3 : 1,           // maxConcurrency
  isVercel() ? 200 : 1000        // delayMs
);

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
    // Silent fail in production (rate limiting is expected)
    // Only log in development for debugging
    if (import.meta.env.DEV && error?.statusCode !== 429) {
      console.warn(`Failed to load avatar: ${avatarUrl}`, error);
    }
    return null;
  }
}

/**
 * Clear avatar loading queue
 */
export function clearAvatarQueue() {
  avatarLoadQueue.clear();
}

