import { Card, Field } from "./Card";

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export default function PricingCard({ price, onPriceChange }) {
  return (
    <Card title="Pricing" sub="Set product pricing in VND">
      <div className="space-y-3">
        <Field label="Retail price *" hint={moneyFormatter.format(price || 0)}>
          <input
            type="number"
            min="0"
            value={price}
            onChange={onPriceChange}
            className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </Field>
      </div>
    </Card>
  );
}
