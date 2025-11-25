// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    scrapeInfluencers()
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates we will send a response asynchronously
  }
});

// Main scraping function
async function scrapeInfluencers() {
  // Wait for page to load
  await waitForPageLoad();
  
  const influencers = [];
  
  // Find all title elements (names)
  const titleElements = document.querySelectorAll('a.title.ellipsis, .title.ellipsis');
  
  // Find all alias elements (Instagram usernames)
  const aliasElements = document.querySelectorAll('div.alias, .alias');
  
  console.log(`Found ${titleElements.length} titles and ${aliasElements.length} aliases`);
  
  // Match titles with aliases
  // Find common container that contains both title and alias
  titleElements.forEach((titleEl, index) => {
    if (influencers.length >= 100) return; // Limit to 100
    
    try {
      const name = titleEl.textContent.trim();
      
      if (!name) return;
      
      // Find the corresponding alias
      let aliasEl = null;
      
      // Strategy 1: Find alias in the same container (row/item)
      // Look for common parent that might contain both
      let container = titleEl.closest('tr, div[class*="row"], div[class*="item"], div[class*="card"], li, article');
      
      if (container) {
        aliasEl = container.querySelector('div.alias, .alias');
      }
      
      // Strategy 2: If not found, look in parent elements
      if (!aliasEl) {
        let current = titleEl.parentElement;
        let depth = 0;
        while (current && depth < 5 && !aliasEl) {
          aliasEl = current.querySelector('div.alias, .alias');
          if (!aliasEl) {
            current = current.parentElement;
            depth++;
          }
        }
      }
      
      // Strategy 3: Use alias at the same index (if they're in parallel structures)
      if (!aliasEl && index < aliasElements.length) {
        aliasEl = aliasElements[index];
      }
      
      let igUsername = '';
      if (aliasEl) {
        const aliasText = aliasEl.textContent.trim();
        // Extract @username from alias text (remove whitespace and @ if already present)
        const cleaned = aliasText.replace(/\s+/g, '').trim();
        const match = cleaned.match(/@?([a-zA-Z0-9._]+)/);
        if (match) {
          igUsername = `@${match[1]}`;
        }
      }
      
      // Only add if we have both name and username
      if (name && igUsername) {
        influencers.push({
          name: name,
          ig_username: igUsername
        });
      } else {
        console.warn(`Missing data for: ${name} (username: ${igUsername})`);
      }
    } catch (error) {
      console.warn('Error extracting data:', error);
    }
  });
  
  // If we still don't have enough data, try alternative approach
  if (influencers.length === 0) {
    console.log('Trying alternative extraction method...');
    influencers.push(...extractFromPageStructure());
  }
  
  console.log(`Scraped ${influencers.length} influencers`);
  return influencers;
}

// Alternative extraction method - scan entire page structure
// This is a fallback if the main method doesn't work
function extractFromPageStructure() {
  const influencers = [];
  const seen = new Set();
  
  // Find all title elements
  const titles = document.querySelectorAll('a.title.ellipsis, .title.ellipsis');
  const aliases = document.querySelectorAll('div.alias, .alias');
  
  // Try to match them by proximity
  titles.forEach((titleEl, index) => {
    if (influencers.length >= 100) return;
    
    const name = titleEl.textContent.trim();
    if (!name) return;
    
    // Find nearest alias
    let aliasText = '';
    
    // Check if there's an alias at the same index
    if (index < aliases.length) {
      aliasText = aliases[index].textContent.trim();
    } else {
      // Find alias in the same container
      const parent = titleEl.closest('div, tr, li, article');
      if (parent) {
        const aliasEl = parent.querySelector('div.alias, .alias');
        if (aliasEl) {
          aliasText = aliasEl.textContent.trim();
        }
      }
    }
    
    // Extract username from alias
    if (aliasText) {
      const match = aliasText.match(/@?([a-zA-Z0-9._]+)/);
      if (match) {
        const username = `@${match[1]}`;
        if (!seen.has(username)) {
          seen.add(username);
          influencers.push({
            name: name,
            ig_username: username
          });
        }
      }
    }
  });
  
  return influencers;
}


// Wait for page to be fully loaded
function waitForPageLoad() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
      // Also resolve after a timeout to prevent hanging
      setTimeout(resolve, 3000);
    }
  });
}

