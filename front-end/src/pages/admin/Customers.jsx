import { useEffect, useMemo, useState } from "react";
import { Search, Crown } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { listUsers } from "../../services/users";
import { listOrders } from "../../services/orders";

dayjs.extend(relativeTime);

const fmtVND = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    Number.isFinite(n) ? n : 0
  );

const determineTier = (spent) => {
  if (spent >= 30000000) return "Diamond";
  if (spent >= 15000000) return "Gold";
  if (spent >= 5000000) return "Silver";
  return "Bronze";
};

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-5 py-3 text-sm text-neutral-500">
        {label}
      </div>
      <div className="px-5 py-5">
        <div className="text-2xl font-semibold text-neutral-900">{value}</div>
        {sub ? <div className="mt-1 text-xs text-neutral-500">{sub}</div> : null}
      </div>
    </div>
  );
}

function Initials({ name }) {
  const base = (name || "Customer")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  const initials = base || "CU";
  return (
    <div className="grid h-9 w-9 place-items-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-700">
      {initials}
    </div>
  );
}

function TierBadge({ tier }) {
  const label = tier || "Bronze";
  const map = {
    Bronze: "border border-amber-300 bg-amber-50 text-amber-800",
    Silver: "border border-slate-300 bg-slate-50 text-slate-700",
    Gold: "border border-yellow-400 bg-yellow-50 text-yellow-900",
    Diamond: "border border-cyan-300 bg-cyan-50 text-cyan-800",
  };
  const cls = map[label] ?? "border border-neutral-300 bg-white text-neutral-700";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function Customers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await listUsers({
          page: 1,
          limit: 200,
          fullname: debouncedSearch || undefined,
        });
        if (cancel) return;
        const payload = res || {};
        const fetchedUsers = payload.users || payload.items || [];
        setUsers(fetchedUsers);
        setMetadata(payload.metadata || null);
      } catch (e) {
        console.error(e);
        if (!cancel) {
          setError(e?.message || "Failed to load customers");
          setUsers([]);
          setMetadata(null);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setOrdersLoading(true);
        setOrdersError("");
        const res = await listOrders({ page: 1, limit: 1000 });
        if (cancel) return;
        const payload = res || {};
        const fetchedOrders =
          payload.orders || payload.items || payload.data?.orders || [];
        setOrders(
          (fetchedOrders || []).map((o) => ({
            ...o,
            total_price: Number(o.total_price ?? 0),
          }))
        );
      } catch (e) {
        console.error(e);
        if (!cancel) {
          setOrders([]);
          setOrdersError(e?.message || "Failed to load orders data");
        }
      } finally {
        if (!cancel) setOrdersLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const ordersByUser = useMemo(() => {
    const map = new Map();
    orders.forEach((ord) => {
      if (!ord || ord.user_id == null) return;
      const key = Number(ord.user_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ord);
    });
    return map;
  }, [orders]);

  const tableRows = useMemo(() => {
    return users.map((u) => {
      const uid = Number(u.user_id);
      const userOrders = ordersByUser.get(uid) || [];
      const completedOrders = userOrders.filter((ord) => ord.status !== "cancelled");
      const totalSpent = completedOrders.reduce(
        (sum, ord) => sum + Number(ord.total_price || 0),
        0
      );
      const lastTimestamp = userOrders.reduce((latest, ord) => {
        if (!ord?.created_at) return latest;
        const ts = dayjs(ord.created_at).valueOf();
        return ts > latest ? ts : latest;
      }, 0);
      const tier = determineTier(totalSpent);
      const displayName = u.fullname || `User ${uid}`;
      return {
        id: `#${String(uid).padStart(4, "0")}`,
        user_id: uid,
        name: displayName,
        email: u.email || "-",
        phone: u.phone_number || "-",
        tier,
        spent: totalSpent,
        orders: userOrders.length,
        last: lastTimestamp ? dayjs(lastTimestamp).fromNow() : "—",
      };
    });
  }, [ordersByUser, users]);

  const stats = useMemo(() => {
    const totalCustomers = metadata?.totalRecords ?? tableRows.length;
    const vipCount = tableRows.filter((r) => r.tier === "Gold" || r.tier === "Diamond").length;
    const totalSpent = tableRows.reduce((sum, r) => sum + Number(r.spent || 0), 0);
    const avgOrderValuePerCustomer = totalCustomers
      ? totalSpent / totalCustomers
      : 0;
    const retentionRate = tableRows.length
      ? Math.round(
          (tableRows.filter((r) => Number(r.orders || 0) > 1).length / tableRows.length) *
            100
        )
      : 0;

    return [
      {
        label: "Total Customers",
        value: totalCustomers.toLocaleString(),
        sub: `Showing ${tableRows.length.toLocaleString()} in view`,
      },
      {
        label: "VIP Customers",
        value: vipCount.toLocaleString(),
        sub: "Gold & Diamond tiers",
      },
      {
        label: "Avg. Order Value",
        value: fmtVND(avgOrderValuePerCustomer),
        sub: totalCustomers
          ? "Per customer"
          : "No customers yet",
      },
      {
        label: "Retention Rate",
        value: `${retentionRate}%`,
        sub: "Customers with repeat orders",
      },
    ];
  }, [metadata, tableRows]);

  const isBusy = loading || ordersLoading;
  const tableError = error || (ordersError && users.length === 0);

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Customers</h1>
            <p className="text-sm text-neutral-500">
              Track your customer relationships and loyalty program
            </p>
            {ordersError && !error ? (
              <p className="mt-1 text-xs text-amber-600">
                Orders data is currently unavailable; spending metrics may be incomplete.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-medium text-neutral-900">
                Customer Directory
              </div>
              <div className="text-sm text-neutral-500">
                View all customer profiles
              </div>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers..."
                className="h-9 w-full rounded-md border border-neutral-300 bg-neutral-50 pl-9 pr-3 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-neutral-600">
                <tr className="[&>th]:px-5 [&>th]:py-3">
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Tier</th>
                  <th>Total Spent</th>
                  <th>Orders</th>
                  <th>Last Purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {isBusy ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-center text-neutral-500">
                      Loading…
                    </td>
                  </tr>
                ) : tableError ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-center text-red-600">
                      {tableError}
                    </td>
                  </tr>
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-center text-neutral-500">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((r) => (
                    <tr key={r.user_id} className="odd:bg-white even:bg-neutral-50 text-neutral-800">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Initials name={r.name} />
                          <div className="leading-tight">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-neutral-900">{r.name}</span>
                              {(r.tier === "Gold" || r.tier === "Diamond") && (
                                <Crown className="h-3.5 w-3.5 text-amber-500" />
                              )}
                            </div>
                            <div className="text-xs text-neutral-500">{r.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-neutral-700">{r.email}</td>
                      <td className="px-5 py-4 text-neutral-700">{r.phone}</td>
                      <td className="px-5 py-4">
                        <TierBadge tier={r.tier} />
                      </td>
                      <td className="px-5 py-4">{fmtVND(r.spent)}</td>
                      <td className="px-5 py-4">{r.orders}</td>
                      <td className="px-5 py-4 text-neutral-700">{r.last}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
