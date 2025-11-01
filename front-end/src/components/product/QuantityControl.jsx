export default function QuantityControl({ value, onChange }) {
  return (
    <div className="inline-flex h-10 items-center rounded-full border">
      <button className="w-10" onClick={() => onChange(Math.max(1, value - 1))}>−</button>
      <span className="w-10 text-center">{value}</span>
      <button className="w-10" onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}
