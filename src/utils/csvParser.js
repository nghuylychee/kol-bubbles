import Papa from 'papaparse';
import { generateMockFollowers, getBubbleColor, getSnakeColor, getInitials } from './mockData.js';
import { 
  extractInstagramUrl,
  extractInstagramUsername,
  convertUsernameToUrl,
  fetchInstagramData, 
  mapApifyResultsToKOLs 
} from './apifyService.js';
import { saveKOLDataCache, loadKOLDataCache, downloadKOLDataAsCSV } from './dataCache.js';

/**
 * Parse CSV file and enrich with mock follower data (NO Apify call)
 * @param {string} csvContent - CSV file content as string
 * @returns {Promise<Array>} Array of KOL objects with mock follower data
 */
export async function parseKOLDataMock(csvContent) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          // First pass: collect all follower counts to calculate min/max
          const followerCounts = results.data.map((row) => {
            const kolId = parseInt(row.id);
            const mockData = generateMockFollowers(kolId);
            return mockData.followers_ig;
          });
          const minFollowers = Math.min(...followerCounts);
          const maxFollowers = Math.max(...followerCounts);
          
          console.log('🎨 [MOCK] Green Color Scaling:', { 
            minFollowers, 
            maxFollowers, 
            range: maxFollowers - minFollowers,
            sampleColors: {
              min: getBubbleColor(minFollowers, minFollowers, maxFollowers),
              mid: getBubbleColor((minFollowers + maxFollowers) / 2, minFollowers, maxFollowers),
              max: getBubbleColor(maxFollowers, minFollowers, maxFollowers)
            }
          });

          const kolData = results.data.map((row) => {
            const kolId = parseInt(row.id);
            const mockData = generateMockFollowers(kolId);
            
            // TEMPORARILY DISABLED: Facebook and TikTok
            const fbFollowers = 0; // DISABLED
            const tiktokFollowers = 0; // DISABLED
            const totalFollowers = mockData.followers_ig; // Instagram only
            
            return {
              id: kolId,
              name: row.name,
              link_fb: row.link_fb || '',
              link_ig: row.link_ig || '',
              link_tiktok: row.link_tiktok || '',
              followers_fb: fbFollowers,
              followers_ig: mockData.followers_ig,
              followers_tiktok: tiktokFollowers,
              total_followers: totalFollowers,
              avatar_url: null,
              bubbleColor: getBubbleColor(totalFollowers, minFollowers, maxFollowers),
              snakeColor: getSnakeColor(kolId),
              color: getBubbleColor(totalFollowers, minFollowers, maxFollowers), // Default for bubble mode
              initials: getInitials(row.name)
            };
          });

          resolve(kolData);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Parse CSV file and enrich with follower data (Apify for IG, mock for FB/TikTok)
 * @param {string} csvContent - CSV file content as string
 * @param {boolean} useApify - Whether to fetch real data from Apify (default: true)
 * @returns {Promise<Array>} Array of KOL objects with follower data
 */
export async function parseKOLData(csvContent, useApify = true) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Parse basic KOL data from CSV
          const kolData = results.data.map((row) => {
            const kolId = parseInt(row.id);
            return {
              id: kolId,
              name: row.name,
              link_fb: row.link_fb || '',
              link_ig: row.link_ig || '',
              link_tiktok: row.link_tiktok || ''
            };
          });

          // Extract Instagram usernames and convert to URLs for API calls
          let igDataMap = {}; // Now contains {followersCount, avatar_url}
          if (useApify) {
            try {
              // Fetch data for ALL KOLs
              // Extract usernames from CSV (format: "@username" or "username")
              const instagramUsernames = kolData
                .map(kol => extractInstagramUsername(kol.link_ig))
                .filter(username => username !== null);

              // Convert usernames to full URLs for Apify API
              const instagramUrls = instagramUsernames
                .map(username => convertUsernameToUrl(username))
                .filter(url => url !== null);

              if (instagramUrls.length > 0) {
                console.log(`Fetching Instagram data for ${instagramUrls.length} KOLs...`);
                const apifyResults = await fetchInstagramData(instagramUrls);
                
                if (apifyResults && apifyResults.length > 0) {
                  igDataMap = mapApifyResultsToKOLs(apifyResults, kolData);
                  console.log(`Successfully fetched Instagram data for ${Object.keys(igDataMap).length} KOLs`);
                } else {
                  console.warn('No Instagram data returned from Apify, using cached/mock data');
                }
              } else {
                console.warn('No valid Instagram URLs found, using cached/mock data');
              }
            } catch (error) {
              console.error('Error fetching Instagram data from Apify, falling back to cached/mock data:', error);
              // Continue with cached/mock data fallback
            }
          }

          // Load cached data to merge with fetched data
          const cachedData = loadKOLDataCache();
          const cachedMap = cachedData ? new Map(cachedData.map(kol => [kol.id, kol])) : new Map();

          // Calculate min/max for dynamic color scaling
          const allFollowers = kolData.map(kol => {
            const kolId = kol.id;
            const cachedKol = cachedMap.get(kolId);
            const fetchedData = igDataMap[kolId];
            
            if (fetchedData) {
              return fetchedData.followersCount;
            } else if (cachedKol && cachedKol.followers_ig) {
              return cachedKol.followers_ig;
            } else {
              return generateMockFollowers(kolId).followers_ig;
            }
          });
          const minFollowers = Math.min(...allFollowers);
          const maxFollowers = Math.max(...allFollowers);
          
          console.log('🎨 [REAL] Green Color Scaling:', { 
            minFollowers, 
            maxFollowers, 
            range: maxFollowers - minFollowers,
            sampleColors: {
              min: getBubbleColor(minFollowers, minFollowers, maxFollowers),
              mid: getBubbleColor((minFollowers + maxFollowers) / 2, minFollowers, maxFollowers),
              max: getBubbleColor(maxFollowers, minFollowers, maxFollowers)
            }
          });

          // Enrich KOL data with followers, avatar, and Instagram URL
          const enrichedData = kolData.map((kol) => {
            const kolId = kol.id;
            const cachedKol = cachedMap.get(kolId);
            const fetchedData = igDataMap[kolId];
            
            // Priority: 1. Fetched data, 2. Cached data, 3. Mock data
            let igFollowers;
            let avatar_url = null;
            let ig_url = null;
            
            if (fetchedData) {
              // Use freshly fetched data
              igFollowers = fetchedData.followersCount;
              avatar_url = fetchedData.avatar_url || null;
              ig_url = fetchedData.ig_url || null;
            } else if (cachedKol && cachedKol.followers_ig) {
              // Use cached data
              igFollowers = cachedKol.followers_ig;
              avatar_url = cachedKol.avatar_url || null;
              ig_url = cachedKol.link_ig || null;
            } else {
              // Fallback to mock data
              igFollowers = generateMockFollowers(kolId).followers_ig;
              avatar_url = null;
              // Keep original link_ig from CSV
              ig_url = kol.link_ig ? (kol.link_ig.startsWith('@') ? `https://www.instagram.com/${kol.link_ig.replace(/^@/, '')}/` : kol.link_ig) : null;
            }

            // TEMPORARILY DISABLED: Facebook and TikTok
            const fbFollowers = cachedKol?.followers_fb || 0; // Use cached if available
            const tiktokFollowers = cachedKol?.followers_tiktok || 0; // Use cached if available
            
            // Total followers = Instagram only (for now)
            const totalFollowers = igFollowers;
            
            // Always recalculate color based on current min/max (don't use cached color)
            const bubbleColor = getBubbleColor(totalFollowers, minFollowers, maxFollowers);

            return {
              ...kol,
              link_ig: ig_url || kol.link_ig, // Update link_ig with full URL from Apify if available
              followers_fb: fbFollowers,
              followers_ig: igFollowers,
              followers_tiktok: tiktokFollowers,
              total_followers: totalFollowers,
              avatar_url: avatar_url,
              bubbleColor: bubbleColor,
              snakeColor: getSnakeColor(kol.id),
              color: bubbleColor, // Always use newly calculated color (for bubble mode)
              initials: getInitials(kol.name)
            };
          });

          // Save to cache after successful fetch
          if (useApify && Object.keys(igDataMap).length > 0) {
            saveKOLDataCache(enrichedData);
            // Also download CSV file
            try {
              downloadKOLDataAsCSV(enrichedData, 'kol-data-fetched.csv');
            } catch (error) {
              console.warn('Could not download CSV file:', error);
            }
          }

          resolve(enrichedData);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Parse CSV file that already has follower data (from kol-data-fetched.csv)
 * @param {string} csvContent - CSV file content as string
 * @returns {Promise<Array>} Array of KOL objects with existing follower data
 */
export async function parseKOLDataFetched(csvContent) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          // Parse data from CSV that already has follower counts and avatar URLs
          const kolData = results.data.map((row) => {
            const kolId = parseInt(row.id);
            const followers_ig = parseInt(row.followers_ig) || 0;
            const followers_fb = parseInt(row.followers_fb) || 0;
            const followers_tiktok = parseInt(row.followers_tiktok) || 0;
            const total_followers = parseInt(row.total_followers) || followers_ig;
            
            return {
              id: kolId,
              name: row.name,
              link_fb: row.link_fb || '',
              link_ig: row.link_ig || '',
              link_tiktok: row.link_tiktok || '',
              followers_fb: followers_fb,
              followers_ig: followers_ig,
              followers_tiktok: followers_tiktok,
              total_followers: total_followers,
              avatar_url: row.avatar_url || null,
              initials: getInitials(row.name)
            };
          });

          // Calculate min/max for dynamic color scaling
          const minFollowers = Math.min(...kolData.map(d => d.total_followers));
          const maxFollowers = Math.max(...kolData.map(d => d.total_followers));

          console.log('🎨 [FETCHED CSV] Green Color Scaling:', { 
            minFollowers, 
            maxFollowers, 
            range: maxFollowers - minFollowers,
            sampleColors: {
              min: getBubbleColor(minFollowers, minFollowers, maxFollowers),
              mid: getBubbleColor((minFollowers + maxFollowers) / 2, minFollowers, maxFollowers),
              max: getBubbleColor(maxFollowers, minFollowers, maxFollowers)
            }
          });

          // Add colors to data
          const enrichedData = kolData.map(d => ({
            ...d,
            bubbleColor: getBubbleColor(d.total_followers, minFollowers, maxFollowers),
            snakeColor: getSnakeColor(d.id),
            color: getBubbleColor(d.total_followers, minFollowers, maxFollowers) // Default for bubble mode
          }));

          resolve(enrichedData);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Load and parse KOL data from CSV file with mock data only (NO Apify call)
 * Priority: 1. kol-data-fetched.csv (always fresh), 2. kol-data.csv (mock), 3. Cached data (fallback)
 * @returns {Promise<Array>} Array of KOL objects with mock data or cached data
 */
export async function loadKOLDataMock() {
  try {
    // Try to load from kol-data-fetched.csv first (ALWAYS fresh, no cache)
    try {
      // Add timestamp to prevent browser caching
      const timestamp = new Date().getTime();
      const fetchedResponse = await fetch(`${import.meta.env.BASE_URL}kol-data-fetched.csv?t=${timestamp}`);
      if (fetchedResponse.ok) {
        const fetchedCsvContent = await fetchedResponse.text();
        
        // Check if file has actual data (not empty or just headers)
        const lines = fetchedCsvContent.trim().split('\n');
        if (lines.length > 1) {
          console.log('✅ Loading fresh data from kol-data-fetched.csv');
          const fetchedData = await parseKOLDataFetched(fetchedCsvContent);
          
          // Save to cache for offline fallback
          saveKOLDataCache(fetchedData);
          
          return fetchedData;
        }
      }
    } catch (error) {
      console.log('⚠️ kol-data-fetched.csv not found or error, trying fallback...');
    }

    // Fallback to kol-data.csv with mock data
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`${import.meta.env.BASE_URL}kol-data.csv?t=${timestamp}`);
      if (response.ok) {
        console.log('📄 Loading from kol-data.csv (mock data)');
        const csvContent = await response.text();
        const mockData = await parseKOLDataMock(csvContent);
        
        // Save mock data to cache for future use
        saveKOLDataCache(mockData);
        
        return mockData;
      }
    } catch (error) {
      console.log('⚠️ kol-data.csv not found, trying cached data...');
    }

    // Last resort: use cached data if available
    const cachedData = loadKOLDataCache();
    if (cachedData && cachedData.length > 0) {
      console.log(`💾 Using cached data as last resort (${cachedData.length} KOLs)`);
      
      // Recalculate colors based on current min/max (always fresh, never from cache)
      const minFollowers = Math.min(...cachedData.map(d => d.total_followers));
      const maxFollowers = Math.max(...cachedData.map(d => d.total_followers));
      
      console.log('🎨 [CACHED] Green Color Scaling:', { 
        minFollowers, 
        maxFollowers, 
        range: maxFollowers - minFollowers
      });
      
      // Return cached data with recalculated colors
      return cachedData.map(d => ({
        ...d,
        color: getBubbleColor(d.total_followers, minFollowers, maxFollowers)
      }));
    }

    // If nothing works, throw error
    throw new Error('No data source available (CSV files not found and no cache)');
  } catch (error) {
    console.error('❌ Error loading KOL data:', error);
    throw error;
  }
}

/**
 * Load and parse KOL data from CSV file with Apify API call
 * @param {boolean} useApify - Whether to fetch real data from Apify (default: true)
 * @returns {Promise<Array>} Array of KOL objects
 */
export async function loadKOLData(useApify = true) {
  try {
    // Add timestamp to prevent browser caching
    const timestamp = new Date().getTime();
    const response = await fetch(`${import.meta.env.BASE_URL}kol-data.csv?t=${timestamp}`);
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.statusText}`);
    }
    const csvContent = await response.text();
    return await parseKOLData(csvContent, useApify);
  } catch (error) {
    console.error('Error loading KOL data:', error);
    throw error;
  }
}

