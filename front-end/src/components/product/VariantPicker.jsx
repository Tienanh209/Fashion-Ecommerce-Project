import { useMemo, useState } from "react";

const COLOR_HEX = {
  black: "#0f172a",
  white: "#f8fafc",
  grey: "#cbd5f5",
  gray: "#cbd5f5",
  charcoal: "#111827",
  blue: "#3b82f6",
  navy: "#1e3a8a",
  green: "#4ade80",
  khaki: "#d6c29f",
  beige: "#e7dcc3",
  red: "#ef4444",
  pink: "#f472b6",
  brown: "#92400e",
  yellow: "#facc15",
  orange: "#fb923c",
};

function toColorHex(name = "") {
  const key = String(name).trim().toLowerCase();
  return COLOR_HEX[key] || "#d1d5db";
}

const CM_TABLE = [
  { label: "Waist", values: ["57-60", "61-66", "67-72", "73-78", "79-85", "86-94", "95-104"] },
  { label: "Hip", values: ["82-85", "86-91", "92-97", "98-103", "104-110", "111-117", "118-125"] },
  { label: "Inseam", values: ["77.5", "78", "78.5", "79", "79", "80", "80.5"] },
];

const INCH_TABLE = [
  { label: "Waist", values: ["22-23", "24-26", "27-28", "29-30", "31-33", "34-37", "38-41"] },
  { label: "Hip", values: ["32-33", "34-36", "36-38", "38-40", "41-43", "44-46", "47-49"] },
  { label: "Inseam", values: ["30.5", "30.7", "31", "31.1", "31.2", "31.5", "31.7"] },
];

export default function VariantPicker({ variants = [], value, onChange }) {
  const colors = useMemo(
    () => [...new Set(variants.map((v) => v.color).filter(Boolean))],
    [variants]
  );
  const sizes = useMemo(
    () => [...new Set(variants.map((v) => v.size).filter(Boolean))],
    [variants]
  );
  const [showGuide, setShowGuide] = useState(false);
  const [guideUnit, setGuideUnit] = useState("cm");

  const setColor = (color) => onChange({ ...value, color });
  const setSize = (size) => onChange({ ...value, size });

  const tableHeaders = ["2XS", "XS", "S", "M", "L", "XL", "2XL"];
  const currentTable = guideUnit === "cm" ? CM_TABLE : INCH_TABLE;

  return (
    <div className="space-y-6">
      {!!colors.length && (
        <div>
          <div className="text-lg font-medium mb-2">Select color</div>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => {
              const hex = toColorHex(c);
              const selected = value.color === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-10 w-10 rounded-full border-2 transition ${
                    selected ? "border-black ring-2 ring-black/40" : "border-gray-200"
                  }`}
                  title={c}
                  style={{ background: hex }}
                />
              );
            })}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Selected: {value.color || "—"}
          </div>
        </div>
      )}

      {!!sizes.length && (
        <div>
          <div className="mb-2 flex items-center justify-between text-lg font-medium">
            <span>Choose size</span>
            <button
              type="button"
              className="text-lg font-semibold underline"
              onClick={() => setShowGuide(true)}
            >
              Size guide
            </button>
          </div>
          <div className="flex gap-3 flex-wrap">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`h-8 px-3 rounded-full border text-sm ${
                  value.size === s ? "bg-black text-white border-black" : "hover:bg-gray-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Selected: {value.size || "—"}
          </div>
        </div>
      )}

      {showGuide ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
            <button
              className="absolute right-4 top-4 text-lg font-semibold text-gray-500 hover:text-black"
              onClick={() => setShowGuide(false)}
            >
              ×
            </button>
            <div className="text-lg font-semibold text-gray-900">Size guide</div>
            <div className="mt-3 flex gap-2">
              {["cm", "inch"].map((unit) => (
                <button
                  key={unit}
                  className={`rounded-full px-4 py-1 text-sm font-medium ${
                    guideUnit === unit ? "bg-black text-white" : "bg-gray-100 text-gray-700"
                  }`}
                  onClick={() => setGuideUnit(unit)}
                >
                  {unit.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="mt-4 overflow-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Measurement</th>
                    {tableHeaders.map((header) => (
                      <th key={header} className="px-4 py-2 text-center">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentTable.map((row) => (
                    <tr key={row.label} className="border-t">
                      <td className="px-4 py-2 font-medium">{row.label}</td>
                      {row.values.map((value, idx) => (
                        <td key={`${row.label}-${idx}`} className="px-4 py-2 text-center text-gray-700">
                          {value} {guideUnit}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
