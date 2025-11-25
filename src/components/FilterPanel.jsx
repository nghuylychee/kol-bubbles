export default function FilterPanel({ value, onChange }) {
  const filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Top 5', value: 'top5' },
    { label: 'Top 10', value: 'top10' },
    { label: 'Top 20', value: 'top20' },
    { label: 'Top 30', value: 'top30' },
    { label: 'Top 50', value: 'top50' },
    { label: 'Top 100', value: 'top100' }
  ];

  return (
    <div className="filter-panel">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="filter-select"
      >
        {filterOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

