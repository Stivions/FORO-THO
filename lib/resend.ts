import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export interface AnnouncePayload {
  subject:    string
  headline:   string
  message:    string
  ctaText?:   string
  ctaUrl?:    string
  senderName: string
}

export function buildAnnouncementEmail(payload: AnnouncePayload): string {
  const { subject, headline, message, ctaText, ctaUrl, senderName } = payload
  const msgHtml = message.replace(/\n/g, '<br/>')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#050810;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050810;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#0a0f18;border:1px solid #00fff530;border-radius:4px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#050810;padding:24px 32px;border-bottom:1px solid #00fff520;text-align:center;">
            <!-- Corner brackets via text -->
            <div style="display:inline-block;position:relative;">
              <span style="color:#00fff5;font-size:22px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;text-shadow:0 0 14px #00fff5,0 0 28px #00fff540;">
                SKILL ALL SHOW
              </span>
            </div>
            <div style="color:#00fff540;font-size:10px;letter-spacing:0.2em;margin-top:4px;">
              SYS::DEDSEC_NET &nbsp;|&nbsp; STATUS: ONLINE
            </div>
          </td>
        </tr>

        <!-- Headline banner -->
        <tr>
          <td style="background:linear-gradient(135deg,#00fff508,#050810);padding:28px 32px 20px;border-bottom:1px solid #00fff515;">
            <div style="color:#00fff540;font-size:10px;letter-spacing:0.2em;margin-bottom:8px;">&gt; ANUNCIO_OFICIAL</div>
            <h1 style="margin:0;color:#00fff5;font-size:22px;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;text-shadow:0 0 12px #00fff540;">
              ${headline}
            </h1>
          </td>
        </tr>

        <!-- Message body -->
        <tr>
          <td style="padding:28px 32px;color:#c8fff8;font-size:14px;line-height:1.8;letter-spacing:0.03em;">
            ${msgHtml}
          </td>
        </tr>

        ${ctaText && ctaUrl ? `
        <!-- CTA Button -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <a href="${ctaUrl}"
              style="display:inline-block;padding:12px 32px;background:transparent;border:1px solid #00fff5;color:#00fff5;text-decoration:none;font-family:'Courier New',monospace;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;text-shadow:0 0 8px #00fff540;">
              &gt; ${ctaText}
            </a>
          </td>
        </tr>
        ` : ''}

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:#00fff510;"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;text-align:center;">
            <p style="margin:0 0 4px;color:#00fff540;font-size:10px;letter-spacing:0.1em;">
              Enviado por <strong style="color:#00fff5;">${senderName}</strong> · Skill All Show
            </p>
            <p style="margin:0;color:#00fff530;font-size:9px;letter-spacing:0.08em;">
              WE_ARE_DEDSEC &nbsp;·&nbsp; CTOS_OFFLINE
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
