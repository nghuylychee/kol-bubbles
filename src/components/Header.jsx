import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';

export default function Header({ 
  searchValue, 
  onSearchChange, 
  filterValue, 
  onFilterChange,
  onFetchData,
  isFetching,
  viewMode,
  onModeChange
}) {
  // Chỉ hiển thị button Fetch Data khi ở development mode
  const isDev = import.meta.env.DEV;
  
  return (
    <header className="header">
      <div className="header-top">
        <div className="header-left">
          <h1 className="header-title">
            {viewMode === 'bubble' ? 'KOL BUBBLES' : 'KOL SNAKES'}
          </h1>
        </div>
        <div className="header-center">
          <SearchBar 
            value={searchValue} 
            onChange={onSearchChange}
            placeholder="Search KOL..."
          />
        </div>
        <div className="header-right">
          <div className="header-controls">
            {/* View Mode Toggle */}
            <div className="mode-toggle">
              <button 
                className={`mode-button ${viewMode === 'bubble' ? 'active' : ''}`}
                onClick={() => onModeChange('bubble')}
                title="Bubble View"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.3"/>
                  <circle cx="10" cy="10" r="5" fill="currentColor"/>
                </svg>
                <span>Bubbles</span>
              </button>
              <button 
                className={`mode-button ${viewMode === 'slither' ? 'active' : ''}`}
                onClick={() => onModeChange('slither')}
                title="Slither Game"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10 Q 5 5, 10 10 T 18 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  <circle cx="18" cy="10" r="2" fill="currentColor"/>
                </svg>
                <span>Snakes</span>
              </button>
            </div>
            
            {isDev && (
              <button 
                className="fetch-button" 
                onClick={onFetchData}
                disabled={isFetching}
              >
                {isFetching ? (
                  <>
                    <span className="spinner"></span>
                    Fetching...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px' }}>
                      <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
                    </svg>
                    Fetch Data
                  </>
                )}
              </button>
            )}
            <FilterPanel value={filterValue} onChange={onFilterChange} />
            <button className="icon-button" aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 4h16M2 10h16M2 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

