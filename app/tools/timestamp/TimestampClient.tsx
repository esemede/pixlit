"use client";
import { useState, useEffect } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function TimestampClient() {
  const [now, setNow] = useState(0);
  const [unix, setUnix] = useState("");
  const [date, setDate] = useState("");
  const [unixToDate, setUnixToDate] = useState("");
  const [dateToUnix, setDateToUnix] = useState("");
  const [copiedNow, setCopiedNow] = useState(false);

  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const convertUnixToDate = () => {
    const n = Number(unix);
    if (!unix || isNaN(n)) { setUnixToDate("Timestamp inválido"); return; }
    const d = new Date(n * 1000);
    setUnixToDate(d.toLocaleString("es-CL", { timeZoneName: "short" }));
  };

  const convertDateToUnix = () => {
    if (!date) { setDateToUnix("Selecciona una fecha"); return; }
    const d = new Date(date);
    if (isNaN(d.getTime())) { setDateToUnix("Fecha inválida"); return; }
    setDateToUnix(String(Math.floor(d.getTime() / 1000)));
  };

  const copyNow = () => {
    navigator.clipboard.writeText(String(now));
    setCopiedNow(true);
    setTimeout(() => setCopiedNow(false), 2000);
  };

  return (
    <ToolLayout
      title="⏱️ Conversor de Timestamps"
      description="Convierte timestamps Unix a fechas legibles y al revés. El timestamp actual se actualiza en tiempo real."
    >
      {/* Current timestamp */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(109,40,217,0.1))",
          border: "1px solid rgba(139,92,246,0.3)",
          borderRadius: "12px",
          padding: "24px",
          textAlign: "center",
          marginBottom: "36px",
        }}
      >
        <div style={{ color: "#888", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
          TIMESTAMP UNIX ACTUAL
        </div>
        <div style={{ color: "#a78bfa", fontSize: "42px", fontWeight: 900, fontFamily: "monospace", marginBottom: "12px" }}>
          {now}
        </div>
        <button onClick={copyNow} className="btn-secondary" style={{ fontSize: "13px", padding: "6px 16px" }}>
          {copiedNow ? "✓ Copiado" : "📋 Copiar"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        {/* Unix → Date */}
        <div>
          <h3 style={{ color: "#ddd", fontWeight: 700, marginBottom: "16px" }}>Unix → Fecha legible</h3>
          <input
            type="text"
            value={unix}
            onChange={(e) => setUnix(e.target.value)}
            placeholder={String(now)}
            style={{ marginBottom: "12px" }}
          />
          <button className="btn-primary" onClick={convertUnixToDate} style={{ width: "100%", marginBottom: "12px" }}>
            Convertir →
          </button>
          {unixToDate && (
            <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "14px", color: "#a78bfa", fontWeight: 600, fontSize: "15px" }}>
              {unixToDate}
            </div>
          )}
        </div>

        {/* Date → Unix */}
        <div>
          <h3 style={{ color: "#ddd", fontWeight: 700, marginBottom: "16px" }}>Fecha → Unix</h3>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ marginBottom: "12px", colorScheme: "dark" }}
          />
          <button className="btn-primary" onClick={convertDateToUnix} style={{ width: "100%", marginBottom: "12px" }}>
            Convertir →
          </button>
          {dateToUnix && (
            <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "14px", color: "#a78bfa", fontWeight: 600, fontSize: "22px", fontFamily: "monospace" }}>
              {dateToUnix}
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
