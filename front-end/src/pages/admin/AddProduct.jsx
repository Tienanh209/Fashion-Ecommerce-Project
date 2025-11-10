import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

import {
  listProducts as apiListProducts,
  getProduct as apiGetProduct,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  addVariant as apiAddVariant,
  updateVariant as apiUpdateVariant,
  deleteVariant as apiDeleteVariant,
  addGallery as apiAddGallery,
  deleteGallery as apiDeleteGallery,
} from "../../services/products";
import { listCategories } from "../../services/categories";
import { listBrands } from "../../services/brands";
import { imgUrl } from "../../utils/image";

import ProductSelector from "../../components/admin/products/ProductSelector";
import ProductDetailsForm from "../../components/admin/products/ProductDetailsForm";
import VariantManager from "../../components/admin/products/VariantManager";
import GalleryManager from "../../components/admin/products/GalleryManager";
import PricingCard from "../../components/admin/products/PricingCard";
import SummaryStats from "../../components/admin/products/SummaryStats";
import StockImportCard from "../../components/admin/products/StockImportCard";

const DEFAULT_SIZE_OPTIONS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
];
const NUMERIC_SIZE_OPTIONS = [
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "32",
  "33",
  "34",
];
const NUMERIC_SIZE_CATEGORIES = [
  "jean",
  "pant",
  "trouser",
  "denim",
  "chino",
  "cargo",
  "shorts",
];
const COLOR_OPTIONS = [
  "Black",
  "White",
  "Navy",
  "Gray",
  "Beige",
  "Brown",
  "Red",
  "Pink",
  "Blue",
  "Green",
  "Yellow",
  "Purple",
  "Orange",
  "Cream",
];

const CSV_INSTRUCTIONS =
  "Expected CSV header: sku,size,color,stock,price. Existing SKUs will be replaced.";

const MATERIAL_OPTIONS = [
  "Cotton",
  "Spandex",
  "Silk",
  "Wool",
  "Denim",
  "Leather",
];

function getSizeOptions(categoryName = "") {
  const slug = categoryName.toLowerCase();
  const matchesNumeric = NUMERIC_SIZE_CATEGORIES.some((keyword) =>
    slug.includes(keyword)
  );
  return matchesNumeric ? NUMERIC_SIZE_OPTIONS : DEFAULT_SIZE_OPTIONS;
}

function segmentFrom(value = "", length = 3, fallback = "GEN") {
  const normalized = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (!normalized) return fallback.slice(0, length);
  if (normalized.length >= length) return normalized.slice(0, length);
  return normalized.padEnd(length, "X");
}

function buildSku(categoryName = "", title = "", size = "", color = "") {
  if (!categoryName && !title) return "";
  const baseSegment =
    segmentFrom(categoryName, 3, "CAT") + segmentFrom(title, 3, "SKU");
  const parts = [baseSegment];
  if (size) parts.push(String(size).toUpperCase());
  if (color) parts.push(segmentFrom(color, 3, "CLR"));
  return parts.join("-");
}

const initialForm = {
  title: "",
  description: "",
  category_id: null,
  gender: "unisex",
  brand: "",
  price: 0,
  discount: 0,
  material: "",
};

const initialVariantForm = {
  sku: "",
  size: "",
  color: "",
  stock: "",
  price: "",
};

export default function AddProduct() {
  const [form, setForm] = useState(initialForm);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState("");

  const [mode, setMode] = useState("create");
  const [productId, setProductId] = useState(null);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productSelect, setProductSelect] = useState("");

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [variants, setVariants] = useState([]);
  const [variantForm, setVariantForm] = useState(initialVariantForm);
  const [variantBusy, setVariantBusy] = useState(false);
  const [skuEdited, setSkuEdited] = useState(false);
  const lastAutoSkuRef = useRef("");

  const [galleries, setGalleries] = useState([]);
  const [galleryBusy, setGalleryBusy] = useState(false);

  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [importingStock, setImportingStock] = useState(false);

  const [message, setMessage] = useState({ ok: "", err: "" });

  const stats = useMemo(() => {
    const totalVariants = variants.length;
    const totalStock = variants.reduce(
      (sum, item) => sum + Number(item.stock || 0),
      0
    );
    const lowStock = variants.filter((variant) => Number(variant.stock || 0) < 5)
      .length;
    return [
      { label: "Variants", value: totalVariants.toLocaleString() },
      { label: "Total Stock", value: totalStock.toLocaleString() },
      { label: "Low Stock (<5)", value: lowStock.toLocaleString() },
      {
        label: "Gallery Images",
        value: (galleries?.length || 0).toLocaleString(),
      },
    ];
  }, [variants, galleries]);

  const selectedCategory = useMemo(
    () =>
      categories.find((category) => category.category_id === form.category_id) || null,
    [categories, form.category_id]
  );

  const sizeOptions = useMemo(
    () => getSizeOptions(selectedCategory?.name || ""),
    [selectedCategory]
  );

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category?.name)
        .map((category) => ({
          label: category.name,
          value: category.category_id,
        })),
    [categories]
  );
  const brandOptions = useMemo(() => {
    const names = brands.map((brand) => brand.name).filter(Boolean);
    return [...new Set(names)];
  }, [brands]);

  const generatedSku = useMemo(
    () =>
      buildSku(
        selectedCategory?.name || "",
        form.title,
        variantForm.size,
        variantForm.color
      ),
    [selectedCategory, form.title, variantForm.size, variantForm.color]
  );

  const lowStockAlert = useMemo(() => {
    if (!variants.length) return "No variants yet.";
    const lowOrCritical = variants.filter(
      (variant) => Number(variant.stock || 0) < 5
    ).length;
    if (!lowOrCritical) return "All variants are adequately stocked.";
    return `${lowOrCritical} variant${lowOrCritical > 1 ? "s" : ""} running low on stock.`;
  }, [variants]);

  useEffect(() => {
    if (thumbnailFile) {
      const url = URL.createObjectURL(thumbnailFile);
      setThumbnailPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setThumbnailPreview(thumbnailUrl ? imgUrl(thumbnailUrl) : "");
    return undefined;
  }, [thumbnailFile, thumbnailUrl]);

  const resetForm = useCallback(() => {
    setForm(initialForm);
    setThumbnailFile(null);
    setThumbnailUrl("");
    setThumbnailPreview("");
    setVariants([]);
    setVariantForm(initialVariantForm);
    setGalleries([]);
    setMode("create");
    setProductId(null);
    setProductSelect("");
    setMessage({ ok: "", err: "" });
    setSkuEdited(false);
    lastAutoSkuRef.current = "";
  }, []);

  const loadProductDetail = useCallback(
    async (id) => {
      if (!id) return;
      try {
        setLoadingDetail(true);
        setMessage({ ok: "", err: "" });
        const detail = await apiGetProduct(id);
        if (!detail) {
          setMessage({ ok: "", err: "Product not found." });
          return;
        }

        setProductId(detail.product_id);
        setMode("edit");
        setForm({
          title: detail.title || "",
          description: detail.description || "",
          category_id: detail.category_id ?? null,
          gender: detail.gender || "unisex",
          brand: detail.brand || "",
          price: Number(detail.price || 0),
          discount: Number(detail.discount || 0),
          material: detail.material || "",
        });
        setThumbnailFile(null);
        setThumbnailUrl(detail.thumbnail || "");
        setThumbnailPreview(imgUrl(detail.thumbnail || ""));
        setVariants(detail.variants || []);
        setGalleries(detail.galleries || []);
        setVariantForm(initialVariantForm);
        setSkuEdited(false);
        lastAutoSkuRef.current = "";
      } catch (error) {
        console.error(error);
        setMessage({ ok: "", err: error?.message || "Failed to load product." });
      } finally {
        setLoadingDetail(false);
      }
    },
    []
  );

  const refreshProductList = useCallback(
    async (keyword = productSearch) => {
      setProductsLoading(true);
      try {
        const res = await apiListProducts({
          page: 1,
          limit: 100,
          title: keyword ? keyword.trim() : undefined,
        });
        const list = res?.products || [];
        setProducts(list);
      } catch (error) {
        console.error(error);
      } finally {
        setProductsLoading(false);
      }
    },
    [productSearch]
  );

  useEffect(() => {
    refreshProductList();
  }, [refreshProductList]);

  useEffect(() => {
    if (variantForm.size && !sizeOptions.includes(variantForm.size)) {
      setVariantForm((prev) => ({ ...prev, size: "" }));
    }
  }, [sizeOptions, variantForm.size]);

  useEffect(() => {
    if (mode === "create" && !form.category_id && categoryOptions.length) {
      setForm((prev) => ({
        ...prev,
        category_id: categoryOptions[0]?.value ?? null,
      }));
      setSkuEdited(false);
      lastAutoSkuRef.current = "";
    }
  }, [mode, form.category_id, categoryOptions]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [cats, brs] = await Promise.allSettled([
          listCategories(),
          listBrands(),
        ]);
        if (cancel) return;

        if (cats.status === "fulfilled") {
          const normalizedCategories = (cats.value || [])
            .map((item) => {
              if (typeof item === "string") {
                return {
                  category_id: Number(item) || null,
                  name: item,
                };
              }
              return {
                category_id:
                  Number(
                    item?.category_id ??
                      item?.id ??
                      item?.value ??
                      item?.categoryId ??
                      null
                  ) || null,
                name:
                  item?.name ||
                  item?.label ||
                  item?.category ||
                  item?.title ||
                  item?.category_name ||
                  "",
              };
            })
            .filter(
              (category) => category.category_id && category.name
            );
          setCategories(normalizedCategories);
        }

        if (brs.status === "fulfilled") {
          const normalizedBrands = (brs.value || [])
            .map((item) => {
              if (typeof item === "string") {
                return { brand_id: Number(item) || null, name: item };
              }
              return {
                brand_id: Number(item?.brand_id ?? item?.id ?? null) || null,
                name: item?.name || item?.title || "",
              };
            })
            .filter((brand) => brand.brand_id && brand.name);
          setBrands(normalizedBrands);
        }
      } catch (error) {
        console.warn("[AddProduct] Failed to preload options", error);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!productSelect) {
      setMode("create");
      setProductId(null);
      return;
    }
    const id = Number(productSelect);
    if (Number.isFinite(id)) {
      loadProductDetail(id);
    }
  }, [productSelect, loadProductDetail]);

  useEffect(() => {
    if (!generatedSku) return;
    const lastAuto = lastAutoSkuRef.current;
    const shouldUpdate =
      !skuEdited || !variantForm.sku || variantForm.sku === lastAuto;
    if (shouldUpdate && variantForm.sku !== generatedSku) {
      setVariantForm((prev) => ({ ...prev, sku: generatedSku }));
    }
    if (shouldUpdate) {
      lastAutoSkuRef.current = generatedSku;
    }
  }, [generatedSku, skuEdited, variantForm.sku]);

  const handleInputChange = (field) => (event) => {
    const value = event?.target?.value ?? event;
    if (field === "category_id") {
      const numeric = value === "" || value === null ? null : Number(value);
      setForm((prev) => ({ ...prev, category_id: numeric }));
      setSkuEdited(false);
      lastAutoSkuRef.current = "";
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (field === "title") {
        setSkuEdited(false);
        lastAutoSkuRef.current = "";
      }
    }
  };

  const handlePriceChange = (field) => (event) => {
    const value = event?.target?.value ?? event;
    const numeric = value === "" ? 0 : Number(value);
    setForm((prev) => ({ ...prev, [field]: Number.isFinite(numeric) ? numeric : 0 }));
  };

  const handleThumbnailChange = (event) => {
    const file = event.target.files?.[0];
    setThumbnailFile(file || null);
  };

  const handleSaveProduct = async () => {
    if (!form.title.trim()) {
      setMessage({ ok: "", err: "Product title is required." });
      return;
    }
    if (!form.category_id) {
      setMessage({ ok: "", err: "Please choose a category." });
      return;
    }

    if (!selectedCategory) {
      setMessage({ ok: "", err: "Please select a valid category." });
      return;
    }

    let brandId = null;
    if (form.brand) {
      const brandRecord = brands.find(
        (brand) => brand.name.toLowerCase() === form.brand.toLowerCase()
      );
      if (!brandRecord) {
        setMessage({ ok: "", err: "Please select a valid brand." });
        return;
      }
      brandId = brandRecord.brand_id;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      gender: form.gender || "unisex",
      price: Number(form.price || 0),
      discount: Number(form.discount || 0),
      category_id: selectedCategory.category_id,
      material: form.material || "",
    };

    if (brandId != null) payload.brand_id = brandId;
    if (thumbnailFile) payload.thumbnailFile = thumbnailFile;

    try {
      setSavingProduct(true);
      setMessage({ ok: "", err: "" });
      if (mode === "create") {
        const created = await apiCreateProduct(payload);
        const createdId =
          created?.product_id || created?.product?.product_id || null;
        setMessage({ ok: "Product created successfully.", err: "" });
        await refreshProductList("");
        if (createdId) {
          setProductSearch("");
          setProductSelect(String(createdId));
          await loadProductDetail(createdId);
        } else {
          resetForm();
        }
      } else if (productId) {
        await apiUpdateProduct(productId, payload);
        setMessage({ ok: "Product updated successfully.", err: "" });
        await loadProductDetail(productId);
        await refreshProductList();
      }
    } catch (error) {
      console.error(error);
      setMessage({ ok: "", err: error?.message || "Failed to save product." });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleVariantChange = (field) => (event) => {
    const value = event?.target?.value ?? event;
    if (field === "sku") {
      setSkuEdited(true);
    } else if (field === "size" || field === "color") {
      setSkuEdited(false);
      lastAutoSkuRef.current = "";
    }
    setVariantForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddVariant = async () => {
    if (!productId) {
      setMessage({ ok: "", err: "Save the product before adding variants." });
      return;
    }
    if (!variantForm.sku.trim()) {
      setMessage({ ok: "", err: "Variant SKU is required." });
      return;
    }
    try {
      setVariantBusy(true);
      await apiAddVariant(productId, {
        sku: variantForm.sku.trim(),
        size: variantForm.size || null,
        color: variantForm.color || null,
        stock:
          variantForm.stock === ""
            ? undefined
            : Number(variantForm.stock || 0),
        price:
          variantForm.price === "" ? null : Number(variantForm.price || 0),
      });
      setVariantForm(initialVariantForm);
      setSkuEdited(false);
      lastAutoSkuRef.current = "";
      setMessage({ ok: "Variant added.", err: "" });
      await loadProductDetail(productId);
    } catch (error) {
      console.error(error);
      setMessage({ ok: "", err: error?.message || "Failed to add variant." });
    } finally {
      setVariantBusy(false);
    }
  };

  const handleUpdateVariant = async (variantId, draft) => {
    try {
      setVariantBusy(true);
      await apiUpdateVariant(variantId, {
        stock:
          draft.stock === "" || draft.stock === undefined
            ? undefined
            : Number(draft.stock),
        price:
          draft.price === "" || draft.price === undefined
            ? null
            : Number(draft.price),
      });
      setMessage({ ok: "Variant updated.", err: "" });
      if (productId) await loadProductDetail(productId);
    } catch (error) {
      console.error(error);
      setMessage({ ok: "", err: error?.message || "Failed to update variant." });
    } finally {
      setVariantBusy(false);
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (!productId) return;
    if (!window.confirm("Remove this variant?")) return;
    try {
      setVariantBusy(true);
      await apiDeleteVariant(variantId);
      setMessage({ ok: "Variant removed.", err: "" });
      await loadProductDetail(productId);
    } catch (error) {
      console.error(error);
      setMessage({ ok: "", err: error?.message || "Failed to delete variant." });
    } finally {
      setVariantBusy(false);
    }
  };

  const handleAddGallery = async (event) => {
    if (!productId) {
      setMessage({ ok: "", err: "Save the product before adding gallery images." });
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setGalleryBusy(true);
      await apiAddGallery(productId, file);
      setMessage({ ok: "Gallery image uploaded.", err: "" });
      event.target.value = "";
      await loadProductDetail(productId);
    } catch (error) {
      console.error(error);
      setMessage({ ok: "", err: error?.message || "Failed to upload image." });
    } finally {
      setGalleryBusy(false);
    }
  };

  const handleDeleteGallery = async (galleryId) => {
    if (!productId) return;
    if (!window.confirm("Remove this gallery image?")) return;
    try {
      setGalleryBusy(true);
      await apiDeleteGallery(galleryId);
      setMessage({ ok: "Gallery image removed.", err: "" });
      await loadProductDetail(productId);
    } catch (error) {
      console.error(error);
      setMessage({ ok: "", err: error?.message || "Failed to delete image." });
    } finally {
      setGalleryBusy(false);
    }
  };

  const handleImportStock = async (event) => {
    if (!productId) {
      setMessage({ ok: "", err: "Save the product before importing stock." });
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).map((line) => line.trim());
    if (lines.length <= 1) {
      setMessage({ ok: "", err: "CSV file is empty." });
      event.target.value = "";
      return;
    }

    const headers = lines[0]
      .split(",")
      .map((header) => header.trim().toLowerCase());

    const idx = {
      sku: headers.indexOf("sku"),
      size: headers.indexOf("size"),
      color: headers.indexOf("color"),
      stock: headers.indexOf("stock"),
      price: headers.indexOf("price"),
    };

    if (idx.sku === -1) {
      setMessage({ ok: "", err: "CSV must include a 'sku' column." });
      event.target.value = "";
      return;
    }

    const updates = [];
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line) continue;
      const cells = line.split(",").map((cell) => cell.trim());
      const sku = cells[idx.sku];
      if (!sku) continue;
      updates.push({
        sku,
        size: idx.size !== -1 ? cells[idx.size] : "",
        color: idx.color !== -1 ? cells[idx.color] : "",
        stock: idx.stock !== -1 ? cells[idx.stock] : "",
        price: idx.price !== -1 ? cells[idx.price] : "",
      });
    }

    if (!updates.length) {
      setMessage({ ok: "", err: "No valid rows detected in CSV." });
      event.target.value = "";
      return;
    }

    try {
      setImportingStock(true);
      for (const row of updates) {
        const existing = variants.find(
          (variant) => String(variant.sku).toLowerCase() === row.sku.toLowerCase()
        );

        if (existing) {
          await apiUpdateVariant(existing.variant_id, {
            size: row.size || existing.size || null,
            color: row.color || existing.color || null,
            stock:
              row.stock === "" || row.stock === undefined
                ? existing.stock
                : Number(row.stock),
            price:
              row.price === "" || row.price === undefined
                ? existing.price
                : Number(row.price),
          });
        } else {
          await apiAddVariant(productId, {
            sku: row.sku,
            size: row.size || null,
            color: row.color || null,
            stock: row.stock === "" ? 0 : Number(row.stock || 0),
            price: row.price === "" ? null : Number(row.price || 0),
          });
        }
      }
      setMessage({ ok: "Stock import completed.", err: "" });
      await loadProductDetail(productId);
    } catch (error) {
      console.error(error);
      setMessage({ ok: "", err: error?.message || "Failed to import stock." });
    } finally {
      setImportingStock(false);
      event.target.value = "";
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const keyword = productSearch.trim().toLowerCase();
    return products.filter((product) =>
      String(product.title || "")
        .toLowerCase()
        .includes(keyword)
    );
  }, [products, productSearch]);

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              {mode === "create" ? "Add Product" : `Edit Product #${productId}`}
            </h1>
            <p className="text-sm text-neutral-500">
              {mode === "create"
                ? "Create a new product and manage its variants."
                : "Update product information, variants, and gallery assets."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === "edit" ? (
              <button
                type="button"
                className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                onClick={resetForm}
                disabled={savingProduct || loadingDetail}
              >
                Start New
              </button>
            ) : null}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50"
              onClick={handleSaveProduct}
              disabled={savingProduct || loadingDetail}
            >
              {savingProduct ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : null}
              {mode === "create" ? "Create Product" : "Update Product"}
            </button>
          </div>
        </header>

        <ProductSelector
          products={filteredProducts}
          loading={productsLoading || loadingDetail}
          search={productSearch}
          onSearchChange={(value) => setProductSearch(value)}
          selected={productSelect}
          onSelect={(value) => setProductSelect(value)}
          onReload={() =>
            productSelect && loadProductDetail(Number(productSelect))
          }
          mode={mode}
          productId={productId}
          onReset={resetForm}
          saving={savingProduct}
        />

        {message.err ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message.err}
          </div>
        ) : null}
        {message.ok ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message.ok}
          </div>
        ) : null}

        <div className="mb-4 rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-start gap-3 px-5 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-neutral-700" />
            <div>
              <div className="text-sm font-medium text-neutral-900">
                Inventory Alert
              </div>
              <div className="text-sm text-neutral-600">{lowStockAlert}</div>
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ProductDetailsForm
            form={form}
            categories={categoryOptions}
            brands={brandOptions}
            materialOptions={MATERIAL_OPTIONS}
            onTitleChange={handleInputChange("title")}
            onDescriptionChange={handleInputChange("description")}
            onMaterialChange={handleInputChange("material")}
            onCategoryChange={handleInputChange("category_id")}
            onGenderChange={handleInputChange("gender")}
            onBrandChange={handleInputChange("brand")}
            onThumbnailChange={handleThumbnailChange}
            thumbnailPreview={thumbnailPreview}
          />

            <VariantManager
              variants={variants}
              variantForm={variantForm}
              variantBusy={variantBusy}
              onVariantChange={handleVariantChange}
              onAddVariant={handleAddVariant}
              onDeleteVariant={handleDeleteVariant}
              onUpdateVariant={handleUpdateVariant}
              disableActions={!productId}
              sizeOptions={sizeOptions}
              colorOptions={COLOR_OPTIONS}
            />

            <GalleryManager
              galleries={galleries}
              onAdd={handleAddGallery}
              onDelete={handleDeleteGallery}
              busy={galleryBusy || !productId}
            />
          </div>

          <div className="space-y-6">
            <PricingCard
              price={form.price}
              discount={form.discount}
              onPriceChange={handlePriceChange("price")}
              onDiscountChange={handlePriceChange("discount")}
            />

            <SummaryStats stats={stats} />

            <StockImportCard
              instructions={CSV_INSTRUCTIONS}
              importing={importingStock}
              onImport={handleImportStock}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
