import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get("redirect") || "/";
  const { register, loading } = useAuth();

  const [fullname, setFullname] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar]     = useState(null);
  const [err, setErr]           = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await register({ fullname, email, password, avatarFile: avatar });
      navigate(redirect, { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.message || "Register failed");
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 container mx-auto px-4 py-10 max-w-md">
        <h1 className="text-3xl font-extrabold mb-6">Create your account</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full name</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/40"
              value={fullname} onChange={(e) => setFullname(e.target.value)} required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/40"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/40"
              value={password} onChange={(e) => setPassword(e.target.value)} required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Avatar (optional)</label>
            <input
              type="file" accept="image/*"
              className="mt-1 block w-full text-sm"
              onChange={(e) => setAvatar(e.target.files?.[0] || null)}
            />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-black text-white font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
          <p className="text-sm text-center">
            Already have an account? <a className="underline" href="/login">Sign in</a>
          </p>
        </form>
    </div>
  );
}
