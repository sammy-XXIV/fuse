import { addSubscriber } from "@/lib/gist-store";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { vaultId, email } = await req.json();
  if (!vaultId || !email || !email.includes("@")) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }
  await addSubscriber(vaultId, email);
  return NextResponse.json({ ok: true });
}
