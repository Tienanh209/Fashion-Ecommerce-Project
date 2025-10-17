import { categories } from "../mock";
export default function CategoryTiles(){
  return (
    <section className="container mx-auto px-4 py-10">
      <div className="rounded-3xl bg-gray-50 p-5 md:p-8">
        <h3 className="text-lg md:text-xl font-extrabold tracking-tight mb-5">BROWSE BY DRESS STYLE</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map(c=>(
            <div key={c.id} className="relative group rounded-2xl overflow-hidden">
              <img src={c.img} alt={c.label} className="h-40 w-full object-cover group-hover:scale-105 transition-transform"/>
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition"/>
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-medium">{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
