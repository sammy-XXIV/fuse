// Client-side AES-256-GCM encryption — files never leave the browser unencrypted

function uint8ToB64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return uint8ToB64(new Uint8Array(raw));
}

export async function importKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
}

export async function encryptFiles(files: File[]): Promise<{
  encrypted: Uint8Array;
  keyB64: string;
}> {
  // Bundle all files into a single JSON blob, then encrypt
  const bundle: { name: string; type: string; dataB64: string }[] = [];

  for (const file of files) {
    const buf = await file.arrayBuffer();
    const b64 = uint8ToB64(new Uint8Array(buf));
    bundle.push({ name: file.name, type: file.type, dataB64: b64 });
  }

  const plaintext = new TextEncoder().encode(JSON.stringify(bundle));
  const key = await generateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  // Prepend IV to ciphertext: [12 bytes IV][ciphertext]
  const result = new Uint8Array(12 + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), 12);

  return { encrypted: result, keyB64: await exportKey(key) };
}

export async function decryptFiles(
  encrypted: Uint8Array,
  keyB64: string
): Promise<{ name: string; type: string; dataB64: string }[]> {
  const iv = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);
  const key = await importKey(keyB64);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return JSON.parse(new TextDecoder().decode(plaintext));
}
