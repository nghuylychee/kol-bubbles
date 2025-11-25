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
    // In development, use Vite proxy. In production (GitHub Pages), use client-side proxy
    const isDev = import.meta.env.DEV;
    let proxyUrl;
    
    if (isDev) {
      // Development: use Vite proxy
      proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
    } else {
      // Production: use client-side CORS proxy (GitHub Pages doesn't support server proxy)
      // Using allorigins.win which supports CORS
      proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    }
    
    // Try with retry logic for 429 errors
    const maxRetries = 2;
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(proxyUrl, 10000);
        
        // Handle 429 (Too Many Requests) - retry with delay
        if (response.status === 429) {
          if (attempt < maxRetries) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : 3000; // Default 3 seconds
            console.warn(`Rate limited (429), waiting ${delay}ms before retry (attempt ${attempt + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Retry
          } else {
            console.warn(`Rate limited (429) after ${maxRetries} retries`);
            return null;
          }
        }
        
        if (response.ok) {
          const blob = await response.blob();
          // Verify it's actually an image
          if (blob.type.startsWith('image/') && blob.size > 0) {
            return URL.createObjectURL(blob);
          } else {
            console.warn('Proxy returned invalid image blob');
            return null;
          }
        } else {
          console.warn(`Proxy returned status: ${response.status}`);
          if (attempt < maxRetries && response.status >= 500) {
            // Retry on server errors
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          return null;
        }
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = 1000 * Math.pow(2, attempt);
          console.warn(`Request failed, retrying in ${delay}ms...`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }
    
    console.warn(`Failed to fetch image after ${maxRetries} retries: ${url.substring(0, 50)}...`, lastError?.message || 'Unknown error');
    return null;
  } catch (error) {
    console.warn('Error fetching image as blob:', error);
    return null;
  }
}

