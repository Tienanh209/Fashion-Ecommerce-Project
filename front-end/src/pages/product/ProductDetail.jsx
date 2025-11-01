import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { useParams, useNavigate } from "react-router";
import { Breadcrumb, VariantPicker, QuantityControl, AlsoLikeGrid, ImageGallery } from "../../components"
import { useAuth } from "../../contexts/AuthContext";
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

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, ready } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [suggests, setSuggests] = useState([]);

  const [variant, setVariant] = useState({ color: "", size: "" });
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError("");
    setProduct(null);

    getProduct(id)
      .then(async (p) => {
        if (cancel) return;
        setProduct(p || null);

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

    try {
      await addCartItem(user.user_id, {
        variant_id,
        quantity: Math.max(1, Number(qty || 1)),
      });

      // Yêu cầu Header tự refresh badge
      window.dispatchEvent(new CustomEvent("cart:refresh"));

      alert("Added to cart");
    } catch (e) {
      alert(e?.message || "Failed to add to cart");
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

            <p className="mt-4 text-gray-700">{product.description}</p>

            <div className="mt-6">
              <VariantPicker
                variants={product.variants || []}
                value={variant}
                onChange={setVariant}
              />
            </div>

            <div className="mt-6 flex items-center gap-3">
              <QuantityControl value={qty} onChange={setQty} />
              <button
                onClick={onAddToCart}
                className="h-10 px-6 rounded-full bg-black text-white font-medium hover:opacity-90"
              >
                Add to Cart
              </button>
            </div>
          </section>
        </div>

        {/* Rating & Reviews */}
        <div className="mt-10 border-b" />
        <section className="mt-6">
          <div className="flex items-center gap-6 text-sm">
            <button className="font-semibold border-b-2 border-black pb-2">Product Details</button>
            <button className="font-semibold border-b-2 border-black pb-2">Rating & Reviews</button>
          </div>

          <Suspense fallback={<div className="py-6 text-center">Loading reviews…</div>}>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {reviews.length ? (
                reviews.map((r) => (
                  <div key={r.review_id}>
                    <ReviewCard r={r} />
                  </div>
                ))
              ) : (
                <div className="col-span-full text-gray-500 text-center py-8">
                  No reviews yet.
                </div>
              )}
            </div>
          </Suspense>

          <div>{product.description}</div>
        </section>

        <AlsoLikeGrid items={suggests} />
    </div>
  );
}
