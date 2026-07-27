export default function AdminPagination({ page, totalPages, totalCount, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="admin-pagination">
      <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</button>
      <span>Page {page} of {totalPages} ({totalCount} total)</span>
      <button className="btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}
