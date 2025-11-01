function Stars({ value = 4 }) {
  const full = Math.floor(value), half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-1 text-yellow-500 text-sm">
      {Array.from({ length: 5 }).map((_, i) => <span key={i}>{i < full ? "★" : (i === full && half) ? "☆" : "☆"}</span>)}
      <span className="ml-1 text-xs text-gray-500">{value.toFixed(1)}</span>
    </div>
  );
}

export default function ReviewCard({ r }) {
  return (
    <div className="rounded-2xl border p-4 bg-white">
      <Stars value={r.rating || 4}/>
      <div className="mt-1 font-medium">{r.title || "Untitled"}</div>
      <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{r.content}</p>
      <div className="text-xs text-gray-400 mt-3">By User #{r.user_id} • {new Date(r.created_at).toLocaleDateString()}</div>
    </div>
  );
}
