import { createHmac } from "crypto";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export function emailToKeypair(email: string): Ed25519Keypair {
  const secret = process.env.GUARDIAN_SECRET!;
  const seed = createHmac("sha256", secret)
    .update(email.toLowerCase().trim())
    .digest();
  return Ed25519Keypair.fromSecretKey(seed);
}

export function emailToAddress(email: string): string {
  return emailToKeypair(email).getPublicKey().toSuiAddress();
}

export function generateGuardianToken(email: string, vaultId: string): string {
  const secret = process.env.GUARDIAN_SECRET!;
  return createHmac("sha256", secret)
    .update(`${email.toLowerCase().trim()}:${vaultId}`)
    .digest("hex");
}

export function verifyGuardianToken(email: string, vaultId: string, token: string): boolean {
  return generateGuardianToken(email, vaultId) === token;
}
