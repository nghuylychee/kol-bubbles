// Get current active tab
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Show status message
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status status-${type}`;
  statusEl.style.display = 'block';
}

// Hide status message
function hideStatus() {
  document.getElementById('status').style.display = 'none';
}

// Update button state
function setButtonLoading(loading) {
  const btn = document.getElementById('scrapeBtn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoader = btn.querySelector('.btn-loader');
  
  if (loading) {
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
  } else {
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
  }
}

// Generate CSV content
function generateCSV(data) {
  const headers = ['id', 'name', 'link_fb', 'link_ig', 'link_tiktok'];
  const rows = data.map((item, index) => {
    return [
      index + 1,
      `"${item.name.replace(/"/g, '""')}"`,
      '',
      item.ig_username,
      ''
    ];
  });
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// Download CSV file
function downloadCSV(csvContent, filename = 'kol-data-top100.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      showStatus('Download failed: ' + chrome.runtime.lastError.message, 'error');
    } else {
      showStatus('CSV downloaded successfully!', 'success');
      URL.revokeObjectURL(url);
    }
  });
}

// Scrape button click handler
document.getElementById('scrapeBtn').addEventListener('click', async () => {
  try {
    const tab = await getCurrentTab();
    
    // Check if we're on the right page
    if (!tab.url.includes('noxinfluencer.com')) {
      showStatus('Please navigate to noxinfluencer.com first', 'error');
      return;
    }
    
    setButtonLoading(true);
    hideStatus();
    showStatus('Scraping data...', 'info');
    
    // Inject content script and scrape
    chrome.tabs.sendMessage(tab.id, { action: 'scrape' }, (response) => {
      setButtonLoading(false);
      
      if (chrome.runtime.lastError) {
        showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      if (!response || !response.success) {
        showStatus(response?.error || 'Failed to scrape data', 'error');
        return;
      }
      
      const data = response.data;
      
      if (!data || data.length === 0) {
        showStatus('No data found. Make sure you are on the ranking page.', 'error');
        return;
      }
      
      // Show results
      document.getElementById('resultCount').textContent = data.length;
      document.getElementById('results').style.display = 'block';
      document.getElementById('downloadBtn').disabled = false;
      
      // Store data for download
      window.scrapedData = data;
      
      showStatus(`Successfully scraped ${data.length} influencers!`, 'success');
    });
    
  } catch (error) {
    setButtonLoading(false);
    showStatus('Error: ' + error.message, 'error');
  }
});

// Download button click handler
document.getElementById('downloadBtn').addEventListener('click', () => {
  if (!window.scrapedData || window.scrapedData.length === 0) {
    showStatus('No data to download', 'error');
    return;
  }
  
  const csvContent = generateCSV(window.scrapedData);
  downloadCSV(csvContent);
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const tab = await getCurrentTab();
  if (!tab.url.includes('noxinfluencer.com')) {
    showStatus('Please navigate to noxinfluencer.com', 'error');
    document.getElementById('scrapeBtn').disabled = true;
  }
});

