import { Link } from "react-router";

export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-sm mb-4">
      <ol className="flex items-center gap-2 text-gray-500">
        {items.map((it, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-2">
              {!isLast && it.to ? (
                <Link
                  to={it.to}
                  onClick={it.onClick}
                  className="hover:text-black hover:underline"
                >
                  {it.label}
                </Link>
              ) : !isLast && it.onClick ? (
                <button
                  type="button"
                  onClick={it.onClick}
                  className="hover:text-black hover:underline"
                >
                  {it.label}
                </button>
              ) : (
                <span className="text-black font-medium truncate">{it.label}</span>
              )}
              {!isLast && <span className="select-none">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
