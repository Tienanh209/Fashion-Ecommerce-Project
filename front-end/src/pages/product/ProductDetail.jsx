import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { useParams, useNavigate } from "react-router";
import { Breadcrumb, VariantPicker, QuantityControl, AlsoLikeGrid, ImageGallery } from "../../components";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { getProduct, listProducts } from "../../services/products";
import { addItem as addCartItem } from "../../services/carts";
import { listReviews } from "../../services/reviews";

const ReviewCard = lazy(() => import("../../components/reviews/ReviewCard"));

const toStr = (v) => (v === null || v === undefined ? "" : String(v));
const rmDiacritics = (s) =>
  toStr(s)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const MATERIAL_CARE_DICTIONARY = {
  cotton: [
    "Giặt máy với nước lạnh và chu trình nhẹ để hạn chế co rút.",
    "Tránh sử dụng thuốc tẩy gốc clo.",
    "Phơi phẳng trong bóng râm, ủi ở nhiệt độ trung bình.",
  ],
  polyester: [
    "Giặt máy với nước ấm, có thể phơi khô nhanh.",
    "Không sử dụng nhiệt độ cao khi ủi, ưu tiên hơi nước.",
    "Tránh sấy khô ở mức nhiệt quá cao để không biến dạng sợi.",
  ],
  wool: [
    "Giặt tay bằng nước lạnh hoặc sử dụng chế độ giặt len.",
    "Không vắt mạnh, ép nhẹ để loại bỏ nước và phơi phẳng.",
    "Bảo quản với gói hút ẩm để tránh ẩm mốc và côn trùng.",
  ],
  denim: [
    "Lộn trái sản phẩm trước khi giặt để giữ màu.",
    "Giặt với nước lạnh, không giặt quá thường xuyên.",
    "Phơi nơi thoáng mát, tránh ánh nắng trực tiếp.",
  ],
  linen: [
    "Giặt máy ở chế độ nhẹ cùng nước lạnh.",
    "Ủi khi vải còn hơi ẩm để hạn chế nhăn.",
    "Bảo quản ở nơi khô ráo, tránh ẩm thấp.",
  ],
  silk: [
    "Giặt tay với nước lạnh và dung dịch trung tính.",
    "Không vắt xoắn, phơi nơi râm mát.",
    "Ủi ở nhiệt độ thấp với lớp vải phủ bảo vệ.",
  ],
};

function resolveVariantId(variants = [], picked = { color: "", size: "" }) {
  if (!variants.length) return null;

  const wantColor = rmDiacritics(picked.color);
  const wantSize = rmDiacritics(picked.size);

  const readColor = (v) =>
    rmDiacritics(
      v.color ??
        v.variant_color ??
        v.option_color ??
        v.colour ??
        v.Color ??
        ""
    );
  const readSize = (v) =>
    rmDiacritics(
      v.size ??
        v.variant_size ??
        v.option_size ??
        v.Size ??
        ""
    );

  // match đầy đủ
  let found = variants.find((v) => readColor(v) === wantColor && readSize(v) === wantSize);
  if (found) return found.variant_id ?? found.id;

  // theo size
  if (wantSize) {
    found = variants.find((v) => readSize(v) === wantSize);
    if (found) return found.variant_id ?? found.id;
  }

  // theo color
  if (wantColor) {
    found = variants.find((v) => readColor(v) === wantColor);
    if (found) return found.variant_id ?? found.id;
  }

  // fallback: variant đầu tiên
  return variants[0].variant_id ?? variants[0].id ?? null;
}

function normalizeMaterialKey(value = "") {
  return rmDiacritics(value)
    .replace(/[^a-z]/g, "")
    .toLowerCase();
}

function resolveCareByMaterial(material = "") {
  const key = normalizeMaterialKey(material);
  return MATERIAL_CARE_DICTIONARY[key] || [];
}

function splitDescription(description = "") {
  return description
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [suggests, setSuggests] = useState([]);

  const [variant, setVariant] = useState({ color: "", size: "" });
  const [qty, setQty] = useState(1);
  const [availableStock, setAvailableStock] = useState(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError("");
    setProduct(null);

    getProduct(id)
      .then(async (p) => {
        if (cancel) return;
        setProduct(p || null);

        if (Array.isArray(p?.variants) && p.variants.length === 0) {
          setAvailableStock(Number(p?.stock ?? 0));
        }

        // default variant
        const v0 = p?.variants?.[0];
        if (v0) setVariant({ color: v0.color || v0.variant_color || "", size: v0.size || v0.variant_size || "" });

        const [rv, sg] = await Promise.all([
          listReviews({ product_id: p.product_id, limit: 6 }).catch(() => null),
          listProducts({ category: p.category, limit: 4 }).catch(() => null),
        ]);
        if (!cancel) {
          setReviews(rv?.reviews || []);
          setSuggests((sg?.products || []).filter((x) => x.product_id !== p.product_id));
        }
      })
      .catch((e) => !cancel && setError(e.message || "Failed to load product"))
      .finally(() => !cancel && setLoading(false));

    return () => {
      cancel = true;
    };
  }, [id]);

  const finalPrice = useMemo(() => {
    if (!product) return 0;
    return product.price - Math.floor((product.price * (product.discount || 0)) / 100);
  }, [product]);

  const variants = product?.variants || [];
  const descriptionSource = product?.description || "";
  const materialSource = product?.material || "";
  const descriptionLines = useMemo(
    () => splitDescription(descriptionSource),
    [descriptionSource]
  );
  const likedProduct = product?.product_id
    ? isFavorite?.(product.product_id)
    : false;
  const materialCareList = useMemo(
    () => resolveCareByMaterial(materialSource),
    [materialSource]
  );

  useEffect(() => {
    if (!product) return;

    if (!variants.length) {
      setAvailableStock(Number(product?.stock ?? 0));
      return;
    }

    const id = resolveVariantId(variants, variant);
    if (!id) {
      setAvailableStock(0);
      return;
    }

    const match = variants.find((v) => {
      const vid = v.variant_id ?? v.id;
      return Number(vid) === Number(id);
    });

    const rawStock =
      match?.stock ??
      match?.quantity ??
      match?.inventory ??
      match?.available ??
      match?.available_stock ??
      0;

    setAvailableStock(Number(rawStock));
  }, [product, variant, variants]);

  useEffect(() => {
    const stock = Number(availableStock);
    if (Number.isFinite(stock) && stock >= 0) {
      setQty((prev) => {
        const desired = Number(prev) || 1;
        return Math.min(Math.max(1, desired), stock || 1);
      });
    } else {
      setQty((prev) => Math.max(1, Number(prev) || 1));
    }
  }, [availableStock]);

  const handleQtyChange = (next) => {
    const desired = Math.max(1, Number(next) || 1);
    const stock = Number(availableStock);
    if (availableStock !== null && Number.isFinite(stock) && stock >= 0) {
      setQty(Math.min(desired, stock || 1));
    } else {
      setQty(desired);
    }
  };

  const onAddToCart = async () => {
    if (!ready) return;
    if (!user?.user_id) {
      const redirect = `/product/${product.product_id}`;
      return navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
    }

    const variant_id = resolveVariantId(product?.variants || [], variant);
    if (!variant_id) {
      return alert("Variant not available for this product.");
    }

    const stock = Number(availableStock);
    if (availableStock !== null && Number.isFinite(stock) && stock <= 0) {
      return alert("This variant is currently out of stock.");
    }

    const desiredQty = Math.max(1, Number(qty || 1));
    if (availableStock !== null && Number.isFinite(stock) && stock >= 0 && desiredQty > stock) {
      setQty(stock || 1);
      return alert(`Only ${stock} item${stock > 1 ? "s" : ""} available for this variant.`);
    }

    try {
      await addCartItem(user.user_id, {
        variant_id,
        quantity: desiredQty,
      });

      // Yêu cầu Header tự refresh badge
      window.dispatchEvent(new CustomEvent("cart:refresh"));

      alert("Added to cart");
    } catch (e) {
      alert(e?.message || "Failed to add to cart");
    }
  };

  const onToggleFavorite = async () => {
    if (!product) return;
    if (!user) {
      const redirect = `/product/${product.product_id}`;
      return navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
    try {
      await toggleFavorite?.(product.product_id);
    } catch (error) {
      alert(error?.message || "Failed to update favorites");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-12 text-center text-gray-500">
          Loading…
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-12 text-center text-red-500">
          {error || "Product not found."}
        </div>
      </div>
    );
  }

  const outOfStock =
    (variants.length === 0 && Number(availableStock) <= 0) ||
    (variants.length > 0 && Number(availableStock) <= 0);
  const addDisabled = outOfStock || Number(availableStock) <= 0;

  return (
    <div className="min-h-screen bg-white container mx-auto px-4 py-6">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Shop", to: "/shop" },
            { label: product.category },
            { label: product.title },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-2 mt-2">
          {/* left: images */}
          <ImageGallery thumbnail={product.thumbnail} galleries={product.galleries} />

          {/* right: info */}
          <section>
            <h1 className="text-3xl font-extrabold">{product.title}</h1>
            <div className="mt-2 text-sm text-gray-500">
              {product.brand || "No brand"} · {product.gender}
            </div>

            <div className="mt-4 flex items-end gap-3">
              <div className="text-3xl font-extrabold">{finalPrice.toLocaleString()}₫</div>
              {product.discount ? (
                <>
                  <div className="text-gray-400 line-through">
                    {product.price.toLocaleString()}₫
                  </div>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                    -{product.discount}%
                  </span>
                </>
              ) : null}
            </div>

            <div className="mt-6">
              <VariantPicker
                variants={product.variants || []}
                value={variant}
                onChange={setVariant}
              />
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {Number(availableStock) > 0
                ? `In stock: ${Number(availableStock)} item${Number(availableStock) > 1 ? "s" : ""}`
                : "Out of stock"}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <QuantityControl value={qty} onChange={handleQtyChange} disabled={addDisabled} />
              <button
                onClick={onAddToCart}
                className={`h-10 px-6 rounded-full font-medium ${addDisabled ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-black text-white hover:opacity-90"}`}
                disabled={addDisabled}
              >
                {outOfStock ? "Out of Stock" : "Add to Cart"}
              </button>
              <button
                type="button"
                onClick={onToggleFavorite}
                className={`h-10 px-4 rounded-full border flex items-center gap-2 text-sm font-medium transition ${
                  likedProduct
                    ? "border-red-400 text-red-500 bg-red-50"
                    : "border-gray-300 text-gray-700 hover:border-gray-500"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill={likedProduct ? "currentColor" : "none"}
                  stroke={likedProduct ? "currentColor" : "currentColor"}
                  strokeWidth="1.8"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {likedProduct ? "Added to Wishlist" : "Add to Wishlist"}
              </button>
            </div>
          </section>
        </div>

        <div className="mt-12 space-y-10">
          <div className="border-t" />
          <section className="pt-6">
            <h2 className="text-lg font-semibold text-gray-900">Chi tiết</h2>
            {descriptionLines.length ? (
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700">
                {descriptionLines.map((line, idx) => (
                  <li key={`desc-${idx}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                Thông tin chi tiết sẽ được cập nhật sớm.
              </p>
            )}
          </section>

          <div className="border-t" />
          <section className="pt-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Chất liệu / Cách chăm sóc
            </h2>
            {materialSource ? (
              <div className="mt-4 rounded-lg border border-gray-100 p-4">
                <div className="text-base font-medium text-gray-900">
                  {materialSource}
                </div>
                {materialCareList.length ? (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-900">
                      Hướng dẫn giặt
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                      {materialCareList.map((item, idx) => (
                        <li key={`material-care-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    Tham khảo nhãn chăm sóc để biết thêm chi tiết.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                Chất liệu sẽ được cập nhật cho sản phẩm này.
              </p>
            )}
          </section>

          <div className="border-t" />
          <section className="pt-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Đánh giá sản phẩm
            </h2>
            <Suspense fallback={<div className="py-6 text-center">Loading reviews…</div>}>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {reviews.length ? (
                  reviews.map((r) => (
                    <div key={r.review_id}>
                      <ReviewCard r={r} />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-8 text-center text-gray-500">
                    No reviews yet.
                  </div>
                )}
              </div>
            </Suspense>
          </section>
        </div>

        <AlsoLikeGrid items={suggests} />
    </div>
  );
}
