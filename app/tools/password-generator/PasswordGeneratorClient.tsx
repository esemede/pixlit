"use client";
import { useState, useCallback } from "react";
import ToolLayout from "@/components/ToolLayout";

const CHARS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}|;:,.<>?",
};

function getStrength(pwd: string): { label: string; color: string; pct: number } {
  if (!pwd) return { label: "", color: "#333", pct: 0 };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 16) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { label: "Muy débil", color: "#ef4444", pct: 20 };
  if (score === 2) return { label: "Débil", color: "#f97316", pct: 40 };
  if (score === 3) return { label: "Media", color: "#eab308", pct: 60 };
  if (score === 4) return { label: "Fuerte", color: "#22c55e", pct: 80 };
  return { label: "Muy fuerte", color: "#8b5cf6", pct: 100 };
}

export default function PasswordGeneratorClient() {
  const [length, setLength] = useState(16);
  const [opts, setOpts] = useState({ uppercase: true, lowercase: true, numbers: true, symbols: false });
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    let charset = "";
    if (opts.uppercase) charset += CHARS.uppercase;
    if (opts.lowercase) charset += CHARS.lowercase;
    if (opts.numbers) charset += CHARS.numbers;
    if (opts.symbols) charset += CHARS.symbols;
    if (!charset) return;
    let pwd = "";
    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    for (let i = 0; i < length; i++) {
      pwd += charset[arr[i] % charset.length];
    }
    setPassword(pwd);
    setCopied(false);
  }, [length, opts]);

  const copy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const strength = getStrength(password);

  return (
    <ToolLayout
      title="🔐 Generador de Contraseñas"
      description="Genera contraseñas seguras y aleatorias usando la Web Crypto API. Nunca se envían a servidores."
    >
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        {/* Password output */}
        <div
          style={{
            background: "#111",
            border: "1px solid #2a2a2a",
            borderRadius: "10px",
            padding: "20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{
              flex: 1,
              fontFamily: "monospace",
              fontSize: "18px",
              letterSpacing: "2px",
              color: password ? "#a78bfa" : "#444",
              wordBreak: "break-all",
            }}
          >
            {password || "Haz clic en Generar"}
          </span>
          <button onClick={copy} style={{ background: "none", border: "none", color: "#8b5cf6", cursor: "pointer", fontSize: "20px", flexShrink: 0 }}>
            {copied ? "✓" : "📋"}
          </button>
        </div>

        {/* Strength bar */}
        {password && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#888", fontSize: "13px" }}>Fortaleza</span>
              <span style={{ color: strength.color, fontSize: "13px", fontWeight: 600 }}>{strength.label}</span>
            </div>
            <div style={{ background: "#222", borderRadius: "4px", height: "6px" }}>
              <div style={{ background: strength.color, width: `${strength.pct}%`, height: "100%", borderRadius: "4px", transition: "all 0.3s" }} />
            </div>
          </div>
        )}

        {/* Length */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600 }}>LONGITUD</label>
            <span style={{ color: "#8b5cf6", fontWeight: 700 }}>{length}</span>
          </div>
          <input
            type="range"
            min={8}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#8b5cf6" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", color: "#555", fontSize: "12px", marginTop: "4px" }}>
            <span>8</span>
            <span>64</span>
          </div>
        </div>

        {/* Options */}
        <div style={{ marginBottom: "28px" }}>
          <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "12px" }}>
            INCLUIR
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {(Object.keys(opts) as Array<keyof typeof opts>).map((key) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", background: "#111", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "12px" }}>
                <input
                  type="checkbox"
                  checked={opts[key]}
                  onChange={(e) => setOpts({ ...opts, [key]: e.target.checked })}
                  style={{ accentColor: "#8b5cf6", width: "16px", height: "16px" }}
                />
                <span style={{ color: "#ddd", fontSize: "14px", textTransform: "capitalize" }}>
                  {key === "uppercase" && "Mayúsculas (A-Z)"}
                  {key === "lowercase" && "Minúsculas (a-z)"}
                  {key === "numbers" && "Números (0-9)"}
                  {key === "symbols" && "Símbolos (!@#...)"}
                </span>
              </label>
            ))}
          </div>
        </div>

        <button className="btn-primary" onClick={generate} style={{ width: "100%", fontSize: "16px", padding: "14px" }}>
          🎲 Generar Contraseña
        </button>
      </div>
    </ToolLayout>
  );
}
