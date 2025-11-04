export default function QuantityControl({ value, onChange, disabled }) {
  return (
    <div className={`inline-flex h-10 items-center rounded-full border ${disabled ? "opacity-50" : ""}`}>
      <button
        className="w-10"
        onClick={() => !disabled && onChange(Math.max(1, value - 1))}
        disabled={disabled}
      >
        −
      </button>
      <span className="w-10 text-center">{value}</span>
      <button
        className="w-10"
        onClick={() => !disabled && onChange(value + 1)}
        disabled={disabled}
      >
        +
      </button>
    </div>
  );
}
