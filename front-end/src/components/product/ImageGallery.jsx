import { useState, useMemo } from "react";
import { imgUrl } from "../../utils/image";

export default function ImageGallery({ thumbnail, galleries = [] }) {
  const images = useMemo(() => {
    const arr = [];
    if (thumbnail) arr.push(thumbnail);
    if (Array.isArray(galleries)) {
      for (const g of galleries) if (g?.thumbnail) arr.push(g.thumbnail);
    }
    return [...new Set(arr)]; // unique
  }, [thumbnail, galleries]);

  const [active, setActive] = useState(0);
  const current = images[active] || "";

  return (
    <div className="grid grid-cols-5 gap-4">
      <div className="col-span-1 flex flex-col gap-3">
        {images.map((src, i) => (
          <button
            key={i}
            className={`aspect-square rounded-xl overflow-hidden border ${i===active ? "border-black" : "border-gray-200"} hover:border-black`}
            onClick={() => setActive(i)}
          >
            <img src={imgUrl(src)} alt="" className="w-full h-full object-cover"/>
          </button>
        ))}
      </div>
      <div className="col-span-4">
        <div className="aspect-[4/5] w-full rounded-2xl overflow-hidden border border-gray-200">
          <img src={imgUrl(current)} alt="" className="w-full h-full object-cover"/>
        </div>
      </div>
    </div>
  );
}
