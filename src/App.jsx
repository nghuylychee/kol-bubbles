import { useState, useEffect, useMemo } from 'react';
import './App.css';
import Header from './components/Header';
import BubbleChart3D from './components/BubbleChart3D';
import BubbleChart3DSimple from './components/BubbleChart3DSimple';
import BubbleChartFallback from './components/BubbleChartFallback';
import SimpleThree from './components/SimpleThree';
import ErrorBoundary from './components/ErrorBoundary';
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
  const [renderMode, setRenderMode] = useState('fallback'); // Start with fallback to ensure something shows
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

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

    return result;
  }, [kolData, searchQuery, filterValue]);

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
          {/* Mode selector */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 10,
            display: 'flex',
            gap: '5px'
          }}>
            <button
              onClick={() => setRenderMode('physics')}
              style={{
                padding: '6px 8px',
                background: renderMode === 'physics' ? '#5865F2' : '#202225',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              Physics
            </button>
            <button
              onClick={() => setRenderMode('3d')}
              style={{
                padding: '6px 8px',
                background: renderMode === '3d' ? '#5865F2' : '#202225',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              3D Full
            </button>
            <button
              onClick={() => setRenderMode('simple')}
              style={{
                padding: '6px 8px',
                background: renderMode === 'simple' ? '#5865F2' : '#202225',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              Test 3D
            </button>
            <button
              onClick={() => setRenderMode('fallback')}
              style={{
                padding: '6px 8px',
                background: renderMode === 'fallback' ? '#5865F2' : '#202225',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              2D Safe
            </button>
          </div>

          {renderMode === 'physics' && (
            <ErrorBoundary>
              <BubbleChart3DSimple
                data={filteredData.map(kol => ({
                  scale: Math.max(0.5, Math.min(2, (kol.total_followers / 1000000))),
                  text: kol.name.length > 10 ? kol.name.substring(0, 8) + '..' : kol.name,
                  color: kol.color,
                  name: kol.name,
                  total_followers: kol.total_followers
                }))}
                width={chartWidth}
                height={chartHeight}
              />
            </ErrorBoundary>
          )}

          {renderMode === '3d' && (
            <ErrorBoundary>
              <BubbleChart3D
                data={filteredData.map(kol => ({
                  image: null, // Skip images to avoid CORS errors
                  scale: Math.max(0.5, Math.min(2, (kol.total_followers / 1000000))), // Scale based on followers
                  text: kol.name.length > 10 ? kol.name.substring(0, 8) + '..' : kol.name,
                  color: kol.color,
                  name: kol.name,
                  total_followers: kol.total_followers,
                  ...kol
                }))}
                onBubbleClick={handleBubbleClick}
                width={chartWidth}
                height={chartHeight}
              />
            </ErrorBoundary>
          )}
          
          {renderMode === 'simple' && (
            <ErrorBoundary>
              <SimpleThree
                width={chartWidth}
                height={chartHeight}
              />
            </ErrorBoundary>
          )}
          
          {renderMode === 'fallback' && (
            <BubbleChartFallback
              data={filteredData}
              onBubbleClick={handleBubbleClick}
              width={chartWidth}
              height={chartHeight}
            />
          )}
          
          {/* Debug info */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 10
          }}>
            <div>Mode: {renderMode}</div>
            <div>Data: {filteredData?.length || 0} items</div>
            <div>Size: {chartWidth}x{chartHeight}</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
          </div>
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
