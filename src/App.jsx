import { useState, useEffect, useMemo } from 'react';
import './App.css';
import Header from './components/Header';
import BubbleChart from './components/BubbleChart';
import BubbleDetail from './components/BubbleDetail';
import { loadKOLData, loadKOLDataMock } from './utils/csvParser';

function App() {
  const [kolData, setKolData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [selectedKol, setSelectedKol] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  // Detect mobile device
  const isMobile = windowSize.width < 768;

  // Load initial data from CSV (mock data only, NO Apify) on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // Use mock data only, no Apify API call
        const data = await loadKOLDataMock();
        setKolData(data);
        setFilteredData(data);
      } catch (error) {
        console.error('Error loading KOL data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Handle manual fetch from Apify
  const handleFetchData = async () => {
    try {
      setFetching(true);
      const data = await loadKOLData();
      setKolData(data);
      setFilteredData(data);
    } catch (error) {
      console.error('Error fetching KOL data:', error);
    } finally {
      setFetching(false);
    }
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter and search logic
  const processedData = useMemo(() => {
    let result = [...kolData];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(kol => 
        kol.name.toLowerCase().includes(query)
      );
    }

    // Sort by total followers (descending) for top N filter
    result.sort((a, b) => b.total_followers - a.total_followers);

    // Apply top N filter
    if (filterValue !== 'all') {
      const topN = parseInt(filterValue.replace('top', ''));
      if (!isNaN(topN)) {
        result = result.slice(0, topN);
      }
    }
    
    // Limit number of bubbles on mobile for better performance
    if (isMobile && filterValue === 'all') {
      // Show max 30 bubbles on mobile if "all" is selected
      result = result.slice(0, 30);
    }

    return result;
  }, [kolData, searchQuery, filterValue, isMobile]);

  // Update filtered data when processed data changes
  useEffect(() => {
    setFilteredData(processedData);
  }, [processedData]);

  // Get chart dimensions
  const chartWidth = windowSize.width;
  const chartHeight = windowSize.height - 100; // Subtract header height

  const handleBubbleClick = (kol) => {
    setSelectedKol(kol);
  };

  const handleCloseModal = () => {
    setSelectedKol(null);
  };

  if (loading) {
    return (
      <div className="app">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: '#dcddde'
        }}>
          Loading KOL data...
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filterValue={filterValue}
        onFilterChange={setFilterValue}
        onFetchData={handleFetchData}
        isFetching={fetching}
      />
      <div className="main-content">
        <div className="bubble-chart-container">
          <BubbleChart
            data={filteredData}
            onBubbleClick={handleBubbleClick}
            width={chartWidth}
            height={chartHeight}
          />
        </div>
      </div>
      {selectedKol && (
        <BubbleDetail
          kol={selectedKol}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default App;
