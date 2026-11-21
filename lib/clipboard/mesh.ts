// Malla P2P (WebRTC DataChannel) entre los dispositivos de un mismo usuario.
// Supabase Realtime sólo transporta señalización (SDP/ICE) cifrada con la clave
// del usuario: el contenido del portapapeles viaja directo entre navegadores.

import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { decryptBytes, decryptJson, encryptBytes, encryptJson } from "./crypto";

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
const CHUNK = 16 * 1024;
const ICE: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export interface Peer { id: string; name: string; state: "connecting" | "connected"; }

export interface ClipItem {
  id: string;
  fromName: string;
  mine: boolean;
  ts: number;
  kind: "text" | "file";
  text?: string;
  name?: string;
  size?: number;
  mime?: string;
  blob?: Blob;
  progress?: number; // 0..1 mientras se transfiere
}

interface Header { t: "text" | "meta" | "chunk"; id: string; [k: string]: unknown }
interface Signal { kind: "hello" | "offer" | "answer" | "ice"; name?: string; data?: unknown }
interface Incoming { item: ClipItem; chunks: Uint8Array[]; total: number; got: number }

interface PeerConn { id: string; name: string; pc: RTCPeerConnection; dc?: RTCDataChannel; pending: RTCIceCandidateInit[]; }

export interface MeshOptions {
  supabase: SupabaseClient;
  userId: string;
  deviceId: string;
  deviceName: string;
  key: CryptoKey;
  onPeers: (peers: Peer[]) => void;
  onItem: (item: ClipItem) => void;
  onStatus: (s: "connecting" | "ready" | "error") => void;
}

const te = new TextEncoder();
const td = new TextDecoder();
const uid = () => crypto.randomUUID();

export class ClipboardMesh {
  private ch?: RealtimeChannel;
  private peers = new Map<string, PeerConn>();
  private incoming = new Map<string, Incoming>();
  private stopped = false;

  constructor(private o: MeshOptions) {}

  async start() {
    const { supabase, userId } = this.o;
    // Canal privado: Realtime valida la política RLS de la migración 006 con el JWT del usuario.
    await supabase.realtime.setAuth();
    if (this.stopped) return;
    this.ch = supabase.channel(`clipboard:${userId}`, { config: { private: true, broadcast: { self: false } } });
    this.ch.on("broadcast", { event: "sig" }, ({ payload }) => { void this.onSignal(payload); });
    this.ch.subscribe((status) => {
      if (status === "SUBSCRIBED") { this.o.onStatus("ready"); void this.send({ kind: "hello", name: this.o.deviceName }); }
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") this.o.onStatus("error");
    });
  }

  stop() {
    this.stopped = true;
    this.peers.forEach((p) => { p.dc?.close(); p.pc.close(); });
    this.peers.clear();
    if (this.ch) void this.o.supabase.removeChannel(this.ch);
    this.emitPeers();
  }

  // ── Envío ─────────────────────────────────────────────────────────────
  async sendText(text: string) {
    const item: ClipItem = { id: uid(), fromName: this.o.deviceName, mine: true, ts: Date.now(), kind: "text", text };
    this.o.onItem(item);
    await this.broadcast({ t: "text", id: item.id, text, ts: item.ts, from: this.o.deviceName });
  }

  async sendFile(file: File) {
    if (file.size > MAX_FILE_BYTES) throw new Error(`El archivo supera ${MAX_FILE_BYTES / 1024 / 1024} MB`);
    const id = uid();
    const total = Math.max(1, Math.ceil(file.size / CHUNK));
    const item: ClipItem = { id, fromName: this.o.deviceName, mine: true, ts: Date.now(), kind: "file",
      name: file.name, size: file.size, mime: file.type, blob: file, progress: 0 };
    this.o.onItem(item);
    await this.broadcast({ t: "meta", id, name: file.name, size: file.size, mime: file.type, total, ts: item.ts, from: this.o.deviceName });
    for (let i = 0; i < total; i++) {
      const bytes = new Uint8Array(await file.slice(i * CHUNK, (i + 1) * CHUNK).arrayBuffer());
      await this.broadcast({ t: "chunk", id, i }, bytes);
      this.o.onItem({ ...item, progress: (i + 1) / total });
    }
  }

  private async broadcast(header: Header, payload: Uint8Array = new Uint8Array(0)) {
    const h = te.encode(JSON.stringify(header));
    const plain = new Uint8Array(4 + h.length + payload.length);
    new DataView(plain.buffer).setUint32(0, h.length);
    plain.set(h, 4);
    plain.set(payload, 4 + h.length);
    const frame = await encryptBytes(this.o.key, plain);
    for (const p of this.peers.values()) {
      const dc = p.dc;
      if (!dc || dc.readyState !== "open") continue;
      while (dc.bufferedAmount > 1_000_000) await new Promise((r) => setTimeout(r, 20));
      dc.send(frame as unknown as ArrayBuffer);
    }
  }

  private async onFrame(from: PeerConn, buf: ArrayBuffer) {
    let plain: Uint8Array;
    try { plain = await decryptBytes(this.o.key, new Uint8Array(buf)); } catch { return; }
    const hl = new DataView(plain.buffer, plain.byteOffset).getUint32(0);
    const h = JSON.parse(td.decode(plain.subarray(4, 4 + hl))) as Header;
    const payload = plain.subarray(4 + hl);
    if (h.t === "text") {
      this.o.onItem({ id: h.id, fromName: String(h.from ?? from.name), mine: false, ts: Number(h.ts), kind: "text", text: String(h.text) });
    } else if (h.t === "meta") {
      const item: ClipItem = { id: h.id, fromName: String(h.from ?? from.name), mine: false, ts: Number(h.ts), kind: "file",
        name: String(h.name), size: Number(h.size), mime: String(h.mime), progress: 0 };
      if (item.size! > MAX_FILE_BYTES) return;
      this.incoming.set(h.id, { item, chunks: [], total: Number(h.total), got: 0 });
      this.o.onItem(item);
    } else if (h.t === "chunk") {
      const inc = this.incoming.get(h.id);
      if (!inc) return;
      inc.chunks[Number(h.i)] = payload.slice();
      inc.got++;
      const done = inc.got >= inc.total;
      const item: ClipItem = { ...inc.item, progress: inc.got / inc.total };
      if (done) { item.blob = new Blob(inc.chunks as BlobPart[], { type: inc.item.mime }); item.progress = undefined; this.incoming.delete(h.id); }
      this.o.onItem(item);
    }
  }

  // ── Señalización ──────────────────────────────────────────────────────
  private async send(sig: Signal, to?: string) {
    const ct = await encryptJson(this.o.key, sig);
    await this.ch?.send({ type: "broadcast", event: "sig", payload: { from: this.o.deviceId, to, ct } });
  }

  private async onSignal(payload: { from: string; to?: string; ct: string }) {
    if (this.stopped || payload.from === this.o.deviceId) return;
    if (payload.to && payload.to !== this.o.deviceId) return;
    let sig: Signal;
    try { sig = await decryptJson<Signal>(this.o.key, payload.ct); } catch { return; } // otra frase: se ignora
    const from = payload.from;

    if (sig.kind === "hello") {
      if (this.peers.has(from)) return;
      if (this.o.deviceId < from) await this.connect(from, sig.name ?? "Dispositivo", true);
      else await this.send({ kind: "hello", name: this.o.deviceName }, from); // el otro lado inicia
    } else if (sig.kind === "offer") {
      this.peers.get(from)?.pc.close();
      const p = await this.connect(from, sig.name ?? "Dispositivo", false);
      await p.pc.setRemoteDescription(sig.data as RTCSessionDescriptionInit);
      await this.flushIce(p);
      const answer = await p.pc.createAnswer();
      await p.pc.setLocalDescription(answer);
      await this.send({ kind: "answer", data: answer }, from);
    } else if (sig.kind === "answer") {
      const p = this.peers.get(from);
      if (!p) return;
      await p.pc.setRemoteDescription(sig.data as RTCSessionDescriptionInit);
      await this.flushIce(p);
    } else if (sig.kind === "ice") {
      const p = this.peers.get(from);
      if (!p) return;
      if (p.pc.remoteDescription) await p.pc.addIceCandidate(sig.data as RTCIceCandidateInit).catch(() => {});
      else p.pending.push(sig.data as RTCIceCandidateInit);
    }
  }

  private async flushIce(p: PeerConn) {
    for (const c of p.pending.splice(0)) await p.pc.addIceCandidate(c).catch(() => {});
  }

  private async connect(id: string, name: string, initiator: boolean): Promise<PeerConn> {
    const pc = new RTCPeerConnection(ICE);
    const p: PeerConn = { id, name, pc, pending: [] };
    this.peers.set(id, p);
    pc.onicecandidate = (e) => { if (e.candidate) void this.send({ kind: "ice", data: e.candidate.toJSON() }, id); };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        if (this.peers.get(id) === p) this.peers.delete(id);
        pc.close();
      }
      this.emitPeers();
    };
    const wire = (dc: RTCDataChannel) => {
      p.dc = dc;
      dc.binaryType = "arraybuffer";
      dc.onopen = () => this.emitPeers();
      dc.onclose = () => this.emitPeers();
      dc.onmessage = (e) => { void this.onFrame(p, e.data as ArrayBuffer); };
    };
    if (initiator) {
      wire(pc.createDataChannel("clip"));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await this.send({ kind: "offer", name: this.o.deviceName, data: offer }, id);
    } else {
      pc.ondatachannel = (e) => wire(e.channel);
    }
    this.emitPeers();
    return p;
  }

  private emitPeers() {
    this.o.onPeers([...this.peers.values()].map((p) => ({
      id: p.id, name: p.name, state: p.dc?.readyState === "open" ? "connected" : "connecting",
    })));
  }
}
