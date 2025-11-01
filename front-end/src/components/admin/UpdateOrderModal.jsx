import { useEffect, useState } from "react";
import { getOrder as apiGetOrder } from "../../services/orders";

const NEXT_STATUS = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

export default function UpdateOrderModal({ orderId, onClose, onSubmit }) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const res = await apiGetOrder(orderId);
        const ord = res?.order || res?.data?.order || res?.data || res;
        if (!cancel) {
          setOrder(ord);
          const suggest = (NEXT_STATUS[ord?.status] || [])[0] || "";
          setValue(suggest);
        }
      } catch (e) {
        console.error(e);
        alert(e?.message || "Failed to load order");
        onClose?.();
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => (cancel = true);
  }, [orderId, onClose]);

  const options = NEXT_STATUS[order?.status] || [];

  const submit = async () => {
    if (!value) return alert("Please pick a new status");
    await onSubmit?.(orderId, value);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Update Order #{orderId}</h3>
          <button className="h-8 px-3 rounded-full border" onClick={onClose}>
            Close
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center">Loading…</div>
        ) : (
          <>
            <div className="mt-4 text-sm">
              <div className="mb-2">
                Current status:{" "}
                <b className="uppercase">{order?.status || "-"}</b>
              </div>
              {options.length ? (
                <label className="block">
                  <span className="text-gray-600">New status</span>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  >
                    <option value="">-- choose --</option>
                    {options.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="text-gray-500">
                  This order cannot be updated anymore.
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button className="h-9 px-4 rounded-full border" onClick={onClose}>
                Cancel
              </button>
              <button
                disabled={!value}
                onClick={submit}
                className="h-9 px-5 rounded-full bg-black text-white disabled:opacity-50"
              >
                Update
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
