"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { AssistedPulseLogo } from "@/components/AssistedPulseLogo";

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
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(10,86,207,0.07) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(30,195,171,0.07) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(10,86,207,0.05) 0%, transparent 50%)",
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
            <AssistedPulseLogo variant="full" height={52} style={{ maxWidth: "280px" }} />
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

        <p
          style={{
            textAlign: "center",
            marginTop: 24,
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          Contact your admin if you don&apos;t have an account
        </p>
      </div>
    </div>
  );
}
