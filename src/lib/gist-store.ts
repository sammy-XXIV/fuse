// Simple key-value store backed by a secret GitHub Gist.
// Structure: { "claim:{vaultId}": "<claimUrl>", "sub:{vaultId}": ["email1","email2"] }

const GIST_ID = process.env.CLAIMS_GIST_ID!;
const GH_TOKEN = process.env.GITHUB_TOKEN!;
const API = "https://api.github.com";

async function readAll(): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}/gists/${GIST_ID}`, {
    headers: { Authorization: `Bearer ${GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!res.ok) throw new Error(`Gist read failed: ${res.status}`);
  const data = await res.json();
  const content = data.files?.["claims.json"]?.content ?? "{}";
  return JSON.parse(content);
}

async function writeAll(store: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${API}/gists/${GIST_ID}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ files: { "claims.json": { content: JSON.stringify(store) } } }),
  });
  if (!res.ok) throw new Error(`Gist write failed: ${res.status}`);
}

export async function setClaimUrl(vaultId: string, claimUrl: string): Promise<void> {
  const store = await readAll();
  store[`claim:${vaultId}`] = claimUrl;
  await writeAll(store);
}

export async function getClaimUrl(vaultId: string): Promise<string | null> {
  const store = await readAll();
  return (store[`claim:${vaultId}`] as string) ?? null;
}

export async function addSubscriber(vaultId: string, email: string): Promise<void> {
  const store = await readAll();
  const key = `sub:${vaultId}`;
  const existing = (store[key] as string[]) ?? [];
  if (!existing.includes(email)) existing.push(email);
  store[key] = existing;
  await writeAll(store);
}

export async function getSubscribers(vaultId: string): Promise<string[]> {
  const store = await readAll();
  return (store[`sub:${vaultId}`] as string[]) ?? [];
}
