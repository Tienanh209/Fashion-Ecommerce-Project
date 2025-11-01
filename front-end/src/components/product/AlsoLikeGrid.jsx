import ProductCard from "../common/ProductCard";

export default function AlsoLikeGrid({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="mt-12">
      <h3 className="text-2xl font-extrabold mb-4">You might also like</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {items.map((p) => <ProductCard key={p.product_id} p={p}/>)}
      </div>
    </section>
  );
}
