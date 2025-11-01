export default function VariantPicker({ variants = [], value, onChange }) {
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const sizes  = [...new Set(variants.map(v => v.size).filter(Boolean))];

  const setColor = (color) => onChange({ ...value, color });
  const setSize  = (size)  => onChange({ ...value, size });

  return (
    <div className="space-y-4">
      {!!colors.length && (
        <div>
          <div className="text-sm font-medium mb-1">Select Colors</div>
          <div className="flex gap-2">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-8 px-3 rounded-full border text-sm ${value.color === c ? "bg-black text-white border-black" : "hover:bg-gray-50"}`}
              >{c}</button>
            ))}
          </div>
        </div>
      )}
      {!!sizes.length && (
        <div>
          <div className="text-sm font-medium mb-1">Choose Size</div>
          <div className="flex gap-2 flex-wrap">
            {sizes.map(s => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`h-8 px-3 rounded-full border text-sm ${value.size === s ? "bg-black text-white border-black" : "hover:bg-gray-50"}`}
              >{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
