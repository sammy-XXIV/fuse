import { NextRequest, NextResponse } from "next/server";
import { generateGuardianToken } from "@/lib/guardian";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fusevault.xyz";

export async function POST(req: NextRequest) {
  try {
    const { emails, vaultId, appUrl } = await req.json();
    const baseUrl = appUrl ?? APP_URL;

    await Promise.all(
      (emails as string[]).filter((e: string) => e?.includes("@")).map(async (email: string) => {
        const token = generateGuardianToken(email, vaultId);
        const confirmUrl = `${baseUrl}/confirm?vault=${vaultId}&email=${encodeURIComponent(email)}&token=${token}`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Fuse <noreply@fusevault.xyz>",
            to: [email],
            subject: "You've been named a guardian — Fuse",
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#070D1B;font-family:Inter,system-ui,sans-serif;color:#F8FAFF;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070D1B;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#78F0D4;border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;font-size:18px;">⚡</td>
                  <td style="padding-left:10px;font-size:22px;font-weight:800;color:#78F0D4;letter-spacing:0.04em;">Fuse</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#0D1829;border:1px solid #1E3A4A;border-radius:20px;padding:40px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#78F0D4;text-transform:uppercase;letter-spacing:0.10em;">Guardian Request</p>
              <h1 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#F8FAFF;line-height:1.2;">You&rsquo;ve been named a guardian.</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#7A8BAD;line-height:1.7;">
                Someone you trust has added you as a guardian on their Fuse vault. If you believe they are unreachable or something has happened to them, click below to confirm — no crypto wallet needed.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:4px 0 28px;">
                    <a href="${confirmUrl}" style="display:inline-block;background:#78F0D4;color:#060D1A;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;padding:14px 40px;">
                      Confirm as Guardian &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 6px;font-size:12px;color:#4A5B7A;">Or copy this link into your browser:</p>
              <p style="margin:0;font-size:12px;color:#78F0D4;word-break:break-all;line-height:1.6;">${confirmUrl}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#3A4B6A;line-height:1.8;">
                Sent via Fuse &middot; Encrypted file delivery on Sui<br/>
                <a href="${baseUrl}" style="color:#78F0D4;text-decoration:none;">fusevault.xyz</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
          }),
        });
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Guardian notify error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
