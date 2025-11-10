import { useEffect } from "react";
import { Breadcrumb, ProductCard } from "../../components";
import { useFavorites } from "../../contexts/FavoritesContext";

export default function Wishlists() {
  const { favorites = [], loading, reload } = useFavorites();

  useEffect(() => {
    reload?.();
  }, [reload]);

  return (
    <div className="bg-white min-h-[60vh]">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Wishlists" },
          ]}
        />
        <div className="mt-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Favorites</h1>
            <p className="text-gray-500 text-sm">Products you've saved for later</p>
          </div>
          <span className="text-sm text-gray-500">
            {favorites.length} item{favorites.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="mt-12 text-center text-gray-500">Loading favorites…</div>
        ) : favorites.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <p className="text-lg font-medium text-gray-700">Your wishlist is empty</p>
            <p className="text-sm text-gray-500 mt-2">
              Explore our shop and tap the heart icon to save products you love.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((item) => (
              <ProductCard key={item.favorite_id || item.product_id} p={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
