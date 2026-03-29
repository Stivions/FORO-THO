import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export function buildAuthCodeEmail(code: string, purpose: 'login' | 'register'): string {
  const headline = purpose === 'register' ? 'Verifica tu correo' : 'Codigo de acceso'
  const subtitle = purpose === 'register'
    ? 'Usa este codigo para confirmar tu cuenta en FOROSAS.'
    : 'Usa este codigo para iniciar sesion en FOROSAS.'
  const accent = purpose === 'register' ? '#00ff88' : '#00fff5'
  const badge = purpose === 'register' ? 'NUEVA CUENTA' : 'LOGIN SEGURO'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:#050810;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050810;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#0a0f18;border:1px solid #00fff530;border-radius:8px;overflow:hidden;box-shadow:0 0 30px #00fff515;">
        <tr>
          <td style="background:linear-gradient(135deg,#0d1524,#050810);padding:28px 32px;border-bottom:1px solid #00fff520;text-align:center;">
            <div style="display:inline-block;padding:6px 12px;border:1px solid #00fff530;color:${accent};font-size:10px;letter-spacing:0.2em;margin-bottom:14px;">
              ${badge}
            </div>
            <div style="color:#00fff5;font-size:26px;font-weight:900;letter-spacing:0.18em;text-shadow:0 0 16px #00fff540;">FOROSAS</div>
            <div style="color:#00fff540;font-size:10px;letter-spacing:0.2em;margin-top:6px;">AUTH::MAIL_CODE</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;color:#c8fff8;font-size:14px;line-height:1.8;">
            <div style="color:#00fff540;font-size:10px;letter-spacing:0.15em;margin-bottom:10px;">&gt; ${headline.toUpperCase()}</div>
            <p style="margin:0 0 18px;font-size:15px;">${subtitle}</p>
            <div style="margin:24px 0;padding:22px;border:1px solid #00fff540;background:linear-gradient(180deg,#0f1828,#09101b);text-align:center;border-radius:6px;">
              <div style="color:#00fff560;font-size:10px;letter-spacing:0.22em;margin-bottom:12px;">CODIGO VALIDO POR 10 MINUTOS</div>
              <div style="color:${accent};font-size:38px;font-weight:900;letter-spacing:0.35em;text-shadow:0 0 18px ${accent}55;">${code}</div>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border-collapse:collapse;">
              <tr>
                <td style="padding:12px 14px;border:1px solid #00fff520;background:#00fff508;color:#c8fff8;font-size:12px;">
                  1. Copia el codigo.
                  <br/>
                  2. Vuelve a FOROSAS.
                  <br/>
                  3. Pegalo para completar el acceso.
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#c8fff880;font-size:12px;">Si no solicitaste este codigo, puedes ignorar este correo con seguridad.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px;text-align:center;border-top:1px solid #00fff515;">
            <p style="margin:0;color:#00fff540;font-size:9px;letter-spacing:0.1em;">FOROSAS · CORREO DE ACCESO AUTOMATICO</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildVipReceiptEmail(username: string, expiresAt: Date): string {
  const expStr = expiresAt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>VIP Activado</title></head>
<body style="margin:0;padding:0;background:#050810;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050810;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#0a0f18;border:1px solid #ffaa0040;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#ffaa0015,#050810);padding:28px 32px;border-bottom:1px solid #ffaa0030;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">👑</div>
            <span style="color:#ffaa00;font-size:22px;font-weight:900;letter-spacing:0.15em;text-shadow:0 0 14px #ffaa0050;">SKILL ALL SHOW</span>
            <div style="color:#ffaa0060;font-size:10px;letter-spacing:0.2em;margin-top:4px;">MEMBRESÍA VIP ACTIVADA</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#c8fff8;font-size:14px;line-height:1.8;">
            <p style="margin:0 0 16px;">Hola <strong style="color:#ffaa00;">@${username}</strong>,</p>
            <p style="margin:0 0 16px;">Tu membresía <strong style="color:#ffaa00;">VIP</strong> ha sido activada exitosamente. Ahora tienes acceso completo a todo el contenido exclusivo:</p>
            <div style="background:#ffaa0010;border:1px solid #ffaa0030;border-radius:4px;padding:16px;margin:20px 0;">
              <div style="color:#ffaa00;font-size:11px;letter-spacing:0.15em;margin-bottom:12px;">// ACCESOS VIP</div>
              ${['CHAT VIP','MULTIMEDIA','HACK','PROGRAMAS','PROGRAMAS CRACKEADOS','TOOLS-SOURCES','CHEAT-SOURCES','WEB-CLONADAS','LEAKS','CUENTAS','ENTRETENIMIENTO','VOICE PRIVADOS'].map(c =>
                `<div style="color:#c8fff8;font-size:12px;font-family:'Courier New',monospace;padding:3px 0;">▸ ${c}</div>`
              ).join('')}
            </div>
            <p style="margin:16px 0 0;color:#c8fff880;font-size:12px;">Tu VIP es válido hasta: <strong style="color:#ffaa00;">${expStr}</strong></p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px;text-align:center;">
            <a href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}"
              style="display:inline-block;padding:12px 32px;background:transparent;border:1px solid #ffaa00;color:#ffaa00;text-decoration:none;font-family:'Courier New',monospace;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;">
              &gt; IR AL FORO
            </a>
          </td>
        </tr>
        <tr><td style="padding:16px 32px;text-align:center;border-top:1px solid #ffaa0020;">
          <p style="margin:0;color:#ffaa0040;font-size:9px;letter-spacing:0.08em;">SKILL ALL SHOW &nbsp;·&nbsp; WE_ARE_DEDSEC</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildVipAdminNotifEmail(username: string, email: string, method: string, amount: number, txHash?: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><title>Nueva compra VIP</title></head>
<body style="margin:0;padding:0;background:#050810;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050810;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#0a0f18;border:1px solid #00fff530;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#050810;padding:20px 32px;border-bottom:1px solid #00fff520;text-align:center;">
            <span style="color:#00fff5;font-size:18px;font-weight:900;letter-spacing:0.15em;">SKILL ALL SHOW</span>
            <div style="color:#00ff8860;font-size:10px;letter-spacing:0.2em;margin-top:4px;">💰 NUEVA COMPRA VIP</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;color:#c8fff8;font-size:14px;line-height:1.8;">
            <div style="color:#00fff540;font-size:10px;letter-spacing:0.15em;margin-bottom:16px;">&gt; DETALLES_TRANSACCION</div>
            <table width="100%" style="border-collapse:collapse;">
              <tr><td style="padding:6px 0;color:#00fff560;font-size:11px;width:120px;">USUARIO</td><td style="color:#c8fff8;font-size:13px;font-weight:700;">@${username}</td></tr>
              <tr><td style="padding:6px 0;color:#00fff560;font-size:11px;">EMAIL</td><td style="color:#c8fff8;font-size:13px;">${email}</td></tr>
              <tr><td style="padding:6px 0;color:#00fff560;font-size:11px;">MÉTODO</td><td style="color:#ffaa00;font-size:13px;font-weight:700;">${method.toUpperCase()}</td></tr>
              <tr><td style="padding:6px 0;color:#00fff560;font-size:11px;">MONTO</td><td style="color:#00ff88;font-size:13px;font-weight:700;">$${amount} USD</td></tr>
              ${txHash ? `<tr><td style="padding:6px 0;color:#00fff560;font-size:11px;">TX HASH</td><td style="color:#c8fff880;font-size:11px;word-break:break-all;">${txHash}</td></tr>` : ''}
            </table>
          </td>
        </tr>
        <tr><td style="padding:16px 32px;text-align:center;border-top:1px solid #00fff515;">
          <p style="margin:0;color:#00fff530;font-size:9px;letter-spacing:0.08em;">SKILL ALL SHOW &nbsp;·&nbsp; PANEL ADMIN</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildVipExpiryReminderEmail(username: string, expiresAt: Date): string {
  const expStr = expiresAt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>VIP por vencer</title></head>
<body style="margin:0;padding:0;background:#050810;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050810;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#0a0f18;border:1px solid #ffaa0035;border-radius:6px;overflow:hidden;">
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #ffaa0020;background:linear-gradient(135deg,#ffaa0012,#050810);text-align:center;">
            <div style="color:#ffaa00;font-size:11px;letter-spacing:0.2em;margin-bottom:10px;">VIP::REMINDER</div>
            <div style="color:#ffaa00;font-size:24px;font-weight:900;letter-spacing:0.15em;">FOROSAS</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;color:#c8fff8;font-size:14px;line-height:1.8;">
            <p style="margin:0 0 14px;">Hola <strong style="color:#ffaa00;">@${username}</strong>,</p>
            <p style="margin:0 0 16px;">Tu membresia VIP esta cerca de vencer. Para no perder acceso a las categorias privadas, renovala antes de la fecha limite.</p>
            <div style="padding:18px;border:1px solid #ffaa0035;border-radius:6px;background:#ffaa0008;text-align:center;margin:18px 0;">
              <div style="color:#ffaa0060;font-size:10px;letter-spacing:0.2em;margin-bottom:8px;">VENCE EL</div>
              <div style="color:#ffaa00;font-size:28px;font-weight:900;letter-spacing:0.08em;">${expStr}</div>
            </div>
            <p style="margin:0;color:#c8fff880;font-size:12px;">Si ya renovaste, puedes ignorar este aviso.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px;text-align:center;">
            <a href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/vip"
              style="display:inline-block;padding:12px 30px;border:1px solid #ffaa00;color:#ffaa00;text-decoration:none;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;">
              &gt; RENOVAR VIP
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

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
