import { testimonials } from "../mock";

function Rating({ n }) {
  return <div className="text-yellow-500 text-sm">{Array.from({ length: n }).map((_, i) => <span key={i}>★</span>)}</div>;
}

export default function Testimonials() {
  return (
    <section className="container mx-auto px-4 py-10">
      <h3 className="text-lg md:text-xl font-extrabold tracking-tight mb-5">OUR HAPPY CUSTOMERS</h3>
      <div className="grid md:grid-cols-3 gap-4">
        {testimonials.map((t) => (
          <div key={t.id} className="rounded-2xl border p-5 bg-white">
            <Rating n={t.rating} />
            <p className="mt-3 text-sm text-gray-700">{t.text}</p>
            <div className="mt-4 text-sm font-semibold">{t.name}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
