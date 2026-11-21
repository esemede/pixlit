"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { createClient } from "@/lib/supabase/client";
import { deriveKey } from "@/lib/clipboard/crypto";
import { ClipboardMesh, MAX_FILE_BYTES, type ClipItem, type Peer } from "@/lib/clipboard/mesh";

const label: React.CSSProperties = { color: "#aaa", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 };
const btn: React.CSSProperties = {
  background: "#8b5cf6", color: "white", border: "none", borderRadius: 8,
  padding: "8px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer",
};
const btnGhost: React.CSSProperties = { ...btn, background: "#2a2a2a", color: "#ccc" };

function defaultDeviceName() {
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Mac/i.test(ua) ? "Mac"
    : /Windows/i.test(ua) ? "Windows" : /Linux/i.test(ua) ? "Linux" : "Dispositivo";
  return `${os} · ${Math.random().toString(36).slice(2, 5)}`;
}

function fmtSize(n = 0) {
  return n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
}

export default function ClipboardClient({ userId }: { userId: string }) {
  const [phrase, setPhrase] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<"connecting" | "ready" | "error">("connecting");
  const [peers, setPeers] = useState<Peer[]>([]);
  const [items, setItems] = useState<ClipItem[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const meshRef = useRef<ClipboardMesh | null>(null);

  useEffect(() => () => meshRef.current?.stop(), []);

  const upsert = useCallback((it: ClipItem) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.id === it.id);
      if (i === -1) return [it, ...prev];
      const next = prev.slice();
      next[i] = { ...prev[i], ...it };
      return next;
    });
  }, []);

  const connect = async () => {
    setError("");
    if (phrase.length < 8) { setError("Usa una frase de al menos 8 caracteres."); return; }
    const key = await deriveKey(phrase, userId);
    const mesh = new ClipboardMesh({
      supabase: createClient(), userId, deviceId: crypto.randomUUID(),
      deviceName: deviceName.trim() || defaultDeviceName(), key,
      onPeers: setPeers, onItem: upsert, onStatus: setStatus,
    });
    meshRef.current = mesh;
    setActive(true);
    void mesh.start().catch(() => setStatus("error"));
  };

  const disconnect = () => {
    meshRef.current?.stop();
    meshRef.current = null;
    setActive(false); setPeers([]); setItems([]); setStatus("connecting");
  };

  const connected = peers.filter((p) => p.state === "connected").length;

  const sendText = async () => {
    if (!text.trim()) return;
    await meshRef.current?.sendText(text);
    setText("");
  };

  const sendFiles = async (files: FileList | null) => {
    setError("");
    for (const f of Array.from(files ?? [])) {
      try { await meshRef.current?.sendFile(f); } catch (e) { setError((e as Error).message); }
    }
  };

  const pasteFromClipboard = async () => {
    try { setText(await navigator.clipboard.readText()); } catch { setError("No se pudo leer el portapapeles del sistema."); }
  };

  const copy = (t: string) => navigator.clipboard.writeText(t).catch(() => setError("No se pudo copiar."));

  const download = (it: ClipItem) => {
    if (!it.blob) return;
    const url = URL.createObjectURL(it.blob);
    const a = document.createElement("a");
    a.href = url; a.download = it.name ?? "archivo"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <ToolLayout
      title="📋 Portapapeles entre dispositivos"
      description="Pasa texto y archivos entre tus dispositivos. Viajan de navegador a navegador (WebRTC) y cifrados con una frase que solo tú conoces: no pasan por nuestro servidor."
    >
      {!active ? (
        <div style={{ display: "grid", gap: 16, maxWidth: 480 }}>
          <div>
            <label style={label}>NOMBRE DE ESTE DISPOSITIVO</label>
            <input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="Ej: Teléfono, Notebook (opcional)" />
          </div>
          <div>
            <label style={label}>FRASE DE SINCRONIZACIÓN</label>
            <input type="password" value={phrase} onChange={(e) => setPhrase(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && connect()} placeholder="La misma en todos tus dispositivos" />
            <p style={{ color: "#777", fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
              Deriva la clave de cifrado en tu navegador y no se envía ni se guarda. Si la pierdes no hay recuperación;
              dispositivos con otra frase no podrán leerse entre sí. Ambos dispositivos deben estar abiertos a la vez.
            </p>
          </div>
          {error && <div style={{ color: "#f87171", fontSize: 13 }}>{error}</div>}
          <div><button style={btn} onClick={connect}>Conectar</button></div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 14, color: "#ccc" }}>
              <span style={{ color: status === "error" ? "#f87171" : connected ? "#4ade80" : "#fbbf24" }}>●</span>{" "}
              {status === "error" ? "Error de señalización"
                : connected ? `${connected} dispositivo${connected > 1 ? "s" : ""} conectado${connected > 1 ? "s" : ""}`
                : "Buscando dispositivos con la misma frase…"}
              {peers.length > 0 && <span style={{ color: "#777" }}> — {peers.map((p) => p.name).join(", ")}</span>}
            </div>
            <button style={btnGhost} onClick={disconnect}>Desconectar</button>
          </div>

          <div>
            <label style={label}>TEXTO</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
              placeholder="Escribe o pega algo para enviarlo a tus otros dispositivos…" style={{ resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button style={btn} onClick={sendText} disabled={!connected || !text.trim()}>Enviar</button>
              <button style={btnGhost} onClick={pasteFromClipboard}>Pegar del portapapeles</button>
              <label style={{ ...btnGhost, display: "inline-block" }} title={`Máximo ${MAX_FILE_BYTES / 1048576} MB`}>
                Enviar archivo…
                <input type="file" multiple hidden disabled={!connected}
                  onChange={(e) => { void sendFiles(e.target.files); e.target.value = ""; }} />
              </label>
            </div>
            {error && <div style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{error}</div>}
          </div>

          <div>
            <label style={label}>HISTORIAL DE ESTA SESIÓN</label>
            {items.length === 0 && <div style={{ color: "#666", fontSize: 14 }}>Aún no hay nada. El historial solo vive en memoria y se pierde al cerrar la pestaña.</div>}
            <div style={{ display: "grid", gap: 8 }}>
              {items.map((it) => (
                <div key={it.id} style={{ background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: 8, padding: 12 }}>
                  <div style={{ color: "#777", fontSize: 12, marginBottom: 6 }}>
                    {it.mine ? "Enviado desde este dispositivo" : `De ${it.fromName}`} · {new Date(it.ts).toLocaleTimeString()}
                  </div>
                  {it.kind === "text" ? (
                    <>
                      <div style={{ color: "#eee", fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 160, overflow: "auto" }}>{it.text}</div>
                      <button style={{ ...btnGhost, marginTop: 8, padding: "4px 10px", fontSize: 12 }} onClick={() => copy(it.text ?? "")}>Copiar</button>
                    </>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ color: "#eee", fontSize: 14 }}>📎 {it.name} <span style={{ color: "#777" }}>({fmtSize(it.size)})</span></span>
                      {it.progress !== undefined ? (
                        <span style={{ color: "#fbbf24", fontSize: 12 }}>{Math.round(it.progress * 100)}%</span>
                      ) : it.blob && (
                        <button style={{ ...btnGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => download(it)}>Descargar</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
