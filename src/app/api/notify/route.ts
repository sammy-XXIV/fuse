import { Resend } from "resend";
import twilio from "twilio/lib/rest/Twilio";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const { heirContact, heirEmail, claimUrl: providedClaimUrl, vaultId, conditionLabel, personalMessage, delivery } = await req.json();

    const claimUrl = providedClaimUrl ?? `${APP_URL}/claim?vault=${vaultId}`;

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
      subject: "Someone secured files for you — Fuse",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#070D1B;font-family:Inter,system-ui,sans-serif;color:#F8FAFF;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070D1B;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
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

          <!-- Card -->
          <tr>
            <td style="background:#0D1829;border:1px solid #1E3A4A;border-radius:20px;padding:40px;">

              <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#78F0D4;text-transform:uppercase;letter-spacing:0.10em;">Encrypted Vault</p>
              <h1 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#F8FAFF;line-height:1.2;">
                Files have been secured for you.
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#7A8BAD;line-height:1.7;">
                Someone you trust has used Fuse to lock encrypted files in a vault with you as the recipient. When the delivery condition is met, you can use the link below to claim them instantly — no crypto wallet needed.
              </p>

              ${personalMessage ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-left:3px solid #78F0D4;padding:14px 18px;background:#0A1F1A;border-radius:0 10px 10px 0;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#78F0D4;text-transform:uppercase;letter-spacing:0.08em;">A message for you</p>
                    <p style="margin:0;font-size:15px;color:#F8FAFF;line-height:1.7;font-style:italic;">&ldquo;${personalMessage}&rdquo;</p>
                  </td>
                </tr>
              </table>
              ` : ""}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:4px 0 28px;">
                    <a href="${claimUrl}" style="display:inline-block;background:#78F0D4;color:#060D1A;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;padding:14px 40px;">
                      Access My Files &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:12px;color:#4A5B7A;">Or copy this link into your browser:</p>
              <p style="margin:0;font-size:12px;color:#78F0D4;word-break:break-all;line-height:1.6;">${claimUrl}</p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#3A4B6A;line-height:1.8;">
                Sent via Fuse &middot; Encrypted file delivery on Sui<br/>
                <a href="${APP_URL}" style="color:#78F0D4;text-decoration:none;">${APP_URL.replace(/^https?:\/\//, "")}</a>
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
