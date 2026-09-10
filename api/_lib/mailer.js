/**
 * Envio de e-mail via Resend.
 * Sem RESEND_API_KEY o pedido NÃO falha: loga e devolve skipped.
 * `to` deve ser o endereço nu (sem display name) — restrição do remetente
 * provisório beth.t@example.com.
 */

const DEFAULT_FROM = 'Fundamentos de Jogos Digitais <beth.t@example.com>';

function domainOf(email) {
  const value = String(email || '');
  const at = value.lastIndexOf('@');
  return at >= 0 ? value.slice(at + 1) : '?';
}

export function mailFrom() {
  const raw = String(process.env.MAIL_FROM || '').trim();
  return raw || DEFAULT_FROM;
}

export async function sendMail({ to, subject, html, text }) {
  const recipient = String(to || '').trim();
  if (!recipient) {
    console.error('[mailer] destinatário vazio; e-mail não enviado.', { subject });
    return { ok: false, skipped: true };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[mailer] RESEND_API_KEY ausente; e-mail não enviado.', {
      subject,
      toDomain: domainOf(recipient),
    });
    return { ok: false, skipped: true };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: mailFrom(),
      to: [recipient],
      subject,
      html,
      text,
    });

    if (error) {
      console.error('[mailer] Resend recusou o envio.', {
        subject,
        toDomain: domainOf(recipient),
        message: error.message || String(error),
      });
      return { ok: false, error };
    }

    return { ok: true, id: data?.id || null };
  } catch (error) {
    console.error('[mailer] falha ao enviar.', {
      subject,
      toDomain: domainOf(recipient),
      message: error?.message || String(error),
    });
    return { ok: false, error };
  }
}
