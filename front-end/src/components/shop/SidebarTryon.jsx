import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Image as ImageIcon, Handbag, Sun, Clock3 } from "lucide-react";
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
const BACKGROUND_OPTIONS = [
  {
    id: "beach",
    label: "Beach",
  },
  {
    id: "mountain",
    label: "Mountain",
  },
  {
    id: "street",
    label: "Street",
  },
  {
    id: "restaurant",
    label: "Restaurant",
  },
  {
    id: "city-night",
    label: "City Night",
  },
  {
    id: "studio",
    label: "Photo Studio",
  },
  {
    id: "garden",
    label: "Garden",
  },
];

function resolveDetailImage(detail) {  
  return (imgUrl(detail.product.thumbnail)) || FALLBACK_IMAGE;
}

function buildGalleryItems(detail, baseId, excludeImage) {
  const galleries = Array.isArray(detail?.galleries) ? detail.galleries : [];
  return galleries
    .map((gallery, index) => {
      const raw = gallery?.image_url || gallery?.thumbnail || "";
      if (!raw) return null;
      const resolved = imgUrl(raw);
      if (!resolved || resolved === excludeImage) return null;
      return {
        id: `${baseId}-gallery-${gallery?.gallery_id || index}`,
        image: resolved,
      };
    })
    .filter(Boolean);
}

function UploadCard({ title, helperLink, onClick, preview }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-neutral-300 p-2 text-neutral-600 hover:bg-neutral-50"
      >
        {preview ? (
          <div className="items-center">
            <img
              src={preview}
              alt="Selected model"
            className="aspect-2/3 h-52 rounded-xl object-cover"
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
// eslint-disable-next-line no-unused-vars
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

// eslint-disable-next-line no-unused-vars
function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-neutral-900 text-white">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
    </div>
  );
}

function BackgroundCard({ option, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex flex-col items-stretch gap-3 rounded-2xl bg-white p-4 text-left text-sm text-neutral-700 shadow-sm transition",
        selected
          ? "border-2 border-neutral-900 ring-neutral-900 ring-offset-2 ring-offset-neutral-100"
          : "border border-transparent hover:border-neutral-200 hover:shadow-md",
      ].join(" ")}
    >
      <span className="font-large w-full text-center">{option.label}</span>
    </button>
  );
}

function BackgroundGrid({ options, selectedId, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => (
        <BackgroundCard
          key={option.id}
          option={option}
          selected={option.id === selectedId}
          onClick={() => onSelect(option.id)}
        />
      ))}
    </div>
  );
}

function ClockPreview({ hour }) {
  const normalizedHour = hour % 12;
  const rotation = normalizedHour * 30;
  const radius = 38;

  return (
    <div className="flex justify-center">
      <div className="relative h-36 w-36 rounded-full border border-neutral-200 bg-white shadow-sm">
        {[12, 3, 6, 9].map((num) => {
          const angle = (num % 12) * 30 - 90;
          const rad = (angle * Math.PI) / 180;
          const x = 50 + Math.cos(rad) * radius;
          const y = 50 + Math.sin(rad) * radius;
          return (
            <span
              key={num}
              className="absolute text-xs font-medium text-neutral-500"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {num === 0 ? 12 : num}
            </span>
          );
        })}
        <div className="relative top-6 flex items-center justify-center">
          <div
            className="h-12 w-0.5 origin-bottom rounded bg-neutral-900"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2.5 w-2.5 rounded-full bg-neutral-900" />
        </div>
      </div>
    </div>
  );
}

function TimeSelector({ hour, onHourChange, isPm, onPeriodChange }) {
  const hourDisplay = String(hour).padStart(2, "0");

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <SectionHeader icon={Clock3} title="Enter time" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex m-auto gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
          <button
            type="button"
            className="rounded-full bg-white px-2 py-1 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-100"
            onClick={() => onHourChange(-1)}
          >
            -
          </button>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-neutral-900">
              {hourDisplay}
            </span>
            <span className="text-xl font-medium text-neutral-500">:00</span>
          </div>
          <button
            type="button"
            className="rounded-full bg-white px-2 py-1 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-100"
            onClick={() => onHourChange(1)}
          >
            +
          </button>
        </div>
        <div className="flex m-auto border border-neutral-200 rounded-2xl text-sm font-medium">
          <button
            type="button"
            onClick={() => onPeriodChange(false)}
            className={[
              "px-4 py-2",
              !isPm ? "bg-neutral-900 text-white rounded-2xl" : "bg-white text-neutral-700",
            ].join(" ")}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange(true)}
            className={[
              "px-4 py-2",
              isPm ? "bg-neutral-900 text-white rounded-2xl" : "bg-white text-neutral-700",
            ].join(" ")}
          >
            PM
          </button>
        </div>
      </div>
      <ClockPreview hour={hour} isPm={isPm} />
    </div>
  );
}

export default function SidebarTryon({
  onGenerate,
  generating = false,
  submitError = "",
  preselectVariantId = null,
}) {
  const [mixClothes, setMixClothes] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [topItems, setTopItems] = useState([]);
  const [bottomItems, setBottomItems] = useState([]);
  const [modelPreview, setModelPreview] = useState("");
  const [modelFile, setModelFile] = useState(null);
  const [backgroundId, setBackgroundId] = useState(
    BACKGROUND_OPTIONS[0]?.id || ""
  );
  const [backgroundNote, setBackgroundNote] = useState("");
  const [hour, setHour] = useState(7);
  const [isPm, setIsPm] = useState(false);
  const fileInputRef = useRef(null);
  const modelPreviewRef = useRef("");
  const { user, ready } = useAuth();
  const [selectedTopId, setSelectedTopId] = useState(null);
  const [selectedBottomId, setSelectedBottomId] = useState(null);
  const [selectedOnePieceId, setSelectedOnePieceId] = useState(null);
  const [preselectApplied, setPreselectApplied] = useState(false);
  const combinedItems = useMemo(
    () => [...topItems, ...bottomItems],
    [topItems, bottomItems]
  );
  const selectedTopItem = useMemo(
    () => topItems.find((item) => item.id === selectedTopId) || null,
    [topItems, selectedTopId]
  );
  const selectedBottomItem = useMemo(
    () => bottomItems.find((item) => item.id === selectedBottomId) || null,
    [bottomItems, selectedBottomId]
  );
  const selectedOnePieceItem = useMemo(
    () =>
      combinedItems.find((item) => item.id === selectedOnePieceId) || null,
    [combinedItems, selectedOnePieceId]
  );
  const selectedBackground = useMemo(
    () => BACKGROUND_OPTIONS.find((option) => option.id === backgroundId) || null,
    [backgroundId]
  );
  const formattedTime = useMemo(
    () => `${hour === 12 ? 12 : hour % 12 || 12} ${isPm ? "p.m" : "a.m"}`,
    [hour, isPm]
  );
  const topScrollable = topItems.length > 3;
  const bottomScrollable = bottomItems.length > 3;
  const onePieceScrollable = combinedItems.length > 4;

  useEffect(() => {
    setPreselectApplied(false);
  }, [preselectVariantId]);

  useEffect(() => {
    if (!preselectVariantId || preselectApplied) return;
    const normalized = String(preselectVariantId);
    const match =
      combinedItems.find((item) => String(item.id) === normalized) || null;
    if (match) {
      setMixClothes(false);
      setSelectedOnePieceId(match.id);
      setPreselectApplied(true);
    }
  }, [preselectVariantId, preselectApplied, combinedItems]);

  const cleanupPreview = () => {
    if (modelPreviewRef.current) {
      URL.revokeObjectURL(modelPreviewRef.current);
      modelPreviewRef.current = "";
    }
    setModelFile(null);
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
    setModelFile(file);
    setFormError("");
  };

  const handleTryOn = () => {
    if (!onGenerate) return;
    if (!modelFile) {
      setFormError("Please upload a human model image first.");
      return;
    }
    if (!selectedBackground) {
      setFormError("Please choose a background scene.");
      return;
    }
    const backgroundRequest = backgroundNote.trim();
    setFormError("");
    if (mixClothes) {
      if (!selectedTopItem || !selectedBottomItem) {
        setFormError("Please select both a top and a bottom item.");
        return;
      }
      onGenerate({
        modelFile,
        topImage: selectedTopItem.image,
        bottomImage: selectedBottomItem.image,
        background: selectedBackground.label,
        backgroundRequest,
        time: formattedTime,
      });
    } else {
      if (!selectedOnePieceItem?.image) {
        setFormError("Please select an outfit to try on.");
        return;
      }
      onGenerate({
        modelFile,
        garmentImage: selectedOnePieceItem.image,
        background: selectedBackground.label,
        backgroundRequest,
        time: formattedTime,
      });
    }
  };

  const loadCartItems = useCallback(
    async () => {
      const uid = getUid(user);
      if (!uid) {
        setTopItems([]);
        setBottomItems([]);
        setLoadError("");
        setFormError("");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setLoadError("");
        setFormError("");
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
          console.log(detail);
          
          const product = detail.product || {};
          const variant = detail.variant || {};
          const categoryLabel = product.category || "";
          const slug = slugify(categoryLabel);

          const item = {
            id: variant.variant_id || entry.variantId,
            image: resolveDetailImage(detail),
          };

          let targetList = null;
          if (TOP_CATEGORY_SLUGS.has(slug)) {
            targetList = nextTop;
          } else if (BOTTOM_CATEGORY_SLUGS.has(slug)) {
            targetList = nextBottom;
          }

          if (targetList) {
            targetList.push(item);
            const galleryItems = buildGalleryItems(detail, item.id, item.image);
            galleryItems.forEach((galleryItem) => targetList.push(galleryItem));
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
        setLoadError(e?.message || "Failed to load cart items.");
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

  const handleHourChange = (delta) => {
    setHour((prev) => {
      let next = prev + delta;
      if (next > 12) next = 1;
      if (next < 1) next = 12;
      return next;
    });
    setFormError("");
  };

  const handlePeriodChange = (nextIsPm) => {
    setIsPm(nextIsPm);
    setFormError("");
  };

  return (
    <div className="rounded-3xl bg-neutral-100 p-5 md:p-6 space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleModelUpload}
      />
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,260px)]">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <SectionHeader icon={Plus} title="Upload your image" />
          <UploadCard
            title="Select human model"
            helperLink="Model templates"
            onClick={handleSelectModel}
            preview={modelPreview}
          />
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <SectionHeader icon={Sun} title="Choose background" />
          <BackgroundGrid
            options={BACKGROUND_OPTIONS}
            selectedId={backgroundId}
            onSelect={(id) => {
              setBackgroundId(id);
              setFormError("");
            }}
          />
          <div className="mt-4 space-y-2">
            <label
              htmlFor="custom-background"
              className="text-sm font-medium text-neutral-700"
            >
              Describe your ideal background
            </label>
            <input
              id="custom-background"
              type="text"
              value={backgroundNote}
              onChange={(event) => {
                setBackgroundNote(event.target.value);
                setFormError("");
              }}
              placeholder="Eg. sunset rooftop, neon-lit alley…"
              className="w-full rounded-2xl border border-neutral-200 px-4 py-2 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
            />
            <p className="text-xs text-neutral-500">
              Optional note that helps us recreate the vibe you have in mind.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.1fr_minmax(0,1fr)]">
        <div className="rounded-2xl bg-white p-5 shadow-sm min-w-0">
          <SectionHeader icon={Handbag} title="Choose your clothes" />
          <div className="space-y-4">
            <div className="flex justify-start">
              <Segmented
                value={mixClothes}
                onChange={(value) => {
                  setMixClothes(value);
                  setFormError("");
                }}
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

            {loading ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-white/60 p-6 text-center text-sm text-neutral-500">
                Loading your closet…
              </div>
            ) : loadError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                {loadError}
              </div>
            ) : mixClothes ? (
              <>
                <div className="space-y-2">
                  <Pill icon={TopIcon} dark>
                    Top
                  </Pill>
                  <div
                    className={
                      topScrollable ? "max-h-60 overflow-y-auto" : ""
                    }
                  >
                    <ItemsGrid
                      items={topItems}
                      emptyText="Add tops to your cart to see them here."
                      selectedId={selectedTopId}
                      onSelect={(id) => {
                        setFormError("");
                        setSelectedTopId((prev) => (prev === id ? null : id));
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Pill icon={BottomIcon} dark>
                    Bottom
                  </Pill>
                  <div
                    className={
                      bottomScrollable ? "max-h-60 overflow-y-auto" : ""
                    }
                  >
                    <ItemsGrid
                      items={bottomItems}
                      emptyText="Add jeans or shorts to your cart to mix outfits."
                      selectedId={selectedBottomId}
                      onSelect={(id) => {
                        setFormError("");
                        setSelectedBottomId((prev) => (prev === id ? null : id));
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Pill icon={DressIcon} dark>
                  One-piece
                </Pill>
                <div
                  className={
                    onePieceScrollable ? "max-h-60 overflow-y-auto pr-1" : ""
                  }
                >
                  <ItemsGrid
                    items={combinedItems}
                    emptyText="Add items to your cart to preview looks."
                    selectedId={selectedOnePieceId}
                    layout="two-row"
                    onSelect={(id) => {
                      setFormError("");
                      setSelectedOnePieceId((prev) => (prev === id ? null : id));
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <TimeSelector
          hour={hour}
          onHourChange={handleHourChange}
          isPm={isPm}
          onPeriodChange={handlePeriodChange}
        />
      </div>

      <div className="space-y-3">
        {formError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {formError}
          </div>
        ) : null}
        {submitError && !formError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {submitError}
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleTryOn}
          disabled={generating}
          className={[
            "w-full rounded-2xl bg-neutral-900 px-6 py-3 text-base font-semibold text-white transition",
            generating ? "cursor-not-allowed opacity-70" : "hover:bg-neutral-800",
          ].join(" ")}
        >
          {generating ? "Generating look…" : "Generate virtual try-on"}
        </button>
      </div>
    </div>
  );
}

function ItemsGrid({ items, emptyText, selectedId, onSelect, layout = "single-row" }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white/60 p-4 text-sm text-neutral-500">
        {emptyText}
      </div>
    );
  }

  const containerClass =
    layout === "two-row"
      ? "grid auto-cols-max grid-flow-col grid-rows-2 gap-4 overflow-x-auto"
      : "flex gap-4 overflow-x-auto";

  return (
    <div className={containerClass}>
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
        "group inline-flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm transition hover:shadow-md",
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
