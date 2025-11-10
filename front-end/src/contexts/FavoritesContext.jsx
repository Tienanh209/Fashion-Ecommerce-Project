import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  listFavorites as apiListFavorites,
  addFavorite as apiAddFavorite,
  removeFavorite as apiRemoveFavorite,
  resolveUserId,
} from "../services/favorites";

const FavoritesCtx = createContext(null);

export function FavoritesProvider({ children }) {
  const { user, ready } = useAuth();
  const userId = resolveUserId(user);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!userId) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiListFavorites(userId);
      setFavorites(Array.isArray(data) ? data : data?.favorites || []);
    } catch (error) {
      console.warn("[favorites] load failed", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      setFavorites([]);
      return;
    }
    loadFavorites();
  }, [userId, ready, loadFavorites]);

  const addFavorite = useCallback(
    async (product_id) => {
      if (!userId) throw new Error("Login required");
      const entry = await apiAddFavorite(userId, product_id);
      if (!entry) return null;
      setFavorites((prev) => {
        const filtered = prev.filter(
          (item) => Number(item.product_id) !== Number(entry.product_id)
        );
        return [...filtered, entry];
      });
      return entry;
    },
    [userId]
  );

  const removeFavorite = useCallback(
    async (product_id) => {
      if (!userId) throw new Error("Login required");
      await apiRemoveFavorite(userId, product_id);
      setFavorites((prev) =>
        prev.filter((item) => Number(item.product_id) !== Number(product_id))
      );
    },
    [userId]
  );

  const toggleFavorite = useCallback(
    async (product_id) => {
      if (!userId) throw new Error("Login required");
      const exists = favorites.some(
        (item) => Number(item.product_id) === Number(product_id)
      );
      if (exists) {
        await removeFavorite(product_id);
        return false;
      }
      await addFavorite(product_id);
      return true;
    },
    [userId, favorites, addFavorite, removeFavorite]
  );

  const value = useMemo(() => {
    const ids = new Set(favorites.map((item) => Number(item.product_id)));
    const isFavorite = (product_id) => ids.has(Number(product_id));
    return {
      favorites,
      loading,
      userId,
      reload: loadFavorites,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      isFavorite,
      count: favorites.length,
    };
  }, [favorites, loading, userId, loadFavorites, addFavorite, removeFavorite, toggleFavorite]);

  return <FavoritesCtx.Provider value={value}>{children}</FavoritesCtx.Provider>;
}

export function useFavorites() {
  return useContext(FavoritesCtx) || {
    favorites: [],
    loading: false,
    userId: null,
    reload: () => {},
    addFavorite: async () => {},
    removeFavorite: async () => {},
    toggleFavorite: async () => {},
    isFavorite: () => false,
    count: 0,
  };
}
