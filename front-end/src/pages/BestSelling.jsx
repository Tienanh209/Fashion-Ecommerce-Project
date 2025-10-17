import { topSelling } from "../mock"
import ProductCard from "../components/ProductCard";

function BestSelling() {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="container mx-auto px-4">
        
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1E392A]">
            Best selling
          </h2>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
            Get in on the trend with our curated selection of best-selling styles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {topSelling.slice(0, 3).map(p => <ProductCard key={p.id} p={p}/>)}
        </div>
        
        <div className="text-center mt-12">
            <button className="px-8 py-3 rounded-md border border-[#1E392A] text-[#1E392A] font-semibold hover:bg-[#1E392A] hover:text-white transition-colors duration-300">
                See all →
            </button>
        </div>

      </div>
    </section>
  );
}

export default BestSelling