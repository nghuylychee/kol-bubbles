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
 * Fetch image as blob and convert to data URL
 * This bypasses CORS by fetching through our proxy
 * @param {string} url - Image URL
 * @returns {Promise<string|null>} Data URL or null if failed
 */
export async function fetchImageAsBlob(url) {
  if (!url) return null;
  
  try {
    // Try multiple CORS proxy services as fallback
    const proxyServices = [
      // Service 1: allorigins.win (via Vite proxy)
      () => fetchWithTimeout(`/api/image-proxy?url=${encodeURIComponent(url)}`, 8000),
      // Service 2: corsproxy.io (direct)
      () => fetchWithTimeout(`https://corsproxy.io/?${encodeURIComponent(url)}`, 8000),
      // Service 3: api.allorigins.win (direct)
      () => fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, 8000)
    ];

    let lastError = null;
    for (let i = 0; i < proxyServices.length; i++) {
      try {
        const response = await proxyServices[i]();
        
        if (response.ok) {
          const blob = await response.blob();
          // Verify it's actually an image
          if (blob.type.startsWith('image/') && blob.size > 0) {
            return URL.createObjectURL(blob);
          } else {
            console.warn(`Proxy ${i + 1} returned invalid image blob`);
          }
        } else {
          console.warn(`Proxy ${i + 1} returned status: ${response.status}`);
        }
      } catch (error) {
        lastError = error;
        // Continue to next proxy
        continue;
      }
    }
    
    console.warn(`All proxies failed for image: ${url.substring(0, 50)}...`, lastError?.message || 'Unknown error');
    return null;
  } catch (error) {
    console.warn('Error fetching image as blob:', error);
    return null;
  }
}

