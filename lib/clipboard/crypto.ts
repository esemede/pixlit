// Cifrado extremo a extremo del portapapeles. La clave se deriva en el navegador
// a partir de una frase que nunca sale del dispositivo.

const enc = new TextEncoder();

export async function deriveKey(passphrase: string, userId: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", iterations: 200_000, salt: enc.encode(`pixlit-clipboard:${userId}`) },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Devuelve iv(12) || ciphertext. */
export async function encryptBytes(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data as BufferSource));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv, 0);
  out.set(ct, 12);
  return out;
}

export async function decryptBytes(key: CryptoKey, packed: Uint8Array): Promise<Uint8Array> {
  const iv = packed.slice(0, 12);
  const ct = packed.slice(12);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct as BufferSource));
}

export function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<string> {
  return toB64(await encryptBytes(key, enc.encode(JSON.stringify(value))));
}

export async function decryptJson<T>(key: CryptoKey, b64: string): Promise<T> {
  return JSON.parse(new TextDecoder().decode(await decryptBytes(key, fromB64(b64)))) as T;
}
