import Papa from 'papaparse';

const CACHE_KEY = 'kol_data_cache';
const CACHE_TIMESTAMP_KEY = 'kol_data_cache_timestamp';

/**
 * Save KOL data to localStorage
 * @param {Array} kolData - Array of KOL objects
 */
export function saveKOLDataCache(kolData) {
  try {
    const dataToSave = {
      data: kolData,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(dataToSave));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, dataToSave.timestamp);
    console.log(`Saved ${kolData.length} KOLs to cache at ${dataToSave.timestamp}`);
    return true;
  } catch (error) {
    console.error('Error saving KOL data to cache:', error);
    return false;
  }
}

/**
 * Load KOL data from localStorage
 * @returns {Array|null} Array of KOL objects or null if not found
 */
export function loadKOLDataCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }
    
    const parsed = JSON.parse(cached);
    if (parsed && parsed.data && Array.isArray(parsed.data)) {
      console.log(`Loaded ${parsed.data.length} KOLs from cache (saved at ${parsed.timestamp})`);
      return parsed.data;
    }
    return null;
  } catch (error) {
    console.error('Error loading KOL data from cache:', error);
    return null;
  }
}

/**
 * Get cache timestamp
 * @returns {string|null} Timestamp string or null
 */
export function getCacheTimestamp() {
  try {
    return localStorage.getItem(CACHE_TIMESTAMP_KEY);
  } catch (error) {
    return null;
  }
}

/**
 * Clear KOL data cache
 */
export function clearKOLDataCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log('KOL data cache cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Convert KOL data to CSV format
 * @param {Array} kolData - Array of KOL objects
 * @returns {string} CSV content as string
 */
export function convertKOLDataToCSV(kolData) {
  const headers = ['id', 'name', 'link_fb', 'link_ig', 'link_tiktok', 'followers_fb', 'followers_ig', 'followers_tiktok', 'total_followers', 'avatar_url'];
  
  const rows = kolData.map(kol => {
    return [
      kol.id,
      `"${(kol.name || '').replace(/"/g, '""')}"`,
      kol.link_fb || '',
      kol.link_ig || '',
      kol.link_tiktok || '',
      kol.followers_fb || 0,
      kol.followers_ig || 0,
      kol.followers_tiktok || 0,
      kol.total_followers || 0,
      kol.avatar_url || ''
    ];
  });
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Download KOL data as CSV file
 * @param {Array} kolData - Array of KOL objects
 * @param {string} filename - Filename for download (default: 'kol-data-fetched.csv')
 */
export function downloadKOLDataAsCSV(kolData, filename = 'kol-data-fetched.csv') {
  try {
    const csvContent = convertKOLDataToCSV(kolData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log(`Downloaded ${kolData.length} KOLs as CSV: ${filename}`);
  } catch (error) {
    console.error('Error downloading CSV:', error);
    throw error;
  }
}

/**
 * Check if cache exists and is valid
 * @returns {boolean} True if cache exists
 */
export function hasCachedData() {
  return loadKOLDataCache() !== null;
}

