"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { GlowStudioDeskLogo } from "@/components/GlowStudioDeskLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/session");
      const session = await res.json();

      if (session?.user?.role === "ADMIN") {
        router.push("/dashboard");
      } else {
        router.push("/inbox");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: 20,
        background: "radial-gradient(120% 90% at 78% 30%, #5C1A3D 0%, #2A1220 55%, #180a12 100%)",
      }}
    >
      {/* Starfield, matching the Glow Studio hero */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.5) 0, transparent 100%), radial-gradient(1px 1px at 70% 65%, rgba(255,255,255,0.35) 0, transparent 100%), radial-gradient(1.5px 1.5px at 40% 80%, rgba(201,169,97,0.55) 0, transparent 100%), radial-gradient(1px 1px at 85% 15%, rgba(255,255,255,0.4) 0, transparent 100%), radial-gradient(1px 1px at 55% 45%, rgba(255,255,255,0.3) 0, transparent 100%)",
        }}
      />

      {/* Card */}
      <div
        className="animate-fade-in"
        style={{
          position: "relative",
          background: "white",
          borderRadius: 20,
          padding: "48px 40px",
          width: "100%",
          maxWidth: 420,
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.03), 0 20px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <GlowStudioDeskLogo variant="full" height={40} style={{ maxWidth: "280px" }} />
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor="email"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={18}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                style={{ paddingLeft: 42 }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor="password"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: 42 }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="animate-fade-in"
              style={{
                padding: "10px 14px",
                background: "var(--danger-light)",
                color: "var(--danger)",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: "100%", marginTop: 4, height: 46 }}
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              <>
                Sign In
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
