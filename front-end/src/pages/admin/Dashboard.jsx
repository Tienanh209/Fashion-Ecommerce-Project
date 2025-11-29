import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isBetween from "dayjs/plugin/isBetween";
import {
  DollarSign,
  Calendar,
  Users,
  Boxes,
  TrendingUp,
  TrendingDown,
  CircleDot,
} from "lucide-react";

import {
  listOrders as apiListOrders,
  getOrder as apiGetOrder,
} from "../../services/orders";
import {
  listProducts as apiListProducts,
  getProduct as apiGetProduct,
} from "../../services/products";

dayjs.extend(relativeTime);
dayjs.extend(isBetween);

/* ---- helpers ---- */
const fmtVND = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const MAX_ORDERS = 120;
const REVENUE_STATUSES = new Set(["shipped", "completed"]);
const ORDER_CARD_STATUSES = ["completed", "paid", "shipped", "pending"];
const STATUS_LABELS = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TIER_THRESHOLDS = {
  diamond: 15000000,
  gold: 8000000,
  silver: 3000000,
};

const STATUS_BADGES = {
  pending: "bg-yellow-100 text-yellow-700 rounded-2xl px-2 py-1",
  paid: "bg-blue-100 text-blue-700 rounded-2xl px-2 py-1",
  shipped: "bg-indigo-100 text-indigo-700 rounded-2xl px-2 py-1",
  completed: "bg-green-100 text-green-700 rounded-2xl px-2 py-1",
  cancelled: "bg-red-100 text-red-700 rounded-2xl px-2 py-1",
};

const RANGE_OPTIONS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

const RANGE_CONFIG = {
  day: {
    label: "Today",
    prevLabel: "yesterday",
    unit: "day",
    start: (now) => now.startOf("day"),
  },
  week: {
    label: "This week",
    prevLabel: "last week",
    unit: "week",
    start: (now) => now.startOf("week"),
  },
  month: {
    label: "This month",
    prevLabel: "last month",
    unit: "month",
    start: (now) => now.startOf("month"),
  },
  year: {
    label: "This year",
    prevLabel: "last year",
    unit: "year",
    start: (now) => now.startOf("year"),
  },
};

const INITIAL_METRICS = {
  revenue: {
    total: 0,
    live: 0,
    gross: 0,
    avgSell: 0,
    avgCost: 0,
    units: 0,
    deltaPct: 0,
  },
  orders: {
    today: 0,
    deltaPct: 0,
    activeNow: 0,
    breakdown: {
      completed: 0,
      paid: 0,
      shipped: 0,
      pending: 0,
    },
  },
  customers: {
    total: 0,
    deltaPct: 0,
    newToday: 0,
    tiers: {
      bronze: 0,
      silver: 0,
      gold: 0,
      diamond: 0,
    },
  },
  inventory: {
    totalUnits: 0,
    variantCount: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outStockCount: 0,
  },
};

const percentChange = (current, previous) => {
  if (!Number.isFinite(previous) || previous === 0) {
    return Number.isFinite(current) && current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

const formatDeltaText = (value, suffix = "vs prev period") => {
  if (!Number.isFinite(value)) return `0% ${suffix}`;
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%  ${suffix}`;
};

const assignTier = (spent) => {
  if (spent >= TIER_THRESHOLDS.diamond) return "diamond";
  if (spent >= TIER_THRESHOLDS.gold) return "gold";
  if (spent >= TIER_THRESHOLDS.silver) return "silver";
  return "bronze";
};

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

const safeParseDate = (value, fallback = dayjs()) => {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : fallback;
};

const getRangeWindow = (key, now = dayjs(), { rangeStart, rangeEnd } = {}) => {
  if (key === "custom-range") {
    const startCandidate = safeParseDate(rangeStart, now.startOf("day"));
    const endCandidate = safeParseDate(rangeEnd, now.endOf("day"));
    const start =
      endCandidate.isBefore(startCandidate) ? endCandidate : startCandidate;
    const end =
      endCandidate.isBefore(startCandidate) ? startCandidate : endCandidate;
    const days = Math.max(end.diff(start, "day") + 1, 1);
    const prevStart = start.subtract(days, "day");
    const prevEnd = start.subtract(1, "day").endOf("day");
    return {
      start,
      end,
      prevStart,
      prevEnd,
      label: `${start.format("YYYY-MM-DD")} to ${end.format("YYYY-MM-DD")}`,
      prevLabel: "previous range",
    };
  }

  const cfg = RANGE_CONFIG[key] || RANGE_CONFIG.month;
  const start = cfg.start(now);
  const end = now;
  const prevStart = start.subtract(1, cfg.unit);
  const prevEnd = start.subtract(1, "millisecond");
  return {
    start,
    end,
    prevStart,
    prevEnd,
    label: cfg.label,
    prevLabel: cfg.prevLabel,
  };
};

const filterOrdersInRange = (orders = [], start, end) =>
  (orders || []).filter((o) =>
    o.createdAt?.isBetween(start, end, "millisecond", "[]")
  );

const computeSalesStats = (orders = [], detailMap = new Map(), variantCostMap = new Map()) => {
  let gross = 0;
  let totalCost = 0;
  let units = 0;

  orders.forEach((order) => {
    const detail = detailMap.get(order.order_id);
    const items = detail?.items || [];
    items.forEach((item) => {
      const qty = Number(item.quantity || 0);
      if (!qty) return;
      const salePrice = computeItemSalePrice(item);
      const variantId = item.variant_id ?? item.variantId;
      const costCandidate = variantCostMap?.get(Number(variantId));
      const costUnit = Number.isFinite(costCandidate) ? costCandidate : 0;
      gross += salePrice * qty;
      totalCost += costUnit * qty;
      units += qty;
    });
  });

  const avgSell = units ? gross / units : 0;
  const avgCost = units ? totalCost / units : 0;

  return {
    gross,
    totalCost,
    avgSell,
    avgCost,
    profit: gross - totalCost,
    units,
  };
};

const buildTopProducts = (
  revenueOrders = [],
  detailMap = new Map(),
  productStocks = new Map()
) => {
  const productTotals = new Map();

  revenueOrders.forEach((order) => {
    const detail = detailMap.get(order.order_id);
    const items = detail?.items || [];
    items.forEach((item) => {
      const quantity = Number(item.quantity || 0);
      if (!quantity) return;
      const salePrice = computeItemSalePrice(item);
      const revenue = salePrice * quantity;
      if (!revenue) return;
      const key = item.product_id || item.variant_id;
      if (!key) return;
      const existing = productTotals.get(key) || {
        product_id: item.product_id || null,
        variant_id: item.variant_id,
        name:
          item.product_title ||
          item.product?.title ||
          `Variant ${item.variant_id}`,
        category:
          item.category_name ||
          item.category ||
          item.product?.category ||
          "Products",
        revenue: 0,
        sold: 0,
      };
      existing.revenue += revenue;
      existing.sold += quantity;
      productTotals.set(key, existing);
    });
  });

  return Array.from(productTotals.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)
    .map((entry, index) => {
      const stockInfo =
        entry.product_id != null ? productStocks.get(entry.product_id) : null;
      let stockLabel = "—";
      if (stockInfo) {
        if (
          !Number.isFinite(stockInfo.totalUnits) ||
          stockInfo.totalUnits <= 0
        ) {
          stockLabel = "Out";
        } else if (stockInfo.lowCount > 0) {
          stockLabel = "Low";
        } else {
          stockLabel = "In Stock";
        }
      }

      return {
        i: index + 1,
        name: entry.name,
        cat: entry.category,
        revenue: entry.revenue,
        sold: entry.sold,
        stock: stockLabel,
      };
    });
};

const buildRecentOrders = (orders = [], detailMap = new Map()) =>
  orders.slice(0, 30).map((order) => {
    const detail = detailMap.get(order.order_id);
    const items = detail?.items || [];
    const itemCount = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );
    return {
      id: `#${order.order_id}`,
      name: order.customerName,
      items: itemCount || items.length || "—",
      total: order.total,
      status: order.status,
      time: order.createdAt.fromNow(),
    };
  });

const computeDashboardForRange = (rangeKey, dataset, options = {}) => {
  if (!dataset) return null;
  const now = options.now || dayjs();
  const { start, end, prevStart, prevEnd } = getRangeWindow(
    rangeKey,
    now,
    options
  );
  const orders = dataset.orders || [];

  const rangeOrders = filterOrdersInRange(orders, start, end);
  const prevOrders = filterOrdersInRange(orders, prevStart, prevEnd);
  const revenueOrders = rangeOrders.filter((o) => REVENUE_STATUSES.has(o.status));
  const prevRevenueOrders = prevOrders.filter((o) => REVENUE_STATUSES.has(o.status));

  const sales = computeSalesStats(
    revenueOrders,
    dataset.detailMap,
    dataset.variantCostMap
  );
  const prevSales = computeSalesStats(
    prevRevenueOrders,
    dataset.detailMap,
    dataset.variantCostMap
  );
  const liveSales = computeSalesStats(
    revenueOrders.filter((o) => o.createdAt.isAfter(now.subtract(1, "hour"))),
    dataset.detailMap,
    dataset.variantCostMap
  );

  const orderBreakdown = ORDER_CARD_STATUSES.reduce((acc, key) => {
    acc[key] = rangeOrders.filter((o) => o.status === key).length;
    return acc;
  }, {});

  const activeOrdersNow = rangeOrders.filter((o) =>
    o.createdAt.isAfter(now.subtract(1, "hour"))
  ).length;

  return {
    metrics: {
      revenue: {
        total: sales.profit,
        live: liveSales.profit,
        gross: sales.gross,
        avgSell: sales.avgSell,
        avgCost: sales.avgCost,
        units: sales.units,
        deltaPct: percentChange(sales.profit, prevSales.profit),
      },
      orders: {
        today: rangeOrders.length,
        deltaPct: percentChange(rangeOrders.length, prevOrders.length),
        activeNow: activeOrdersNow,
        breakdown: orderBreakdown,
      },
      customers: dataset.customers || INITIAL_METRICS.customers,
      inventory: dataset.inventory || INITIAL_METRICS.inventory,
    },
    recentOrders: buildRecentOrders(rangeOrders, dataset.detailMap),
    topProducts: buildTopProducts(
      revenueOrders,
      dataset.detailMap,
      dataset.productStocks
    ),
  };
};

/* ---- page ---- */
export default function Dashboard() {
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [timeframe, setTimeframe] = useState("month");
  const [rangeStart, setRangeStart] = useState(
    dayjs().subtract(7, "day").format("YYYY-MM-DD")
  );
  const [rangeEnd, setRangeEnd] = useState(dayjs().format("YYYY-MM-DD"));
  const [baseData, setBaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const onRangeChange = (key, value) => {
    if (key === "start") setRangeStart(value);
    else setRangeEnd(value);
  };
  const rangeWindow = useMemo(
    () =>
      getRangeWindow(timeframe, baseData?.loadedAt ? dayjs(baseData.loadedAt) : dayjs(), {
        rangeStart,
        rangeEnd,
      }),
    [timeframe, baseData?.loadedAt, rangeStart, rangeEnd]
  );

  const cards = useMemo(() => {
    const revenue = metrics.revenue;
    const orders = metrics.orders;
    const customers = metrics.customers;
    const inventory = metrics.inventory;
    const prevLabel = rangeWindow.prevLabel || "previous period";
    const currentLabel = rangeWindow.label || "";

    const orderShare = (count) =>
      orders.today ? Math.round((count / orders.today) * 100) : 0;
    const tierShare = (count) =>
      customers.total ? Math.round((count / customers.total) * 100) : 0;
    const variantShare = (count) =>
      inventory.variantCount
        ? Math.round((count / inventory.variantCount) * 100)
        : 0;
    const availabilityPct = inventory.variantCount
      ? ((inventory.variantCount - inventory.outStockCount) /
          inventory.variantCount) *
        100
      : 0;

    return [
      {
        title: `Total Revenue (${currentLabel})`,
        value: loading ? "…" : fmtVND(revenue.total),
        delta: {
          text: formatDeltaText(revenue.deltaPct, `vs ${prevLabel}`),
          pos: revenue.deltaPct >= 0,
        },
        icon: DollarSign,
        details: (
          <div className="space-y-3 text-sm">
            <Row
              strong
              label={
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Live Profit (1h)
                </span>
              }
              value={loading ? "…" : fmtVND(revenue.live)}
            />
            <Row
              label="Gross Sales"
              value={loading ? "…" : fmtVND(revenue.gross)}
            />
            <Row
              label="Avg Selling Price"
              value={loading ? "…" : fmtVND(revenue.avgSell)}
            />
            <Row
              label="Avg Import Cost"
              value={loading ? "…" : fmtVND(revenue.avgCost)}
            />
            <Row
              label="Units Sold"
              value={
                loading
                  ? "…"
                  : revenue.units.toLocaleString("vi-VN")
              }
            />
          </div>
        ),
      },
      {
        title: `Orders (${currentLabel})`,
        value: loading
          ? "…"
          : orders.today.toLocaleString("vi-VN"),
        delta: {
          text: formatDeltaText(orders.deltaPct, `vs ${prevLabel}`),
          pos: orders.deltaPct >= 0,
        },
        icon: Calendar,
        details: (
          <div className="space-y-3 text-sm">
            <Row
              strong
              label={
                <span className="inline-flex items-center gap-2">
                  <CircleDot className="h-3.5 w-3.5 text-emerald-600" />
                  New in last hour
                </span>
              }
              value={loading ? "…" : orders.activeNow.toLocaleString("vi-VN")}
            />
            <Row
              label="Completed"
              value={
                loading
                  ? "…"
                  : `${orders.breakdown.completed.toLocaleString("vi-VN")} (${orderShare(orders.breakdown.completed)}%)`
              }
            />
            <Row
              label="Paid"
              value={
                loading
                  ? "…"
                  : `${orders.breakdown.paid.toLocaleString("vi-VN")} (${orderShare(orders.breakdown.paid)}%)`
              }
            />
            <Row
              label="Shipped"
              value={
                loading
                  ? "…"
                  : `${orders.breakdown.shipped.toLocaleString("vi-VN")} (${orderShare(orders.breakdown.shipped)}%)`
              }
            />
            <Row
              label="Pending"
              value={
                loading
                  ? "…"
                  : `${orders.breakdown.pending.toLocaleString("vi-VN")} (${orderShare(orders.breakdown.pending)}%)`
              }
            />
          </div>
        ),
      },
      {
        title: "Customer",
        value: loading
          ? "…"
          : customers.total.toLocaleString("vi-VN"),
        delta: {
          text: formatDeltaText(customers.deltaPct, "vs last month"),
          pos: customers.deltaPct >= 0,
        },
        icon: Users,
        details: (
          <div className="space-y-3 text-sm">
            <Row
              strong
              label="New Today"
              value={loading ? "…" : customers.newToday.toLocaleString("vi-VN")}
            />
            <Row
              label="Bronze"
              value={
                loading
                  ? "…"
                  : `${customers.tiers.bronze.toLocaleString("vi-VN")} (${tierShare(customers.tiers.bronze)}%)`
              }
            />
            <Row
              label="Silver"
              value={
                loading
                  ? "…"
                  : `${customers.tiers.silver.toLocaleString("vi-VN")} (${tierShare(customers.tiers.silver)}%)`
              }
            />
            <Row
              label="Gold"
              value={
                loading
                  ? "…"
                  : `${customers.tiers.gold.toLocaleString("vi-VN")} (${tierShare(customers.tiers.gold)}%)`
              }
            />
            <Row
              label="Diamond"
              value={
                loading
                  ? "…"
                  : `${customers.tiers.diamond.toLocaleString("vi-VN")} (${tierShare(customers.tiers.diamond)}%)`
              }
            />
          </div>
        ),
      },
      {
        title: "Inventory Items",
        value: loading
          ? "…"
          : inventory.totalUnits.toLocaleString("vi-VN"),
        delta: {
          text: `${availabilityPct.toFixed(0)}% SKUs available`,
          pos: availabilityPct >= 70,
        },
        icon: Boxes,
        details: (
          <div className="space-y-3 text-sm">
            <Row
              strong
              label="In Stock"
              value={
                loading
                  ? "…"
                  : `${inventory.inStockCount.toLocaleString("vi-VN")} (${variantShare(inventory.inStockCount)}%)`
              }
            />
            <Row
              label="Low Stock"
              value={
                loading
                  ? "…"
                  : `${inventory.lowStockCount.toLocaleString("vi-VN")} (${variantShare(inventory.lowStockCount)}%)`
              }
            />
            <Row
              label="Out of Stock"
              value={
                loading
                  ? "…"
                  : `${inventory.outStockCount.toLocaleString("vi-VN")} (${variantShare(inventory.outStockCount)}%)`
              }
            />
          </div>
        ),
      },
    ];
  }, [metrics, loading, rangeWindow]);
  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const now = dayjs();

        const ordersRes = await apiListOrders({ page: 1, limit: MAX_ORDERS });
        const rawOrders =
          ordersRes?.orders ||
          ordersRes?.items ||
          ordersRes?.data?.orders ||
          ordersRes?.data?.items ||
          [];

        const normalizedOrders = rawOrders
          .map((order) => {
            const createdAt = dayjs(order.created_at);
            if (!createdAt.isValid()) return null;
            const status = String(order.status || "").toLowerCase();
            const total = Number(order.total_price || 0);
            const nameCandidates = [
              order.customer_name,
              order.user_fullname,
              order.user_email,
            ].filter(Boolean);
            const customerName =
              nameCandidates[0] ||
              (order.user_id != null ? `User ${order.user_id}` : "Guest");

            return {
              order_id: order.order_id,
              created_at: order.created_at,
              createdAt,
              status,
              total,
              user_id: order.user_id,
              customerName,
            };
          })
          .filter(Boolean)
          .sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf());

        const monthStart = now.startOf("month");
        const prevMonthStart = monthStart.subtract(1, "month");
        const prevMonthEnd = monthStart.subtract(1, "millisecond");

        const customerSpend = new Map();
        const customerFirstOrder = new Map();
        const currentMonthCustomers = new Set();
        const prevMonthCustomers = new Set();

        normalizedOrders.forEach((order) => {
          if (order.user_id == null) return;
          if (REVENUE_STATUSES.has(order.status)) {
            customerSpend.set(
              order.user_id,
              (customerSpend.get(order.user_id) || 0) + order.total
            );
          }
          if (
            !customerFirstOrder.has(order.user_id) ||
            order.createdAt.isBefore(customerFirstOrder.get(order.user_id))
          ) {
            customerFirstOrder.set(order.user_id, order.createdAt);
          }
          if (order.createdAt.isSame(monthStart, "month")) {
            currentMonthCustomers.add(order.user_id);
          } else if (
            order.createdAt.isBetween(
              prevMonthStart,
              prevMonthEnd,
              "millisecond",
              "[]"
            )
          ) {
            prevMonthCustomers.add(order.user_id);
          }
        });

        const tiers = {
          bronze: 0,
          silver: 0,
          gold: 0,
          diamond: 0,
        };
        customerFirstOrder.forEach((_, userId) => {
          const spent = customerSpend.get(userId) || 0;
          tiers[assignTier(spent)] += 1;
        });

        const newCustomersToday = Array.from(customerFirstOrder.values()).filter((d) =>
          d.isSame(now, "day")
        ).length;
        const customerDeltaPct = percentChange(
          currentMonthCustomers.size,
          prevMonthCustomers.size
        );

        const detailIds = normalizedOrders.map((order) => order.order_id);
        const detailResults = await Promise.allSettled(
          detailIds.map((id) => apiGetOrder(id))
        );

        const detailMap = new Map();
        detailResults.forEach((result, index) => {
          if (result.status !== "fulfilled") return;
          const payload = result.value?.order || result.value;
          if (!payload) return;
          const id = detailIds[index];
          detailMap.set(id, payload);
        });

        const { products: productList } = await apiListProducts({
          page: 1,
          limit: 40,
        });
        const productStocks = new Map();
        const variantCostMap = new Map();
        const inventoryTotals = {
          totalUnits: 0,
          variantCount: 0,
          inStockCount: 0,
          lowStockCount: 0,
          outStockCount: 0,
        };

        const productMap = new Map(
          (productList || [])
            .filter((product) => product?.product_id != null)
            .map((product) => [product.product_id, product])
        );
        const productIdList = Array.from(productMap.keys());

        if (productIdList.length) {
          const productDetailResults = await Promise.allSettled(
            productIdList.map((id) => apiGetProduct(id))
          );

          productDetailResults.forEach((result, index) => {
            if (result.status !== "fulfilled") return;
            const detail = result.value;
            const productId = productIdList[index];
            const variants = detail?.variants || [];
            let totalUnitsPerProduct = 0;
            let lowCount = 0;
            let outCount = 0;
            variants.forEach((variant) => {
              const qty = Number(variant.stock || 0);
              totalUnitsPerProduct += qty;
              inventoryTotals.variantCount += 1;
              inventoryTotals.totalUnits += qty;
              if (qty <= 0) {
                inventoryTotals.outStockCount += 1;
                outCount += 1;
              } else if (qty <= 5) {
                inventoryTotals.lowStockCount += 1;
                lowCount += 1;
              } else {
                inventoryTotals.inStockCount += 1;
              }

              const variantId = Number(variant.variant_id || variant.id);
              if (variantId) {
                const cost = Number(variant.cost_price || 0);
                variantCostMap.set(variantId, cost);
              }
            });
            if (productId != null) {
              productStocks.set(productId, {
                totalUnits: totalUnitsPerProduct,
                lowCount,
                outCount,
              });
            }
          });
        }

        const dataset = {
          orders: normalizedOrders,
          detailMap,
          productStocks,
          variantCostMap,
          loadedAt: now.toISOString(),
          customers: {
            total: customerFirstOrder.size,
            deltaPct: customerDeltaPct,
            newToday: newCustomersToday,
            tiers,
          },
          inventory: inventoryTotals,
        };

        const snapshot = computeDashboardForRange(timeframe, dataset, {
          now,
          rangeStart,
          rangeEnd,
        });

        if (cancelled) return;

        setBaseData(dataset);
        if (snapshot) {
          setMetrics(snapshot.metrics);
          setTopProducts(snapshot.topProducts);
          setRecentOrders(snapshot.recentOrders);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError(err?.message || "Failed to load dashboard data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!baseData) return;
    const now = baseData.loadedAt ? dayjs(baseData.loadedAt) : dayjs();
    const snapshot = computeDashboardForRange(timeframe, baseData, {
      now,
      rangeStart,
      rangeEnd,
    });
    if (snapshot) {
      setMetrics(snapshot.metrics);
      setTopProducts(snapshot.topProducts);
      setRecentOrders(snapshot.recentOrders);
    }
  }, [timeframe, baseData, rangeStart, rangeEnd]);

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Heading */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
            <p className="text-sm text-neutral-500">
              Welcome back! Here's what's happening with your store today.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit flex-wrap items-center gap-3 rounded-full bg-white px-3 py-2 shadow-sm border border-neutral-200 self-end">
              {RANGE_OPTIONS.map((option) => {
                const active = option.key === timeframe;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setTimeframe(option.key)}
                    className={`px-3 py-1 text-sm font-medium rounded-full transition ${
                      active
                        ? "bg-neutral-900 text-white shadow-sm"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-full border border-neutral-200 bg-white px-3 py-2 shadow-sm">
              <label className="text-xs uppercase tracking-wide text-neutral-500">
                From
              </label>
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => onRangeChange("start", e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              />
              <label className="text-xs uppercase tracking-wide text-neutral-500">
                To
              </label>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => onRangeChange("end", e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setTimeframe("custom-range")}
                className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Metric cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 items-start md:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <MetricCard key={c.title} {...c} />
          ))}
        </div>

        {/* Bottom section: Recent Orders + Top Selling Products */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card
            title="Recent Orders"
            sub={`Latest transactions • ${rangeWindow.label}`}
            className="xl:col-span-2"
          >
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-neutral-600">
                  <tr className="[&>th]:px-5 [&>th]:py-3">
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {loading ? (
                    <tr>
                      <td className="px-5 py-6 text-center text-sm text-neutral-500" colSpan={6}>
                        Loading recent orders…
                      </td>
                    </tr>
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td className="px-5 py-6 text-center text-sm text-neutral-500" colSpan={6}>
                        No orders found yet.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((r) => {
                      const statusKey = String(r.status || "").toLowerCase();
                      const statusLabel = STATUS_LABELS[statusKey] || r.status || "Status";
                      const statusClass = STATUS_BADGES[statusKey] || STATUS_BADGES.default;

                      return (
                        <tr key={r.id} className="text-neutral-800">
                          <td className="px-5 py-3 font-medium">{r.id}</td>
                          <td className="px-5 py-3">{r.name}</td>
                          <td className="px-5 py-3">
                            {typeof r.items === "number"
                              ? r.items.toLocaleString("vi-VN")
                              : r.items}
                          </td>
                          <td className="px-5 py-3">{fmtVND(r.total)}</td>
                          <td className="px-5 py-3">
                            <span className={statusClass}>{statusLabel}</span>
                          </td>
                          <td className="px-5 py-3 text-neutral-600">{r.time}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Top Selling Products" sub={`Based on ${rangeWindow.label}`}>
            <div className="max-h-[420px] overflow-y-auto pr-1">
              <ul className="space-y-5">
                {loading ? (
                  <li className="text-sm text-neutral-500">Loading product performance…</li>
                ) : topProducts.length === 0 ? (
                  <li className="text-sm text-neutral-500">Not enough sales data yet.</li>
                ) : (
                  topProducts.map((p) => (
                    <li key={p.i} className="flex items-center gap-4">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-neutral-200 text-sm font-medium text-neutral-700">
                        {p.i}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-neutral-900">
                              {p.name}
                            </div>
                            <div className="text-xs text-neutral-500">{p.cat}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-neutral-900">
                              {fmtVND(p.revenue)}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {p.sold.toLocaleString("vi-VN")} sold
                            </div>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${
                          p.stock === "Low"
                            ? "bg-red-600/90 text-white"
                            : p.stock === "Out"
                            ? "bg-red-100 text-red-700"
                            : "bg-neutral-100 text-neutral-800"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---- small UI ---- */
function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-neutral-700 ${strong ? "font-medium" : ""}`}>{label}</span>
      <span className={`text-neutral-900 ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

function MetricCard({ title, value, delta, icon: Icon, details }) {
  return (
    <div className="group rounded-xl border border-neutral-200 bg-white shadow-sm">
      {/* header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 text-sm text-neutral-500">
        <span>{title}</span>
        <Icon className="h-4 w-4 text-neutral-400" />
      </div>

      {/* body */}
      <div className="px-5 py-5">
        {/* keep total visible */}
        <div className="text-2xl font-semibold text-neutral-900">{value}</div>
        <div
          className={`mt-1 inline-flex items-center gap-1 text-xs ${
            delta.pos ? "text-green-600" : "text-red-600"
          }`}
        >
          {delta.pos ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>{delta.text}</span>
        </div>

        {/* slide-down details on hover (expands only this card) */}
        <div className="max-h-0 overflow-hidden opacity-0 transition-[max-height,opacity,margin-top] duration-200 ease-in-out group-hover:max-h-60 group-hover:opacity-100 group-hover:mt-4">
          <div className="border-t border-neutral-200 pt-3">{details}</div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, sub, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-neutral-200 px-5 py-4">
        <div className="text-sm font-semibold text-neutral-900">{title}</div>
        {sub && <div className="text-sm text-neutral-500">{sub}</div>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
