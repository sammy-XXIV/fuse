import { Resend } from "resend";
import twilio from "twilio/lib/rest/Twilio";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const { heirContact, heirEmail, vaultId, conditionLabel, personalMessage, delivery } = await req.json();

    const claimUrl = `${APP_URL}/claim?vault=${vaultId}`;

    // SMS delivery
    if (delivery === "sms") {
      const phone = heirContact;
      if (!phone) return NextResponse.json({ error: "No phone number" }, { status: 400 });

      const smsBody = personalMessage
        ? `⚡ Fuse: "${personalMessage}"\n\nClaim your files: ${claimUrl}`
        : `⚡ Fuse: Files have been left for you. Claim them here: ${claimUrl}`;

      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE!,
        to: phone,
        body: smsBody,
      });

      return NextResponse.json({ ok: true });
    }

    // Email delivery
    const email = heirEmail || heirContact;
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "No valid email" }, { status: 400 });
    }

    await resend.emails.send({
      from: "Fuse <onboarding@resend.dev>",
      to: email,
      subject: "Your files are ready to claim — Fuse",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#070D1B;font-family:Inter,system-ui,sans-serif;color:#F8FAFF;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070D1B;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;background:#78F0D4;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;line-height:40px;text-align:center;">⚡</div>
                <span style="font-size:22px;font-weight:800;color:#78F0D4;letter-spacing:0.04em;">Fuse</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:rgba(13,24,41,0.95);border:1px solid rgba(120,240,212,0.18);border-radius:20px;padding:40px;">

              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#78F0D4;text-transform:uppercase;letter-spacing:0.08em;">Vault Settled</p>
              <h1 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#F8FAFF;line-height:1.2;">
                Your files are ready.
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#7A8BAD;line-height:1.7;">
                Someone left files for you using Fuse. The vault has settled and your files are now available to claim. Click below to access them.
              </p>

              ${personalMessage ? `
              <div style="background:rgba(120,240,212,0.06);border-left:3px solid #78F0D4;border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:20px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#78F0D4;text-transform:uppercase;letter-spacing:0.08em;">A message for you</p>
                <p style="margin:0;font-size:15px;color:#F8FAFF;line-height:1.7;font-style:italic;">"${personalMessage}"</p>
              </div>
              ` : ""}

              ${conditionLabel ? `
              <div style="background:rgba(120,240,212,0.04);border:1px solid rgba(120,240,212,0.10);border-radius:12px;padding:14px 18px;margin-bottom:28px;">
                <p style="margin:0;font-size:13px;color:#7A8BAD;">${conditionLabel}</p>
              </div>
              ` : ""}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="${claimUrl}" style="display:inline-block;background:#78F0D4;color:#060D1A;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;padding:14px 36px;">
                      Claim My Files →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#7A8BAD;line-height:1.6;">
                Or copy this link into your browser:<br/>
                <span style="color:#78F0D4;word-break:break-all;">${claimUrl}</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#3A4B6A;">
                Sent via Fuse · Encrypted file delivery on Sui · <a href="${APP_URL}" style="color:#78F0D4;text-decoration:none;">fuse.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Notify error", e);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
