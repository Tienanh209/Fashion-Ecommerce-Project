function Pagination({ page, lastPage, onChange }) {
  if (!lastPage || lastPage <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <button
        className="px-3 py-1 border rounded disabled:opacity-50"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      {Array.from({ length: lastPage }).map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i + 1)}
          className={`h-9 w-9 rounded-full border text-sm ${page === i + 1 ? "bg-black text-white" : "hover:bg-gray-50"}`}
        >
          {i + 1}
        </button>
      ))}
      <button
        className="px-3 py-1 border rounded disabled:opacity-50"
        disabled={page >= lastPage}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

export default Pagination