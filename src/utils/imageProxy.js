/**
 * Proxy utility for loading images from Instagram CDN
 * Fetches images through a proxy to avoid CORS issues
 */

/**
 * Check if URL is an Instagram CDN URL
 * @param {string} url - Image URL
 * @returns {boolean}
 */
export function isInstagramImage(url) {
  if (!url) return false;
  return url.includes('cdninstagram.com') || 
         url.includes('instagram.com') || 
         url.includes('fbcdn.net'); // Facebook CDN also used by Instagram
}

/**
 * Get proxied image URL
 * @param {string} url - Original image URL
 * @returns {string} Proxied URL or original URL
 */
export function getProxiedImageUrl(url) {
  if (!url) return null;
  
  // If it's an Instagram image, use proxy
  if (isInstagramImage(url)) {
    // Use Vite proxy to fetch image
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  
  // Return original URL for non-Instagram images
  return url;
}

/**
 * Fetch image with timeout
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
function fetchWithTimeout(url, timeout = 10000) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

/**
 * Multiple CORS proxy services to try (fallback chain)
 */
const CORS_PROXIES = [
  // Proxy 1: corsproxy.io - Fast and reliable
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  
  // Proxy 2: api.codetabs.com - Good alternative
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  
  // Proxy 3: cors.eu.org - European proxy
  (url) => `https://cors.eu.org/${url}`,
  
  // Proxy 4: allorigins (slower but reliable)
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

/**
 * Fetch image as blob and convert to data URL
 * This bypasses CORS by trying multiple proxy services
 * @param {string} url - Image URL
 * @returns {Promise<string|null>} Blob URL or null if failed
 */
export async function fetchImageAsBlob(url) {
  if (!url) return null;
  
  const isDev = import.meta.env.DEV;
  const isVercel = window.location.hostname.includes('vercel.app') || 
                   import.meta.env.VITE_VERCEL === 'true';
  
  // Strategy: Try different methods based on environment
  // 1. Development: Use Vite proxy
  // 2. Vercel Production: Use Vercel serverless function (fast & reliable)
  // 3. GitHub Pages: Use multiple public CORS proxies (slow but works)
  
  if (isDev) {
    // Development: Try direct fetch first, then Vite proxy
    const directResult = await tryFetchImage(url, true);
    if (directResult) return directResult;
    
    // Fallback to Vite proxy
    return await tryFetchImage(`/api/image-proxy?url=${encodeURIComponent(url)}`, false);
  } else if (isVercel) {
    // Vercel Production: Use own serverless function (best performance)
    return await tryFetchImage(`/api/image-proxy?url=${encodeURIComponent(url)}`, true);
  } else {
    // GitHub Pages: Try multiple strategies
    
    // Strategy 1: Try direct fetch (some CDNs allow CORS)
    const directResult = await tryFetchImage(url, true);
    if (directResult) return directResult;
    
    // Strategy 2: Try each CORS proxy in sequence
    for (const proxyFn of CORS_PROXIES) {
      try {
        const proxyUrl = proxyFn(url);
        const result = await tryFetchImage(proxyUrl, true);
        if (result) return result;
      } catch (error) {
        // Silent fail, try next proxy
        continue;
      }
    }
    
    // All methods failed - return null silently (no error logs)
    return null;
  }
}

/**
 * Try to fetch image from URL and convert to blob
 * @param {string} url - URL to fetch
 * @param {boolean} silent - If true, don't log errors
 * @returns {Promise<string|null>} Blob URL or null
 */
async function tryFetchImage(url, silent = false) {
  try {
    const response = await fetchWithTimeout(url, 8000);
    
    // Special handling for 429 (Too Many Requests)
    if (response.status === 429) {
      // Wait before returning null
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
      
      if (!silent && import.meta.env.DEV) {
        console.warn(`⚠️ Rate limited (429), waiting ${waitTime}ms...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Throw error so queue can handle it
      const error = new Error('Rate limited');
      error.statusCode = 429;
      throw error;
    }
    
    if (!response.ok) {
      return null;
    }
    
    const blob = await response.blob();
    
    // Verify it's actually an image
    if (blob.type.startsWith('image/') && blob.size > 0) {
      return URL.createObjectURL(blob);
    }
    
    return null;
  } catch (error) {
    // Re-throw 429 errors so queue can handle them
    if (error.statusCode === 429) {
      throw error;
    }
    
    // Only log other errors in development mode
    if (!silent && import.meta.env.DEV) {
      console.warn(`Failed to fetch image: ${url.substring(0, 60)}...`, error.message);
    }
    return null;
  }
}

