import { Card } from "./Card";
import { ImagePlus, Trash2 } from "lucide-react";
import { imgUrl } from "../../../utils/image";

export default function GalleryManager({
  galleries = [],
  onAdd,
  onDelete,
  busy = false,
}) {
  return (
    <Card title="Gallery" sub="Upload additional product images">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {galleries.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
            No gallery images yet.
          </div>
        ) : (
          galleries.map((gallery) => (
            <div
              key={gallery.gallery_id}
              className="group relative overflow-hidden rounded-lg border border-neutral-200"
            >
              <img
                src={imgUrl(gallery.thumbnail)}
                alt=""
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                className="absolute inset-x-0 bottom-0 hidden h-10 items-center justify-center bg-black/70 text-xs font-medium text-white group-hover:flex disabled:opacity-50"
                onClick={() => onDelete?.(gallery.gallery_id)}
                disabled={busy}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Remove
              </button>
            </div>
          ))
        )}
        <label className="group grid h-44 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-600 hover:bg-neutral-100">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAdd}
            disabled={busy}
          />
          <div className="flex flex-col items-center gap-1">
            <ImagePlus className="h-6 w-6" />
            <span>Add image</span>
          </div>
        </label>
      </div>
    </Card>
  );
}
