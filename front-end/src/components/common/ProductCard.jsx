import { NavLink, useNavigate } from "react-router";
import { imgUrl } from "../../utils/image";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";

function Stars({ value = 4.5 }) {
  const full = Math.floor(value), half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5 text-yellow-500 text-xs">
      {Array.from({ length: 5 }).map((_, i) => (<span key={i}>{i < full ? "★" : i === full && half ? "☆" : "☆"}</span>))}
      <span className="text-[11px] text-gray-500 ml-1">{value.toFixed(1)}</span>
    </div>
  );
}

export default function ProductCard({ p }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const finalPrice = p.price - Math.floor((p.price * (p.discount || 0)) / 100);
  const hasDiscount = (p.discount || 0) > 0;
  const liked = isFavorite?.(p.product_id);

  const handleFavorite = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      const redirect = `/product/${p.product_id}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    try {
      await toggleFavorite?.(p.product_id);
    } catch (error) {
      alert(error?.message || "Unable to update favorites");
    }
  };

  return (
    <div className="group rounded-2xl border hover:shadow-md transition overflow-hidden bg-white">
      <div className="relative">
        <NavLink to={`/product/${p.product_id}`} className="block aspect-square overflow-hidden">
          <img
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            src={imgUrl(p.thumbnail)}
            alt={p.title}
            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/600?text=No+Image"; }}
          />
        </NavLink>
        <button
          type="button"
          aria-label={liked ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={liked}
          onClick={handleFavorite}
          className={`absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow transition hover:scale-105 ${
            liked ? "text-red-500" : ""
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>
      <div className="p-3">
        <NavLink to={`/product/${p.product_id}`} className="font-semibold line-clamp-1 hover:underline">
          {p.title}
        </NavLink>
        <div className="mt-1"><Stars value={4.5} /></div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-bold">{finalPrice.toLocaleString()}₫</span>
          {hasDiscount && <span className="text-xs line-through text-gray-500">{p.price.toLocaleString()}₫</span>}
          {hasDiscount && <span className="text-xs text-red-500">-{p.discount}%</span>}
        </div>
      </div>
    </div>
  );
}
