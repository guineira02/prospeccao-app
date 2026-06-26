// Cliente Brevo (Sendinblue) — API transacional de email.
const BREVO_API   = 'https://api.brevo.com/v3/smtp/email'
const BREVO_KEY   = process.env.BREVO_API_KEY || ''
const FROM_EMAIL  = process.env.BREVO_SENDER_EMAIL || 'noreply@tendenciaenergia.com.br'
const FROM_NAME   = process.env.BREVO_SENDER_NAME || 'Prospecção · Tendência Energia'

export interface EmailResult { ok: boolean; status: number; detail?: string }

export async function brevoEnviar(
  para: { email: string; nome?: string },
  assunto: string,
  html: string
): Promise<EmailResult> {
  if (!BREVO_KEY) return { ok: false, status: 0, detail: 'BREVO_API_KEY não configurada' }
  try {
    const res = await fetch(BREVO_API, {
      method: 'POST',
      headers: {
        'api-key':       BREVO_KEY,
        'Content-Type':  'application/json',
        accept:          'application/json',
      },
      body: JSON.stringify({
        sender:      { email: FROM_EMAIL, name: FROM_NAME },
        to:          [{ email: para.email, name: para.nome || para.email }],
        subject:     assunto,
        htmlContent: html,
      }),
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      return { ok: false, status: res.status, detail: t.slice(0, 300) }
    }
    return { ok: true, status: res.status }
  } catch (e) {
    return { ok: false, status: 0, detail: e instanceof Error ? e.message : 'erro' }
  }
}

// Template do email de follow-ups atrasados (HTML inline, identidade Nexi/Tendência).
export function emailFollowupsAtrasados(
  agenteNome: string,
  itens: { nome: string; uf: string; diasAtraso: number; estagio: string }[],
  appUrl: string
): string {
  const linhas = itens.map(i => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #eceef2;">
        <div style="font-weight:600;color:#15161b;font-size:14px;">${escapeHtml(i.nome)}</div>
        <div style="color:#6b7280;font-size:12px;margin-top:2px;">${escapeHtml(i.uf)} · ${escapeHtml(i.estagio)}</div>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #eceef2;text-align:right;white-space:nowrap;">
        <span style="background:#fdecec;color:#d92d20;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;">
          ${i.diasAtraso} dia${i.diasAtraso > 1 ? 's' : ''} de atraso
        </span>
      </td>
    </tr>`).join('')

  return `
  <div style="background:#f4f5f7;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <div style="background:#15161b;padding:24px;">
        <div style="display:inline-flex;align-items:center;gap:8px;">
          <div style="width:28px;height:28px;border-radius:8px;background:#09bc8a;text-align:center;line-height:28px;color:#0d1e18;font-weight:700;">▶</div>
          <span style="color:#ffffff;font-weight:700;font-size:16px;">Prospecção</span>
        </div>
      </div>
      <div style="padding:24px;">
        <h1 style="font-size:18px;color:#15161b;margin:0 0 4px;">Olá, ${escapeHtml(agenteNome.split(' ')[0] || 'agente')}</h1>
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px;line-height:1.5;">
          Você tem <strong style="color:#d92d20;">${itens.length} follow-up${itens.length > 1 ? 's' : ''}</strong> em atraso há mais de 2 dias. Não deixe o ritmo esfriar.
        </p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #eceef2;border-radius:10px;overflow:hidden;">
          ${linhas}
        </table>
        <div style="text-align:center;margin-top:24px;">
          <a href="${appUrl}/dashboard/followups" style="display:inline-block;background:#09bc8a;color:#0d1e18;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:10px;">
            Abrir follow-ups
          </a>
        </div>
      </div>
      <div style="padding:16px 24px;background:#fafbfc;border-top:1px solid #eceef2;text-align:center;color:#9ca3af;font-size:11px;">
        Tendência Energia · sistema de prospecção comercial
      </div>
    </div>
  </div>`
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
