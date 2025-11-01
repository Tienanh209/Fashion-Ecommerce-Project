import { NavLink } from "react-router";
import { imgUrl } from "../../utils/image";

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
  const finalPrice = p.price - Math.floor((p.price * (p.discount || 0)) / 100);
  const hasDiscount = (p.discount || 0) > 0;

  return (
    <div className="group rounded-2xl border hover:shadow-md transition overflow-hidden bg-white">
      <NavLink to={`/product/${p.product_id}`} className="block aspect-square overflow-hidden">
        <img
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          src={imgUrl(p.thumbnail)}
          alt={p.title}
          onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/600?text=No+Image"; }}
        />
      </NavLink>
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
