// src/pages/admin/Settings.jsx
import {
  Cog,
  Bell,
  Shield,
  CreditCard,
  Users,
} from "lucide-react";

// eslint-disable-next-line no-unused-vars
function Tab({ icon: Icon, label, active }) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm transition",
        active
          ? "border border-neutral-300 bg-white text-neutral-900"
          : "text-neutral-700 hover:bg-neutral-50",
      ].join(" ")}
      type="button"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function Settings() {
  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
          <p className="text-sm text-neutral-500">
            Manage your store settings and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-1 shadow-sm">
          <Tab icon={Cog} label="General" active />
          <Tab icon={Bell} label="Notifications" />
          <Tab icon={Shield} label="Security" />
          <Tab icon={CreditCard} label="Billing" />
          <Tab icon={Users} label="Team" />
        </div>

        {/* Store Information */}
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-5 py-4">
            <div className="text-sm font-medium text-neutral-900">
              Store Information
            </div>
            <div className="text-sm text-neutral-500">
              Update your store details and branding
            </div>
          </div>

          <form className="space-y-4 px-5 py-4">
            <div>
              <label className="mb-1 block text-sm text-neutral-600">
                Store Name
              </label>
              <input
                defaultValue="TA.SHOP"
                className="h-10 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-neutral-600">
                Location
              </label>
              <input
                defaultValue="Binh Thuy, Can Tho"
                className="h-10 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-neutral-600">
                Phone Number
              </label>
              <input
                defaultValue="(+84) 0939-174-450"
                className="h-10 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-neutral-600">
                Email
              </label>
              <input
                type="email"
                defaultValue="tienanh200903@gmail.com"
                className="h-10 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Business Hours */}
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-5 py-4">
            <div className="text-lg font-semibold text-neutral-900">
              Business Hours
            </div>
            <div className="text-sm text-neutral-500">
              Set your store operating hours
            </div>
          </div>

          <div className="px-5 py-2">
            <Row day="Monday - Friday" time="10:00 AM - 8:00 PM" />
            <Divider />
            <Row day="Saturday" time="10:00 AM - 9:00 PM" />
            <Divider />
            <Row day="Sunday" time="11:00 AM - 6:00 PM" />
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}

function Row({ day, time }) {
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <div className="text-base font-medium text-neutral-900">{day}</div>
        <div className="text-sm text-neutral-500">{time}</div>
      </div>
      <button
        type="button"
        className="text-sm font-medium text-neutral-900 hover:underline"
      >
        Edit
      </button>
    </div>
  );
}

function Divider() {
  return <div className="border-b border-neutral-200" />;
}
