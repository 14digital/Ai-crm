import nodemailer from "nodemailer";

function transporter() {
  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT || 465);
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASSWORD;
  if (!host || !user || !pass) throw new Error("Mail is not configured (MAIL_HOST/MAIL_USER/MAIL_PASSWORD)");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const STATUS_COPY: Record<string, { heading: string; body: string; accent: string }> = {
  CONFIRMED: {
    heading: "Your booking is confirmed",
    body: "We're pleased to confirm your appointment. We look forward to seeing you!",
    accent: "#D946A0",
  },
  COMPLETED: {
    heading: "Thank you for visiting Glow Studio",
    body: "We hope you loved your treatment. We'd love to see you again soon.",
    accent: "#C9A961",
  },
  CANCELLED: {
    heading: "Your booking has been cancelled",
    body: "This appointment has been cancelled. If this wasn't expected, please get in touch with us on WhatsApp.",
    accent: "#B8317F",
  },
  PENDING: {
    heading: "Your booking is pending",
    body: "We've received your appointment request and it's awaiting confirmation.",
    accent: "#D946A0",
  },
};

export interface BookingEmailInput {
  to: string;
  customerName: string;
  service: string;
  scheduledAt: Date;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
}

function renderBookingEmail({ customerName, service, scheduledAt, status }: BookingEmailInput): string {
  const copy = STATUS_COPY[status] || STATUS_COPY.PENDING;
  const dateStr = scheduledAt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = scheduledAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FBF7F4;font-family:Georgia,'Cormorant Garamond',serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F4;padding:32px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(42,18,32,0.08);">
            <tr>
              <td style="background:#2A1220;padding:28px 32px;">
                <span style="font-size:20px;color:#ffffff;font-weight:700;">Glow Studio <i style="color:${copy.accent};">Desk</i></span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:22px;color:#2A1220;">${copy.heading}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#55505a;font-family:Arial,sans-serif;">
                  Hi ${customerName || "there"}, ${copy.body}
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F4;border-radius:12px;padding:4px;">
                  <tr>
                    <td style="padding:16px 20px;font-family:Arial,sans-serif;">
                      <div style="font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#9a8f94;margin-bottom:2px;">Service</div>
                      <div style="font-size:15px;font-weight:600;color:#2A1220;margin-bottom:14px;">${service}</div>
                      <div style="font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#9a8f94;margin-bottom:2px;">Date &amp; Time</div>
                      <div style="font-size:15px;font-weight:600;color:#2A1220;">${dateStr} at ${timeStr}</div>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;color:#9a8f94;font-family:Arial,sans-serif;">
                  Questions? Just reply to our WhatsApp chat and we'll be happy to help.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;background:#FBF7F4;text-align:center;">
                <span style="font-size:11px;color:#9a8f94;font-family:Arial,sans-serif;">Glow Studio Desk</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendBookingStatusEmail(input: BookingEmailInput): Promise<void> {
  const copy = STATUS_COPY[input.status] || STATUS_COPY.PENDING;
  await transporter().sendMail({
    from: `"${process.env.MAIL_FROM_NAME || "Glow Studio Desk"}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to: input.to,
    subject: `${copy.heading} — Glow Studio`,
    html: renderBookingEmail(input),
  });
}
