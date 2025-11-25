import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';

export default function Header({ 
  searchValue, 
  onSearchChange, 
  filterValue, 
  onFilterChange,
  onFetchData,
  isFetching
}) {
  return (
    <header className="header">
      <div className="header-top">
        <div className="header-left">
          <h1 className="header-title">KOL BUBBLES</h1>
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
            <FilterPanel value={filterValue} onChange={onFilterChange} />
            <button className="icon-button" aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 4h16M2 10h16M2 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="icon-button" aria-label="Settings">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 011.894.447l-.5 3a1 1 0 01-1.106.894L15 9.5V8.5a1 1 0 00-.894-.553l-3.106-1.243A1 1 0 0111 6.177V3a1 1 0 00-1-1H9a1 1 0 00-1 1v1.323L4.046 5.905l-1.599-.8a1 1 0 01.894-1.447l3 .5a1 1 0 01.553.894V6.5a1 1 0 001 1h.5l.5 3a1 1 0 01-.894 1.106L7 12.5v1a1 1 0 001 1h4a1 1 0 001-1v-1l-.447-.894a1 1 0 01.894-1.106l.5-3h.5a1 1 0 001-1V5.323l3-1.5a1 1 0 01.894.447l.5 3a1 1 0 01-1.106.894L15 9.5V8.5a1 1 0 00-.894-.553l-3.106-1.243A1 1 0 0111 6.177V3a1 1 0 00-1-1H9a1 1 0 00-1 1v1.323L4.046 5.905l-1.599-.8a1 1 0 01.894-1.447l3 .5a1 1 0 01.553.894V6.5a1 1 0 001 1h.5l.5 3a1 1 0 01-.894 1.106L7 12.5v1a1 1 0 001 1h4a1 1 0 001-1v-1l-.447-.894a1 1 0 01.894-1.106l.5-3h.5a1 1 0 001-1V5.323l3-1.5z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

