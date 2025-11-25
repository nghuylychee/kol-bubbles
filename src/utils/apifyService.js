/**
 * Apify Service for fetching Instagram follower data
 */

// Use proxy in development, direct API in production (if CORS allows)
const APIFY_BASE_URL = import.meta.env.DEV 
  ? '/api/apify' 
  : 'https://api.apify.com/v2';
const ACTOR_ID = 'apify/instagram-scraper';

/**
 * Normalize Instagram URL for consistent matching
 * @param {string} url - Instagram URL
 * @returns {string} Normalized URL
 */
function normalizeInstagramUrl(url) {
  if (!url) return '';
  
  // Convert to lowercase
  let normalized = url.toLowerCase().trim();
  
  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, '');
  
  // Ensure https:// and remove www.
  normalized = normalized.replace(/^https?:\/\/(www\.)?/, 'https://');
  
  // Add trailing slash for consistency
  if (!normalized.endsWith('/')) {
    normalized += '/';
  }
  
  return normalized;
}

/**
 * Extract Instagram username from link_ig field
 * CSV format: "@username" or "username"
 * @param {string} linkIg - Instagram ID/username from CSV (e.g., "@tuilatranthanhday")
 * @returns {string|null} Instagram username without @ or null
 */
export function extractInstagramUsername(linkIg) {
  if (!linkIg || !linkIg.trim()) {
    return null;
  }

  const trimmed = linkIg.trim();
  
  // Remove @ if present
  const username = trimmed.replace(/^@/, '').trim();
  
  // Remove any URL parts if user accidentally pasted full URL
  const cleanUsername = username
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
    .replace(/\/$/, '')
    .trim();
  
  return cleanUsername || null;
}

/**
 * Convert Instagram username to full URL for API calls
 * @param {string} username - Instagram username (with or without @)
 * @returns {string} Full Instagram URL
 */
export function convertUsernameToUrl(username) {
  const cleanUsername = extractInstagramUsername(username);
  if (!cleanUsername) {
    return null;
  }
  return `https://www.instagram.com/${cleanUsername}/`;
}

/**
 * Extract Instagram URL from link_ig field (for backward compatibility)
 * @param {string} linkIg - Instagram link from CSV
 * @returns {string|null} Normalized Instagram URL or null
 */
export function extractInstagramUrl(linkIg) {
  const username = extractInstagramUsername(linkIg);
  if (!username) {
    return null;
  }
  return normalizeInstagramUrl(`https://www.instagram.com/${username}/`);
}

/**
 * Build input JSON for Apify Actor
 * @param {Array<string>} instagramUrls - Array of Instagram URLs
 * @returns {Object} Input JSON for Apify Actor
 */
export function buildApifyInput(instagramUrls) {
  return {
    addParentData: false,
    directUrls: instagramUrls,
    enhanceUserSearchWithFacebookPage: false,
    isUserReelFeedURL: false,
    isUserTaggedFeedURL: false,
    resultsLimit: 200,
    resultsType: 'details',
    searchLimit: 1,
    searchType: 'hashtag'
  };
}

/**
 * Run Apify Actor synchronously and get dataset items
 * This endpoint runs the actor and waits for it to finish, returning results directly
 * @param {string} token - Apify API token
 * @param {Object} input - Input JSON for the actor
 * @returns {Promise<Array>} Array of results
 */
async function runApifyActorSync(token, input) {
  // Use run-sync-get-dataset-items endpoint
  // Note: Actor ID needs to be URL encoded (apify/instagram-scraper -> apify~instagram-scraper)
  const actorIdEncoded = ACTOR_ID.replace(/\//g, '~');
  const url = `${APIFY_BASE_URL}/acts/${actorIdEncoded}/run-sync-get-dataset-items?token=${token}`;
  
  const headers = {
    'Content-Type': 'application/json'
  };

  // In dev mode, pass token via header for proxy instead of query param
  let finalUrl = url;
  if (import.meta.env.DEV) {
    // Remove token from URL in dev mode, use header instead
    finalUrl = `${APIFY_BASE_URL}/acts/${actorIdEncoded}/run-sync-get-dataset-items`;
    headers['X-Apify-Token'] = token;
  }

  const response = await fetch(finalUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to run Apify actor: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  // Log response structure for debugging
  console.log('Apify response structure:', {
    isArray: Array.isArray(data),
    hasData: !!data.data,
    keys: Object.keys(data),
    firstItem: Array.isArray(data) ? data[0] : (data.data && data.data[0])
  });
  
  // Handle different response formats:
  // 1. Direct array: [{...}]
  // 2. Wrapped: {data: [{...}]}
  if (Array.isArray(data)) {
    return data;
  } else if (data.data && Array.isArray(data.data)) {
    return data.data;
  } else if (data.items && Array.isArray(data.items)) {
    return data.items;
  }
  
  console.warn('Unexpected response format from Apify:', data);
  return [];
}

/**
 * Fetch Instagram follower data from Apify
 * @param {Array<string>} instagramUrls - Array of Instagram URLs
 * @returns {Promise<Array>} Array of Instagram profile data with followersCount
 */
export async function fetchInstagramData(instagramUrls) {
  const token = import.meta.env.VITE_APIFY_TOKEN;

  if (!token) {
    console.warn('VITE_APIFY_TOKEN not found. Falling back to mock data.');
    return null;
  }

  if (!instagramUrls || instagramUrls.length === 0) {
    return [];
  }

  try {
    // Build input
    const input = buildApifyInput(instagramUrls);

    // Run actor synchronously and get results directly
    console.log(`Running Apify actor for ${instagramUrls.length} Instagram profiles...`);
    console.log('Input URLs:', instagramUrls);
    const results = await runApifyActorSync(token, input);

    console.log(`Successfully fetched data for ${results.length} profiles`);
    console.log('First result sample:', results[0]);
    console.log('All results:', results);
    return results;
  } catch (error) {
    console.error('Error fetching Instagram data from Apify:', error);
    throw error;
  }
}

/**
 * Map Apify results to KOL data by matching URLs
 * @param {Array} apifyResults - Results from Apify API
 * @param {Array} kolData - KOL data from CSV
 * @returns {Object} Map of KOL ID to {followersCount, avatar_url, ig_url}
 */
export function mapApifyResultsToKOLs(apifyResults, kolData) {
  console.log('Mapping Apify results to KOLs:', {
    apifyResultsCount: apifyResults?.length || 0,
    kolDataCount: kolData?.length || 0,
    firstApifyResult: apifyResults?.[0],
    firstKolData: kolData?.[0]
  });

  const urlToDataMap = {};

  // Create a map from normalized URLs to follower counts, avatar, and Instagram URL
  if (apifyResults && Array.isArray(apifyResults)) {
    apifyResults.forEach((result, index) => {
      if (result && result.inputUrl && result.followersCount !== undefined && result.followersCount !== null) {
        // Normalize URL for matching
        const normalizedUrl = normalizeInstagramUrl(result.inputUrl);
        urlToDataMap[normalizedUrl] = {
          followersCount: result.followersCount,
          avatar_url: result.profilePicUrlHD || result.profilePicUrl || null,
          ig_url: result.url || result.inputUrl || null
        };
        console.log(`Mapped URL ${index}: ${result.inputUrl} -> ${normalizedUrl} = ${result.followersCount} followers, avatar: ${urlToDataMap[normalizedUrl].avatar_url ? 'yes' : 'no'}, ig_url: ${urlToDataMap[normalizedUrl].ig_url || 'no'}`);
      } else {
        console.warn(`Skipping invalid result at index ${index}:`, result);
      }
    });
  } else {
    console.error('apifyResults is not a valid array:', apifyResults);
  }

  console.log('URL to data map:', urlToDataMap);

  // Map back to KOLs
  const kolDataMap = {};
  kolData.forEach(kol => {
    const igUrl = extractInstagramUrl(kol.link_ig);
    if (igUrl) {
      const normalizedKolUrl = normalizeInstagramUrl(igUrl);
      if (urlToDataMap[normalizedKolUrl]) {
        kolDataMap[kol.id] = urlToDataMap[normalizedKolUrl];
        console.log(`Matched KOL ${kol.id} (${kol.name}): ${igUrl} -> ${normalizedKolUrl} = ${urlToDataMap[normalizedKolUrl].followersCount} followers`);
      } else {
        console.log(`No match for KOL ${kol.id} (${kol.name}): ${igUrl} -> ${normalizedKolUrl}`);
      }
    } else {
      console.log(`No Instagram URL for KOL ${kol.id} (${kol.name})`);
    }
  });

  console.log('Final KOL data map:', kolDataMap);
  return kolDataMap;
}

