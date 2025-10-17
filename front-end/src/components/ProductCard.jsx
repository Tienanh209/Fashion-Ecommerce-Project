function Stars({ value=4.5 }){
  const full = Math.floor(value), half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5 text-yellow-500 text-xs">
      {Array.from({length:5}).map((_,i)=>(<span key={i}>{i<full?'★':i===full&&half?'☆':'☆'}</span>))}
      <span className="text-[11px] text-gray-500 ml-1">{value.toFixed(1)}</span>
    </div>
  );
}
export default function ProductCard({ p }){
  return (
    <div className="group rounded-2xl border hover:shadow-md transition overflow-hidden bg-white">
      <div className="aspect-square overflow-hidden">
        <img className="w-full h-full object-cover group-hover:scale-105 transition-transform" src={p.img} alt={p.title}/>
      </div>
      <div className="p-3">
        <h3 className="font-semibold line-clamp-1">{p.title}</h3>
        <div className="mt-1"><Stars value={p.rating}/></div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-bold">{p.price.toLocaleString()}₫</span>
          {p.oldPrice && <span className="text-xs line-through text-gray-500">{p.oldPrice.toLocaleString()}₫</span>}
          {p.oldPrice && <span className="text-xs text-red-500">-{Math.round(100 - (p.price/p.oldPrice)*100)}%</span>}
        </div>
      </div>
    </div>
  );
}
