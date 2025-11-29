import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { useParams, useNavigate } from "react-router";
import { Breadcrumb, VariantPicker, QuantityControl, AlsoLikeGrid, ImageGallery } from "../../components";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { getProduct, listProducts } from "../../services/products";
import { addItem as addCartItem } from "../../services/carts";
import { listReviews, getSummary, createReview } from "../../services/reviews";

const ReviewCard = lazy(() => import("../../components/reviews/ReviewCard"));
const StarIcon = ({ filled = false, half = false, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    className={`h-5 w-5 ${className}`}
    fill={filled || half ? "#facc15" : "none"}
    stroke="#facc15"
    strokeWidth="1.2"
  >
    <path d="M10 1.5 12.9 7l6.1.5-4.7 4.1 1.4 5.9L10 14.8 4.3 17.5l1.4-5.9-4.7-4.1L7 7z" />
    {half ? (
      <path d="M10 1.5V14.8L4.3 17.5l1.4-5.9-4.7-4.1L7 7z" fill="#facc15" />
    ) : null}
  </svg>
);

function StarPicker({ value = 0, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          className="p-1"
          aria-label={`Đánh giá ${s} sao`}
        >
          <StarIcon filled={s <= value} />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value = 0 }) {
  const int = Math.floor(value);
  const remainder = value - int;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= int;
        const half = !filled && remainder >= 0.25 && remainder < 0.75 && i === int + 1;
        const iconFilled = filled || half;
        return <StarIcon key={i} filled={iconFilled} half={half} />;
      })}
    </div>
  );
}

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
  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    title: "",
    content: "",
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState({ ok: "", err: "" });
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

        const [rv, summaryRes, sg] = await Promise.all([
          listReviews({ product_id: p.product_id, status: "approved", limit: 6 }).catch(() => null),
          getSummary(p.product_id).catch(() => null),
          listProducts({ category: p.category, limit: 4 }).catch(() => null),
        ]);
        if (!cancel) {
          setReviews(rv?.reviews || []);
          setReviewSummary(summaryRes?.summary || null);
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
    const saleDiscount = Number(product.discount || 0);
    if (product.final_price != null) return Number(product.final_price);
    return Math.max(
      0,
      product.price - Math.floor((product.price * saleDiscount) / 100)
    );
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

  const summaryView = useMemo(() => {
    if (!reviewSummary) return null;
    const total = Number(reviewSummary.total || 0);
    const avg = Number(reviewSummary.average ?? reviewSummary.avg ?? 0);
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (reviewSummary.breakdown || reviewSummary.distribution || []).forEach((row) => {
      const star = Number(row.rating || row.star);
      const count = Number(row.count || row.total || 0);
      if (breakdown[star] !== undefined) breakdown[star] = count;
    });
    const distributionPct = Object.fromEntries(
      Object.entries(breakdown).map(([star, count]) => [
        star,
        total > 0 ? Math.round((Number(count) / total) * 100) : 0,
      ])
    );
    return { avg, total, distributionPct };
  }, [reviewSummary]);

  const handleReviewChange = (key) => (value) => {
    if (value?.target) {
      setReviewForm((prev) => ({ ...prev, [key]: value.target.value }));
    } else {
      setReviewForm((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleSubmitReview = async () => {
    if (!user?.user_id) {
      alert("Bạn cần đăng nhập để đánh giá sản phẩm.");
      return;
    }
    if (!product?.product_id) return;
    if (!reviewForm.rating || reviewForm.rating < 1 || reviewForm.rating > 5) {
      alert("Vui lòng chọn số sao từ 1 tới 5.");
      return;
    }
    try {
      setReviewSubmitting(true);
      await createReview(user.user_id, {
        product_id: product.product_id,
        rating: reviewForm.rating,
        title: reviewForm.title,
        content: reviewForm.content,
      });
      const [rv, summaryRes] = await Promise.all([
        listReviews({ product_id: product.product_id, status: "approved", limit: 6 }).catch(() => null),
        getSummary(product.product_id).catch(() => null),
      ]);
      setReviews(rv?.reviews || []);
      setReviewSummary(summaryRes?.summary || null);
      setReviewForm({ rating: 0, title: "", content: "" });
      setReviewMessage({ ok: "Đã gửi đánh giá. Vui lòng chờ duyệt.", err: "" });
    } catch (e) {
      console.error(e);
      setReviewMessage({ ok: "", err: e?.message || "Không thể gửi đánh giá. Vui lòng thử lại." });
    } finally {
      setReviewSubmitting(false);
    }
  };

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

  const requiresColor = variants.some((v) => v?.color);
  const requiresSize = variants.some((v) => v?.size);
  const missingColor = requiresColor && !variant?.color;
  const missingSize = requiresSize && !variant?.size;
  let selectionHint = "";
  if (variants.length > 0) {
    if (missingColor && missingSize) selectionHint = "Vui lòng chọn màu và kích cỡ.";
    else if (missingColor) selectionHint = "Vui lòng chọn màu.";
    else if (missingSize) selectionHint = "Vui lòng chọn kích cỡ.";
  }
  const stockAvailable = Number(availableStock) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10 lg:py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb
            items={[
              { label: "Home", to: "/" },
              { label: "Shop", to: "/shop" },
              { label: product.category },
              { label: product.title },
            ]}
          />
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
            #{product.product_id || "SKU"}
          </div>
        </div>

        <div className="mt-8 rounded-[42px] bg-white p-4 shadow-2xl shadow-slate-200/70 ring-1 ring-slate-100 sm:p-6 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[32px] bg-slate-50/60 p-4">
              <ImageGallery thumbnail={product.thumbnail} galleries={product.galleries} />
            </div>

            <section className="flex flex-col gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-400">
                  LATEST DROP
                </p>
                <h1 className="mt-2 text-3xl font-black text-gray-900 lg:text-4xl">{product.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-600">
                {product.brand ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1">Brand: {product.brand}</span>
                ) : null}
                {product.gender ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1 capitalize">{product.gender}</span>
                ) : null}
                {product.category ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1">{product.category}</span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-4 border-b border-dashed border-gray-200 pb-6">
              <div className="text-4xl font-black text-gray-900">{finalPrice.toLocaleString()}₫</div>
              {Number(product.discount || 0) > 0 ? (
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <div className="text-base text-gray-400 line-through">
                    {product.price.toLocaleString()}₫
                  </div>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600">
                    -{product.discount}%
                  </span>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Giá đã bao gồm VAT</div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-slate-50/60 p-4">
              <VariantPicker
                variants={product.variants || []}
                value={variant}
                onChange={setVariant}
              />
            </div>

            <div
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
                stockAvailable ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
              }`}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-current text-base">
                {stockAvailable ? "✓" : "!"}
              </span>
              {stockAvailable
                ? `Còn ${Number(availableStock)} sản phẩm trong kho`
                : "Tạm hết hàng - vui lòng chọn lựa chọn khác"}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-slate-50/80 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="shrink-0">
                  <QuantityControl value={qty} onChange={handleQtyChange} disabled={addDisabled} />
                </div>
                <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                  <button
                    onClick={onAddToCart}
                    className={`flex flex-1 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wide shadow ${
                      addDisabled
                        ? "cursor-not-allowed bg-gray-200 text-gray-500"
                        : "bg-gray-900 text-white transition hover:bg-black"
                    }`}
                    disabled={addDisabled}
                  >
                    {outOfStock ? "Hết hàng" : "Thêm vào giỏ"}
                  </button>
                  <button
                    type="button"
                    onClick={onToggleFavorite}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition ${
                      likedProduct
                        ? "border-rose-200 bg-rose-50 text-rose-500"
                        : "border-gray-200 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill={likedProduct ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    {likedProduct ? "Đã yêu thích" : "Thêm vào Wishlist"}
                  </button>
                </div>
              </div>
              {selectionHint ? (
                <p className="mt-3 text-xs text-gray-500">{selectionHint}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-900">Giao hàng toàn quốc</p>
                <p className="text-xs text-gray-500">Miễn phí với đơn từ 500.000₫</p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-900">Đổi trả trong 7 ngày</p>
                <p className="text-xs text-gray-500">Áp dụng cho sản phẩm nguyên tem mác</p>
              </div>
            </div>
          </section>
          </div>
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
              Review Product
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-3 lg:[&>div]:h-full">
              <div
                className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100"
                id="review-form"
              >
                {reviewMessage.err ? (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {reviewMessage.err}
                  </div>
                ) : null}
                {reviewMessage.ok ? (
                  <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                    {reviewMessage.ok}
                  </div>
                ) : null}

                <div className="text-center font-semibold text-gray-900">
                  Share your review
                </div>
                <div className="mt-2 text-center text-sm text-gray-600">
                  Your rating
                </div>
                <div className="mt-3 flex justify-center">
                  <StarPicker value={reviewForm.rating} onChange={handleReviewChange("rating")} />
                </div>
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={reviewForm.title}
                    onChange={handleReviewChange("title")}
                    placeholder="Title"
                    className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <textarea
                    value={reviewForm.content}
                    onChange={handleReviewChange("content")}
                    placeholder="Review content"
                    rows={4}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewSubmitting}
                  className="mt-4 w-full rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50"
                >
                  {reviewSubmitting ? "Submitting..." : "Submit review"}
                </button>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="text-center font-semibold text-gray-900">
                  Average rating
                </div>
                {summaryView ? (
                  <div className="mt-3 space-y-3">
                    <div className="text-center">
                      <div className="text-3xl font-extrabold text-gray-900">
                        {summaryView.avg.toFixed(1)}
                      </div>
                      <div className="flex justify-center mt-1">
                        <StarDisplay value={summaryView.avg} />
                      </div>
                      <div className="text-xs text-gray-500">
                        {summaryView.total} reviews
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const pct = summaryView.distributionPct?.[star] || 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-xs text-gray-700">
                            <span className="w-10 text-right">
                              {star} star
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full bg-yellow-400"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="w-10 text-left text-gray-500">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-gray-500">No review data yet.</div>
                )}
                <button
                  onClick={() => {
                    const el = document.getElementById("review-form");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="mt-4 w-full rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90"
                >
                  Add review
                </button>
              </div>

              <div className="lg:col-span-1 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <Suspense fallback={<div className="py-6 text-center">Loading reviews…</div>}>
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                    {reviews.length ? (
                      reviews.map((r) => (
                        <div key={r.review_id}>
                          <ReviewCard r={r} />
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-gray-500">No reviews yet.</div>
                    )}
                  </div>
                </Suspense>
              </div>
            </div>
          </section>
        </div>

        <AlsoLikeGrid items={suggests} />
      </div>
    </div>
  );
}
