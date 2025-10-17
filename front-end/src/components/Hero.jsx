export default function Hero(){
  return (
    <section className="bg-gray-50">
      <div className="container mx-auto px-4 py-10 md:py-16 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-5xl md:text-5xl font-extrabold leading-tight">
            Discover and <br />
            Find Your Own <br />
            Fashion!
          </h1>
          <p className="text-gray-600 mt-6 text-lg max-w-md">
            Explore our curated collection of stylish clothing and accessories tailored to your unique taste.
          </p>
          <div className="mt-10">
            <button className="px-10 py-4 rounded-lg bg-black text-white font-semibold hover:bg-[gray] shadow-lg tracking-widest transition-colors">
              EXPLORE NOW
            </button>
          </div>
        </div>
        <div className="relative">
          <img className="w-[80%] h-[720px] object-cover rounded-tl-[120px] rounded-br-[120px] rounded-tr-[40px] rounded-bl-[40px] shadow-lg"
               src="/images/hero.png"
               alt="hero"/>
        </div>
      </div>
    </section>
  );
}