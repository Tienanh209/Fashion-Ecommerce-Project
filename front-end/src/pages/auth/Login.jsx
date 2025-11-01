import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get("redirect") || "/";
  const { login, loading } = useAuth();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr]           = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await login({ email, password });
      navigate(redirect, { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 container mx-auto px-4 py-10 max-w-md">
        <h1 className="text-3xl font-extrabold mb-6">Welcome back</h1>
        <form onSubmit={submit} className="space-y-4">
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
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-black text-white font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <p className="text-sm text-center">
            Don’t have an account? <a className="underline" href="/register">Create one</a>
          </p>
        </form>
    </div>
  );
}
