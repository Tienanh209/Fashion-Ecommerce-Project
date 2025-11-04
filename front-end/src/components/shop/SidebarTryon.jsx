import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Image as ImageIcon, Handbag } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

import { getCart } from "../../services/carts";
import {
  getProductByVariantId
} from "../../services/products";
import { imgUrl } from "../../utils/image";

function getUid(user) {
  return (
    user?.user_id ??
    null
  );
}
function normalizeBaseItem(it) {
  return {
    variant_id: it.variant_id,
  };
}
const TopIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M8 4l-3 2-1 3v11h6V9h4v11h6V9l-1-3-3-2" />
    <path d="M8 4c1.5 1 3 .8 4 .8S14.5 5 16 4" />
  </svg>
);
const BottomIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 4h12l-2 16h-3l-1-6-1 6H8L6 4z" />
  </svg>
);
const DressIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3l3 3-2 3 4 4-3 8H10L7 13l4-4-2-3 3-3z" />
  </svg>
);
function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-neutral-200">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={[
              "px-4 py-2 text-sm rounded-full transition flex items-center gap-2",
              active
                ? "bg-neutral-900 text-white ring-2 ring-offset-2 ring-neutral-400 ring-offset-white"
                : "text-neutral-800 hover:bg-neutral-100",
            ].join(" ")}
            type="button"
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
function slugify(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const TOP_CATEGORY_SLUGS = new Set(["t-shirts", "t-shirt", "shirts", "shirt", "jackets", "jacket", "hoodies", "sweaters", "tops", "coat"]);
const BOTTOM_CATEGORY_SLUGS = new Set(["shorts", "short", "jeans", "denim", "pants", "trousers", "bottoms"]);
const FALLBACK_IMAGE = "/images/image.png";

function resolveDetailImage(detail, fallbackPath) {
  const variant = detail?.variant || {};
  const product = detail?.product || {};
  const galleries = Array.isArray(detail?.galleries) ? detail.galleries : [];
  const sources = [
    variant.thumbnail,
    product.thumbnail,
    galleries[0]?.image_url,
    fallbackPath,
  ];
  for (const src of sources) {
    const url = imgUrl(src);
    if (url) return url;
  }
  return FALLBACK_IMAGE;
}

function UploadCard({ title, helperLink, onClick, preview }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-neutral-300 px-5 py-10 text-neutral-600 hover:bg-neutral-50"
      >
        {preview ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src={preview}
              alt="Selected model"
              className="h-32 w-32 rounded-xl object-cover"
            />
            <span className="text-sm text-neutral-500">Change model</span>
          </div>
        ) : (
          <>
            <ImageIcon className="h-6 w-6" />
            <span className="text-lg font-medium">{title}</span>
          </>
        )}
      </button>
      {helperLink ? (
        <div className="mt-3 text-center text-sm">
          <button className="underline text-neutral-500 hover:text-neutral-700" type="button">
            {helperLink}
          </button>
        </div>
      ) : null}
    </div>
  );
}
function Pill({ icon: Icon, children, dark }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm",
        dark ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      {children}
    </span>
  );
}

export default function SidebarTryon() {
  const [mixClothes, setMixClothes] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [topItems, setTopItems] = useState([]);
  const [bottomItems, setBottomItems] = useState([]);
  const [modelPreview, setModelPreview] = useState("");
  const fileInputRef = useRef(null);
  const modelPreviewRef = useRef("");
  const { user, ready } = useAuth();
  const [selectedTopId, setSelectedTopId] = useState(null);
  const [selectedBottomId, setSelectedBottomId] = useState(null);
  const [selectedOnePieceId, setSelectedOnePieceId] = useState(null);
  const combinedItems = useMemo(() => [...topItems, ...bottomItems], [topItems, bottomItems]);

  const cleanupPreview = () => {
    if (modelPreviewRef.current) {
      URL.revokeObjectURL(modelPreviewRef.current);
      modelPreviewRef.current = "";
    }
  };

  const handleSelectModel = () => {
    fileInputRef.current?.click();
  };

  const handleModelUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    cleanupPreview();
    modelPreviewRef.current = url;
    setModelPreview(url);
  };

  const loadCartItems = useCallback(
    async () => {
      const uid = getUid(user);
      if (!uid) {
        setTopItems([]);
        setBottomItems([]);
        setError("");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const { items: rawItems = [] } = await getCart(uid);
        const baseItems = (rawItems || []).map(normalizeBaseItem).filter((item) => Number(item.variant_id));
        if (!baseItems.length) {
          setTopItems([]);
          setBottomItems([]);
          return;
        }

        const details = await Promise.all(
          baseItems.map(async (item) => {
            try {
              const detail = await getProductByVariantId(item.variant_id);
              return { variantId: item.variant_id, detail };
            } catch (err) {
              console.warn("[SidebarTryon] Failed to load variant", item.variant_id, err);
              return null;
            }
          })
        );

        const nextTop = [];
        const nextBottom = [];

        details.forEach((entry) => {
          if (!entry?.detail) return;
          const { detail } = entry;
          const product = detail.product || {};
          const variant = detail.variant || {};
          const categoryLabel =
            product.category ||
            product.category_name ||
            variant.category ||
            "";
          const slug = slugify(categoryLabel);

          const item = {
            id: variant.variant_id || entry.variantId,
            image: resolveDetailImage(detail),
          };

          if (TOP_CATEGORY_SLUGS.has(slug)) {
            nextTop.push(item);
          } else if (BOTTOM_CATEGORY_SLUGS.has(slug)) {
            nextBottom.push(item);
          }
        });

        setTopItems(nextTop);
        setBottomItems(nextBottom);
        setSelectedTopId((prev) => (nextTop.some((item) => item.id === prev) ? prev : null));
        setSelectedBottomId((prev) => (nextBottom.some((item) => item.id === prev) ? prev : null));
        const allItems = [...nextTop, ...nextBottom];
        setSelectedOnePieceId((prev) => (allItems.some((item) => item.id === prev) ? prev : null));
      } catch (e) {
        console.error("[SidebarTryon] load failed", e);
        setError(e?.message || "Failed to load cart items.");
        setTopItems([]);
        setBottomItems([]);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!ready) return;
    loadCartItems();
  }, [ready, loadCartItems]);

  useEffect(() => {
    if (!ready) return;
    const reload = () => loadCartItems();
    window.addEventListener("cart:refresh", reload);
    window.addEventListener("cart:count", reload);
    return () => {
      window.removeEventListener("cart:refresh", reload);
      window.removeEventListener("cart:count", reload);
    };
  }, [ready, loadCartItems]);

  useEffect(() => () => cleanupPreview(), []);
  
  return (
    <div className="rounded-3xl bg-neutral-100 p-5 md:p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleModelUpload}
      />
      {/* header */}
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-neutral-900 text-white">
          <Plus className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-semibold text-neutral-900">Upload model&apos;s image</h2>
      </div>

      <div className="mb-6">
        <UploadCard title="Select human model" helperLink="Model templates" onClick={handleSelectModel} preview={modelPreview} />
      </div>

      {/* Clothes section header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-neutral-900 text-white">
            <Handbag className="h-4 w-4" />
          </span>
          <h2 className="text-lg font-semibold text-neutral-900">Choose your clothes</h2>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-start">
          <Segmented
            value={mixClothes}
            onChange={setMixClothes}
            options={[
              {
                value: true,
                label: (
                  <>
                    <span>Mix Clothes</span>
                  </>
                ),
              },
              {
                value: false,
                label: (
                  <>
                    <span>One-piece</span>
                  </>
                ),
              },
            ]}
          />
        </div>

        {/* Items */}
        {loading ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white/60 p-6 text-center text-sm text-neutral-500">
            Loading your closet…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : mixClothes ? (
          <>
            <div className="space-y-2">
              <Pill icon={TopIcon} dark>Top</Pill>
              <ItemsGrid
                items={topItems}
                emptyText="Add tops to your cart to see them here."
                selectedId={selectedTopId}
                onSelect={(id) =>
                  setSelectedTopId((prev) => (prev === id ? null : id))
                }
              />
            </div>
            <div className="space-y-2">
              <Pill icon={BottomIcon} dark>Bottom</Pill>
              <ItemsGrid
                items={bottomItems}
                emptyText="Add jeans or shorts to your cart to mix outfits."
                selectedId={selectedBottomId}
                onSelect={(id) =>
                  setSelectedBottomId((prev) => (prev === id ? null : id))
                }
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Pill icon={DressIcon} dark>One-piece</Pill>
            <ItemsGrid
              items={combinedItems}
              emptyText="Add items to your cart to preview looks."
              selectedId={selectedOnePieceId}
              onSelect={(id) =>
                setSelectedOnePieceId((prev) => (prev === id ? null : id))
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ItemsGrid({ items, emptyText, selectedId, onSelect }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white/60 p-4 text-sm text-neutral-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <ImageCard
          key={item.id}
          image={item.image}
          selected={item.id === selectedId}
          onClick={() => onSelect?.(item.id)}
        />
      ))}
    </div>
  );
}

function ImageCard({ image, selected, onClick }) {
  const resolved = image && image !== FALLBACK_IMAGE ? image : FALLBACK_IMAGE;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md",
        selected
          ? "border-neutral-900 ring-2 ring-neutral-900"
          : "border-neutral-200",
      ].join(" ")}
    >
      <img
        src={resolved}
        alt="Outfit item"
        className="h-full w-full object-cover transition group-hover:scale-105"
        onError={(e) => {
          e.currentTarget.src = FALLBACK_IMAGE;
        }}
      />
    </button>
  );
}
