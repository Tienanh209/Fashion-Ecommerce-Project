import { Card, Field } from "./Card";

const GENDERS = ["unisex", "women", "men", "kids"];

export default function ProductDetailsForm({
  form,
  categories = [],
  brands = [],
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onGenderChange,
  onBrandChange,
  onThumbnailChange,
  thumbnailPreview,
}) {
  return (
    <Card title="Product Details" sub="Essential product information">
      <div className="space-y-4">
        <Field label="Title *">
          <input
            value={form.title}
            onChange={onTitleChange}
            placeholder="Elegant wool coat"
            className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={onDescriptionChange}
            rows={4}
            placeholder="Detailed description..."
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category *">
            <select
              value={form.category_id != null ? String(form.category_id) : ""}
              onChange={onCategoryChange}
              className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300"
            >
              <option value="">Choose category</option>
              {categories.map((category) => (
                <option
                  key={category.value ?? category.label}
                  value={category.value != null ? String(category.value) : ""}
                >
                  {category.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Gender">
            <select
              value={form.gender}
              onChange={onGenderChange}
              className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300"
            >
              {GENDERS.map((genderOption) => (
                <option key={genderOption} value={genderOption}>
                  {genderOption}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand">
            <input
              list="brand-suggestions"
              value={form.brand}
              onChange={onBrandChange}
              placeholder="Brand name"
              className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
            <datalist id="brand-suggestions">
              {brands.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
          </Field>
          <Field label="Thumbnail" hint="Recommended 1200x1600px">
            <div className="flex items-center gap-3">
              <label
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm text-neutral-700 hover:bg-neutral-50"
                htmlFor="product-thumbnail"
              >
                Choose file
              </label>
              <input
                id="product-thumbnail"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onThumbnailChange}
              />
              {thumbnailPreview ? (
                <img
                  src={thumbnailPreview}
                  alt="thumbnail preview"
                  className="h-12 w-12 rounded-md object-cover"
                />
              ) : (
                <span className="text-xs text-neutral-500">No file selected</span>
              )}
            </div>
          </Field>
        </div>
      </div>
    </Card>
  );
}
