import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import * as usersApi from "../../services/users";
import { imgUrl } from "../../utils/image";

export default function Profile() {
  const { user, setUser } = useAuth();

  // Personal info state
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone_number: "",
    address: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(""); // avatar preview/url
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState({ ok: "", err: "" });

  // Change password state
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ ok: "", err: "" });

  // Load current user
  useEffect(() => {
    let cancel = false;

    async function run() {
      if (!user?.user_id) return;
      try {
        setLoading(true);
        const data = await usersApi.getUser(user.user_id);
        if (cancel) return;
        const u = data?.user ?? data?.users ?? data;

        setForm({
          fullname: u?.fullname || "",
          email: u?.email || "",
          phone_number: u?.phone_number || "",
          address: u?.address || "",
        });
        setPreview(imgUrl(u?.avatar_url));
      } catch {
        /* noop for UX */
      } finally {
        !cancel && setLoading(false);
      }
    }

    run();
    return () => {
      cancel = true;
    };
  }, [user?.user_id]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onPickAvatar = (e) => {
    const f = e.target.files?.[0] || null;
    setAvatarFile(f);
    if (f) setPreview(URL.createObjectURL(f)); // local preview
  };

  // Save personal info + avatar
  const saveInfo = async (e) => {
    e.preventDefault();
    if (!user?.user_id) return;

    setInfoMsg({ ok: "", err: "" });
    try {
      setSavingInfo(true);

      const payload = { ...form };
      if (avatarFile) payload.avatarFile = avatarFile;

      let updated = await usersApi.updateUser(user.user_id, payload);

      // Fallback refetch if BE didn't return user object
      if (!updated || !updated.user_id) {
        const fetched = await usersApi.getUser(user.user_id);
        updated = fetched?.user ?? fetched?.users ?? fetched;
      }

      // Sync to AuthContext (for header dropdown, etc.)
      setUser((prev) => ({ ...(prev || {}), ...(updated || {}) }));
      setInfoMsg({ ok: "Profile updated", err: "" });

      // If BE returns a new avatar URL (and user didn't just pick a local file),
      // refresh preview from server
      if (updated?.avatar_url && !avatarFile) {
        setPreview(imgUrl(updated.avatar_url));
      }
    } catch (e2) {
      const msg =
        e2?.response?.data?.message ||
        e2?.message ||
        "Update failed";
      setInfoMsg({ ok: "", err: msg });
    } finally {
      setSavingInfo(false);
    }
  };

  // Save password (separate form)
  const savePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ ok: "", err: "" });

    // Client-side validation
    if (!pwd.current || !pwd.next || !pwd.confirm) {
      return setPwdMsg({ ok: "", err: "Please fill all password fields." });
    }
    if (pwd.next.length < 6) {
      return setPwdMsg({ ok: "", err: "New password must be at least 6 characters." });
    }
    if (pwd.next !== pwd.confirm) {
      return setPwdMsg({ ok: "", err: "Confirm password does not match." });
    }

    try {
      setSavingPwd(true);
      await usersApi.changePassword(user.user_id, {
        current_password: pwd.current,
        new_password: pwd.next,
        confirm_password: pwd.confirm,
      });
      setPwd({ current: "", next: "", confirm: "" });
      setPwdMsg({ ok: "Password changed successfully.", err: "" });
    } catch (e2) {
      const msg =
        e2?.response?.data?.message ||
        e2?.message ||
        "Change password failed";
      setPwdMsg({ ok: "", err: msg });
    } finally {
      setSavingPwd(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-10">Please sign in.</main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-extrabold">My profile</h1>
        <p className="text-gray-500 mt-1">View and update your personal information.</p>

        {loading ? (
          <div className="mt-8">Loading…</div>
        ) : (
          <>
            {/* FORM 1: Personal info + Avatar */}
            <form onSubmit={saveInfo} className="mt-8 grid gap-6">
              {/* Avatar block (centered on mobile, larger size, clear upload button) */}
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Avatar circle */}
                <div className="mx-auto md:mx-0 relative h-40 w-40 md:h-50 md:w-50 rounded-full overflow-hidden ring-1 ring-black/10 bg-gray-100 shadow-sm">
                  {preview ? (
                    <img src={preview} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-gray-400 text-sm">
                      No avatar
                    </div>
                  )}
                </div>

                {/* Upload button (hidden input for accessibility) */}
                <div className="text-center md:text-left">
                  <label
                    htmlFor="avatarFile"
                    className="
                      inline-flex items-center gap-2 rounded-full border px-4 py-2
                      bg-white hover:bg-gray-50 active:bg-gray-100 transition
                      cursor-pointer text-sm font-medium
                    "
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-700">
                      <path
                        fill="currentColor"
                        d="M12 5l3 3h-2v4h-2V8H9l3-3zm8 7a8 8 0 11-16 0 8 8 0 0116 0zm-2 0a6 6 0 10-12 0 6 6 0 0012 0z"
                      />
                    </svg>
                    <span>Upload new photo</span>
                  </label>
                  <input
                    id="avatarFile"
                    type="file"
                    accept="image/*"
                    onChange={onPickAvatar}
                    className="sr-only"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    PNG/JPG up to ~2MB. Square images look best.
                  </p>
                </div>
              </div>

              {/* Info fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Full name</label>
                  <input
                    name="fullname"
                    value={form.fullname}
                    onChange={onChange}
                    className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/30"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <input
                    name="phone_number"
                    value={form.phone_number}
                    onChange={onChange}
                    className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/30"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Address</label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={onChange}
                    className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/30"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/30"
                    required
                  />
                </div>
              </div>

              {infoMsg.err && <div className="text-red-600 text-sm">{infoMsg.err}</div>}
              {infoMsg.ok && <div className="text-green-600 text-sm">{infoMsg.ok}</div>}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="h-11 px-6 rounded-full bg-black text-white font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {savingInfo ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>

            {/* FORM 2: Change password */}
            <div className="border-t mt-10 pt-8">
              <h2 className="text-xl font-bold">Change password</h2>
              <p className="text-gray-500 text-sm mt-1">
                Enter your current password and choose a new one.
              </p>

              <form onSubmit={savePassword} className="mt-6 grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Current password</label>
                  <input
                    type="password"
                    value={pwd.current}
                    onChange={(e) => setPwd((s) => ({ ...s, current: e.target.value }))}
                    className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/30"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">New password</label>
                  <input
                    type="password"
                    value={pwd.next}
                    onChange={(e) => setPwd((s) => ({ ...s, next: e.target.value }))}
                    className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/30"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Confirm new password</label>
                  <input
                    type="password"
                    value={pwd.confirm}
                    onChange={(e) => setPwd((s) => ({ ...s, confirm: e.target.value }))}
                    className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/30"
                    required
                  />
                </div>

                <div className="md:col-span-2 -mt-2">
                  {pwdMsg.err && <div className="text-red-600 text-sm">{pwdMsg.err}</div>}
                  {pwdMsg.ok && <div className="text-green-600 text-sm">{pwdMsg.ok}</div>}
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={savingPwd}
                    className="h-11 px-6 rounded-full bg-black text-white font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {savingPwd ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
    </div>
  );
}
