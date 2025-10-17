import ProductCard from "./ProductCard";
export default function ProductGrid({ title, items, cta="View All" }){
  return (
    <section className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">{title}</h2>
        <button className="px-4 py-2 rounded-full border hover:bg-gray-100">{cta}</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {items.map(p => <ProductCard key={p.id} p={p}/>)}
      </div>
    </section>
  );
}
