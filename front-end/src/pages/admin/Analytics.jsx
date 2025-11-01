import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";

import { listOrders, getOrder } from "../../services/orders";
import { listCategories } from "../../services/categories";

const fmtVND = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

const PIE_COLORS = [
  "#111827",
  "#1f2937",
  "#374151",
  "#4b5563",
  "#6b7280",
  "#9ca3af",
  "#d1d5db",
];

const ORDER_REVENUE_STATUSES = new Set(["paid", "shipped", "completed"]);
const MAX_MONTHS = 10;
const MAX_CATEGORIES = 6;
const UNCATEGORIZED = "Uncategorized";

function formatPercent(value, fractionDigits = 1, suffix = "%") {
  if (!Number.isFinite(value)) return `0${suffix}`;
  const rounded = value.toFixed(fractionDigits);
  return `${value >= 0 ? "+" : ""}${rounded}${suffix}`;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState([]);
  const [barData, setBarData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [topCategories, setTopCategories] = useState([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ordersRes, categoriesRes] = await Promise.all([
        listOrders({ page: 1, limit: 2000 }),
        listCategories().catch(() => []),
      ]);

      const ordersRaw =
        ordersRes?.orders || ordersRes?.items || ordersRes?.data?.orders || [];
      const categories = Array.isArray(categoriesRes) ? categoriesRes : [];
      const categoryEntries = categories
        .map((cat) => {
          const rawId =
            cat?.category_id ?? cat?.id ?? cat?.value ?? cat?.categoryId ?? null;
          const id = rawId != null ? String(rawId) : null;
          const name =
            cat?.name ||
            "";
          if (!id || !name) return null;
          return [id, name];
        })
        .filter(Boolean);
      const categoryMap = new Map(categoryEntries);

      const validOrders = ordersRaw.filter((order) => order?.created_at);

      const monthlyRevenue = new Map();
      const monthlyOrdersCount = new Map();
      const monthlyCompletedCount = new Map();
      const monthByOrderId = new Map();

      validOrders.forEach((order) => {
        const createdAt = dayjs(order.created_at);
        if (!createdAt.isValid()) return;
        const key = createdAt.format("YYYY-MM");
        monthByOrderId.set(order.order_id, key);
        if (!monthlyRevenue.has(key)) monthlyRevenue.set(key, 0);
        monthlyOrdersCount.set(key, (monthlyOrdersCount.get(key) || 0) + 1);
        if (ORDER_REVENUE_STATUSES.has(order.status)) {
          monthlyCompletedCount.set(
            key,
            (monthlyCompletedCount.get(key) || 0) + 1
          );
        }
      });

      const revenueOrders = validOrders.filter((order) =>
        ORDER_REVENUE_STATUSES.has(order.status)
      );

      const detailResults = await Promise.allSettled(
        revenueOrders.map((order) => getOrder(order.order_id))
      );

      const categoryTotals = new Map();

      const computeItemSalePrice = (item = {}) => {
        const variantPriceRaw = item.variant_price;
        const snapshotPriceRaw = item.price;
        const productPriceRaw = item.product_price;
        const discountPct = Number(item.product_discount || 0);

        const hasVariantPrice =
          variantPriceRaw !== undefined && variantPriceRaw !== null;
        const hasSnapshotPrice =
          snapshotPriceRaw !== undefined && snapshotPriceRaw !== null;
        const hasProductPrice =
          productPriceRaw !== undefined && productPriceRaw !== null;

        const variantPrice = hasVariantPrice ? Number(variantPriceRaw) : null;
        const snapshotPrice = hasSnapshotPrice ? Number(snapshotPriceRaw) : null;
        const productPrice = hasProductPrice ? Number(productPriceRaw) : null;

        const applyDiscount = (price) =>
          discountPct > 0
            ? Math.max(0, Math.round(price * ((100 - discountPct) / 100)))
            : Math.max(0, Math.round(price));

        if (variantPrice !== null && Number.isFinite(variantPrice)) {
          return applyDiscount(variantPrice);
        }

        if (snapshotPrice !== null && Number.isFinite(snapshotPrice)) {
          if (
            discountPct > 0 &&
            productPrice !== null &&
            Number.isFinite(productPrice) &&
            Math.round(snapshotPrice) === Math.round(productPrice)
          ) {
            return applyDiscount(snapshotPrice);
          }
          return Math.max(0, Math.round(snapshotPrice));
        }

        if (productPrice !== null && Number.isFinite(productPrice)) {
          return applyDiscount(productPrice);
        }

        return 0;
      };

      detailResults.forEach((result, index) => {
        const orderMeta = revenueOrders[index];
        const monthKey = monthByOrderId.get(orderMeta?.order_id);
        const orderTotal = Math.max(
          0,
          Math.round(
            Number(
              (result.status === "fulfilled"
                ? result.value?.order?.total_price ?? result.value?.total_price
                : null) ?? orderMeta?.total_price ?? 0
            )
          )
        );

        if (result.status !== "fulfilled") {
          if (orderTotal > 0) {
            categoryTotals.set(
              UNCATEGORIZED,
              (categoryTotals.get(UNCATEGORIZED) || 0) + orderTotal
            );
            if (monthKey) {
              monthlyRevenue.set(
                monthKey,
                (monthlyRevenue.get(monthKey) || 0) + orderTotal
              );
            }
          }
          return;
        }

        const detail = result.value?.order || result.value;
        const items = detail?.items || [];

        const perOrderCategory = new Map();
        items.forEach((item) => {
          const salePrice = computeItemSalePrice(item);
          const revenue = Math.round(
            salePrice * Number(item.quantity || 0)
          );
          if (!revenue) return;

          const catRaw =
            item.category_id ??
            item.product?.category_id ??
            item.product?.categoryId ??
            null;
          const catKey = catRaw != null ? String(catRaw) : null;
          const fallbackName =
            item.category_name ||
            item.product?.category_name ||
            item.category ||
            item.product?.category ||
            "";
          const categoryName =
            (catKey ? categoryMap.get(catKey) : null) ||
            fallbackName ||
            UNCATEGORIZED;

          perOrderCategory.set(
            categoryName,
            (perOrderCategory.get(categoryName) || 0) + revenue
          );
        });

        if (perOrderCategory.size === 0) {
          if (orderTotal > 0) {
            categoryTotals.set(
              UNCATEGORIZED,
              (categoryTotals.get(UNCATEGORIZED) || 0) + orderTotal
            );
            if (monthKey) {
              monthlyRevenue.set(
                monthKey,
                (monthlyRevenue.get(monthKey) || 0) + orderTotal
              );
            }
          }
          return;
        }

        const entries = Array.from(perOrderCategory.entries());
        let itemsRevenueTotal = entries.reduce(
          (sum, [, amount]) => sum + amount,
          0
        );

        if (orderTotal > 0 && orderTotal !== itemsRevenueTotal) {
          const diff = orderTotal - itemsRevenueTotal;
          let adjustIndex = 0;
          let maxValue = -Infinity;
          entries.forEach(([, amount], idx) => {
            if (amount > maxValue) {
              maxValue = amount;
              adjustIndex = idx;
            }
          });
          entries[adjustIndex][1] = Math.max(0, entries[adjustIndex][1] + diff);
          itemsRevenueTotal = orderTotal;
        }

        entries.forEach(([categoryName, amount]) => {
          categoryTotals.set(
            categoryName,
            (categoryTotals.get(categoryName) || 0) + amount
          );
        });

        if (monthKey) {
          monthlyRevenue.set(
            monthKey,
            (monthlyRevenue.get(monthKey) || 0) + itemsRevenueTotal
          );
        }
      });

      const sortedMonths = Array.from(monthlyRevenue.keys()).sort();
      const monthsToDisplay = sortedMonths.slice(-MAX_MONTHS);
      const barChartData = monthsToDisplay.map((key) => {
        const monthDate = dayjs(`${key}-01`);
        const revenue = monthlyRevenue.get(key) || 0;
        return {
          name: monthDate.format("MMM"),
          revenue,
          target: Math.round(revenue * 1.05),
        };
      });

      const latestKey = monthsToDisplay[monthsToDisplay.length - 1] || null;
      const prevKey = monthsToDisplay[monthsToDisplay.length - 2] || null;

      const latestRevenue = latestKey ? monthlyRevenue.get(latestKey) || 0 : 0;
      const prevRevenue = prevKey ? monthlyRevenue.get(prevKey) || 0 : 0;
      const revenueDelta = latestRevenue - prevRevenue;
      const revenueGrowth = prevRevenue
        ? (revenueDelta / prevRevenue) * 100
        : 0;

      const latestOrdersCount = latestKey
        ? monthlyOrdersCount.get(latestKey) || 0
        : 0;
      const prevOrdersCount = prevKey
        ? monthlyOrdersCount.get(prevKey) || 0
        : 0;

      const latestCompleted = latestKey
        ? monthlyCompletedCount.get(latestKey) || 0
        : 0;
      const prevCompleted = prevKey
        ? monthlyCompletedCount.get(prevKey) || 0
        : 0;

      const conversionRate = latestOrdersCount
        ? (latestCompleted / latestOrdersCount) * 100
        : 0;
      const prevConversionRate = prevOrdersCount
        ? (prevCompleted / prevOrdersCount) * 100
        : 0;
      const conversionDelta = conversionRate - prevConversionRate;

      const avgTransaction = latestCompleted
        ? latestRevenue / latestCompleted
        : 0;
      const prevAvgTransaction = prevCompleted
        ? prevRevenue / prevCompleted
        : 0;
      const avgTransactionDeltaValue = avgTransaction - prevAvgTransaction;

      const totalCategoryRevenue = Array.from(categoryTotals.values()).reduce(
        (sum, value) => sum + value,
        0
      );

      const categoriesSorted = Array.from(categoryTotals.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const pieChartData = categoriesSorted.slice(0, MAX_CATEGORIES).map(({ name, value }) => {
        const percentage = totalCategoryRevenue
          ? (value / totalCategoryRevenue) * 100
          : 0;
        return {
          name,
          value,
          percentage,
          label: `${name} (${percentage.toFixed(1)}%) - ${fmtVND(value)}`,
        };
      });

      const topCategoryData = categoriesSorted.slice(0, 5).map((entry) => ({
        ...entry,
        pct: totalCategoryRevenue
          ? Math.round((entry.value / totalCategoryRevenue) * 100)
          : 0,
      }));

      setStats([
        {
          title: "Monthly Revenue",
          value: fmtVND(latestRevenue),
          delta: `${revenueDelta >= 0 ? "+" : ""}${fmtVND(revenueDelta)} vs last month`,
          positive: revenueGrowth >= 0,
        },
        {
          title: "Conversion Rate",
          value: `${conversionRate.toFixed(1)}%`,
          delta: `${formatPercent(conversionDelta, 1, " pts")}`,
          positive: conversionDelta >= 0,
        },
        {
          title: "Avg. Order Value",
          value: fmtVND(avgTransaction || 0),
          delta: `${avgTransactionDeltaValue >= 0 ? "+" : ""}${fmtVND(
            avgTransactionDeltaValue
          )} vs last month`,
          positive: avgTransactionDeltaValue >= 0,
        },
      ]);

      setBarData(barChartData);
      setPieData(pieChartData);
      setTopCategories(topCategoryData);
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError?.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900">Analytics</h1>
          <p className="text-sm text-neutral-500">
            Deep insights into your store performance and trends
          </p>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {loading && stats.length === 0 ? (
            <Card title="Loading" sub="Preparing analytics">
              <div className="py-8 text-center text-sm text-neutral-500">
                Calculating metrics…
              </div>
            </Card>
          ) : error ? (
            <Card title="Analytics" sub="">
              <div className="py-8 text-center text-sm text-red-600">
                {error}
              </div>
            </Card>
          ) : (
            stats.map((stat) => <StatCard key={stat.title} {...stat} />)
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Revenue vs Target" sub="Monthly performance comparison">
            <div className="h-72 w-full">
              {barData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                  No revenue data yet.
                </div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={barData} margin={{ left: 24 }}>
                    <CartesianGrid vertical={false} stroke="#e5e5e5" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#737373", fontSize: 12 }}
                      axisLine={{ stroke: "#d4d4d4" }}
                    />
                    <YAxis
                      tick={{ fill: "#737373", fontSize: 12 }}
                      axisLine={{ stroke: "#d4d4d4" }}
                      tickFormatter={(v) => fmtVND(v)}
                    />
                    <Tooltip
                      formatter={(v, k) =>
                        k === "revenue" || k === "target"
                          ? [fmtVND(v), k]
                          : [v, k]
                      }
                    />
                    <Legend wrapperStyle={{ paddingTop: 16 }} iconType="rect" />
                    <Bar dataKey="revenue" name="Revenue" fill="#111827" />
                    <Bar dataKey="target" name="Target" fill="#9ca3af" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card title="Sales by Category" sub="Revenue distribution across categories">
            <div className="h-72 w-full">
              {pieData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                  Not enough data to display category breakdown.
                </div>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={90}
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                        
                      ))}

                      <LabelList
                        position="outside"
                        dataKey="label"
                        style={{ fill: "#111827", fontSize: 12 }}
                      />
                    </Pie>
                    <Tooltip
                      formatter={(v, k, entry) => [
                        fmtVND(v),
                        entry?.payload?.name || entry?.name || k || "Uncategorized",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Top categories */}
        <div className="mt-6">
          <Card title="Top Performing Categories" sub="Revenue share by category">
            {topCategories.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-500">
                Not enough sales data yet.
              </div>
            ) : (
              <div className="divide-y divide-neutral-200">
                {topCategories.map((category, index) => (
                  <div key={category.name} className="flex items-center gap-4 py-4">
                    <div className="w-8 text-sm font-medium text-neutral-600">
                      {index + 1}
                    </div>
                    <div className="min-w-40 flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-base font-medium text-neutral-900">
                          {category.name}
                        </span>
                        <span className="text-base font-semibold text-neutral-900">
                          {fmtVND(category.value)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-neutral-100">
                        <div
                          className="h-2 rounded-full bg-neutral-300"
                          style={{ width: `${category.pct}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {category.pct}% of total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small UI ---------- */
function StatCard({ title, value, delta, positive }) {
  const isPositive = positive !== undefined ? positive : true;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-5 py-3 text-sm text-neutral-500">
        {title}
      </div>
      <div className="flex items-center justify-between px-5 py-5">
        <div>
          <div className="text-2xl font-semibold text-neutral-900">{value}</div>
          <div
            className={`mt-1 inline-flex items-center gap-1 text-sm font-medium ${
              isPositive ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {delta}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, sub, children }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-5 py-4">
        <div className="text-sm font-medium text-neutral-900">{title}</div>
        {sub && <div className="text-sm text-neutral-500">{sub}</div>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
