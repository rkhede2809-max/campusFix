const CATEGORIES = [
  'All',
  'Electrical',
  'Plumbing',
  'Cleanliness',
  'Furniture',
  'Internet',
  'Other'
];

const STATUSES = ['All', 'Pending', 'In Progress', 'Resolved'];

function FilterBar({ category, status, onCategoryChange, onStatusChange }) {
  return (
    <div className="filters">
      <select
        aria-label="Filter by category"
        value={category}
        onChange={(event) => onCategoryChange(event.target.value)}
      >
        {CATEGORIES.map((item) => (
          <option key={item} value={item}>
            {item === 'All' ? 'All categories' : item}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by status"
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
      >
        {STATUSES.map((item) => (
          <option key={item} value={item}>
            {item === 'All' ? 'All statuses' : item}
          </option>
        ))}
      </select>
    </div>
  );
}

export default FilterBar;
