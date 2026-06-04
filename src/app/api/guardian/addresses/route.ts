import { NextRequest, NextResponse } from "next/server";
import { emailToAddress } from "@/lib/guardian";

export async function POST(req: NextRequest) {
  try {
    const { emails } = await req.json();
    if (!Array.isArray(emails)) return NextResponse.json({ error: "emails must be array" }, { status: 400 });

    const addresses = emails
      .filter((e: string) => e?.includes("@"))
      .map((e: string) => ({ email: e, address: emailToAddress(e) }));

    return NextResponse.json({ addresses });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
