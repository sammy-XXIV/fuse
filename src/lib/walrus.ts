const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

export interface UploadResult {
  blobId: string;
  size: number;
}

// Upload encrypted bytes to Walrus — returns blobId
export async function uploadToWalrus(
  encryptedBytes: Uint8Array,
  epochs = 5
): Promise<UploadResult> {
  const res = await fetch(`${PUBLISHER}/v1/blobs?epochs=${epochs}`, {
    method: "PUT",
    body: encryptedBytes.buffer as ArrayBuffer,
    headers: { "Content-Type": "application/octet-stream" },
  });

  if (!res.ok) throw new Error(`Walrus upload failed: ${res.statusText}`);

  const data = await res.json();

  // Walrus returns either newlyCreated or alreadyCertified
  const blobId =
    data.newlyCreated?.blobObject?.blobId ??
    data.alreadyCertified?.blobId;

  if (!blobId) throw new Error("No blobId in Walrus response");

  return { blobId, size: encryptedBytes.length };
}

// Download encrypted bytes from Walrus by blobId
export async function downloadFromWalrus(blobId: string): Promise<Uint8Array> {
  const res = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`);
  if (!res.ok) throw new Error(`Walrus download failed: ${res.statusText}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

// Extend blob storage lifetime (renew epochs)
export async function extendWalrus(blobId: string, epochs = 5): Promise<void> {
  await fetch(`${PUBLISHER}/v1/blobs/${blobId}?epochs=${epochs}`, {
    method: "PUT",
  });
}
