import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("moheyhomes@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back, admin");
      navigate("/admin");
    } catch (e2) {
      const msg = formatApiError(e2.response?.data?.detail) || e2.message;
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-[#0A0A0A] text-white grid lg:grid-cols-2">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-white/10 relative overflow-hidden">
        <Link to="/" className="z-10" data-testid="back-to-catalog">
          <Logo size={44} dark />
        </Link>
        <div className="z-10">
          <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-white/60 mb-4">Admin Console</p>
          <h2 className="font-display text-5xl lg:text-7xl font-black uppercase leading-[0.85] tracking-tighter">
            Manage
            <br />
            <span className="text-[#FF2A2A]">Inventory.</span>
          </h2>
          <p className="mt-6 text-white/60 max-w-md text-sm leading-relaxed">
            Add items. Update stock. Toggle sold-out. The public catalog reflects changes within seconds — automatically.
          </p>
        </div>
        <div className="z-10 text-[10px] tracking-[0.3em] uppercase font-bold text-white/40">
          Restricted Access · Authentication Required
        </div>
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-8 lg:p-12">
        <form onSubmit={submit} className="w-full max-w-md" data-testid="admin-login-form">
          <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-white/60 mb-3">№ 001</p>
          <h1 className="font-display text-4xl lg:text-5xl font-black uppercase tracking-tighter mb-10">
            Admin Login
          </h1>

          <label className="block text-[10px] tracking-[0.3em] uppercase font-bold text-white/60 mb-2">
            Email
          </label>
          <input
            data-testid="login-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-transparent border-b border-white/30 focus:border-white outline-none py-3 mb-6 text-base"
          />

          <label className="block text-[10px] tracking-[0.3em] uppercase font-bold text-white/60 mb-2">
            Password
          </label>
          <input
            data-testid="login-password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-transparent border-b border-white/30 focus:border-white outline-none py-3 mb-8 text-base"
          />

          {err && (
            <div data-testid="login-error" role="alert" className="error mb-6 border border-[#FF2A2A] text-[#FF2A2A] px-4 py-3 text-xs tracking-wider">
              {err}
            </div>
          )}

          <button
            data-testid="login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full bg-white text-[#0A0A0A] px-6 py-4 uppercase tracking-[0.25em] text-xs font-bold hover:bg-[#FF2A2A] hover:text-white transition-colors disabled:opacity-60"
          >
            {loading ? "Authenticating…" : "Enter Dashboard →"}
          </button>

          <Link
            to="/"
            className="block mt-6 text-[10px] tracking-[0.3em] uppercase font-bold text-white/50 hover:text-white transition-colors"
          >
            ← Back to public catalog
          </Link>
        </form>
      </div>
    </div>
  );
}
