/**
 * Envio de e-mail: Resend (se RESEND_API_KEY) e/ou SMTP (Gmail etc.).
 * Sem provedor o pedido NÃO falha na API pública: loga e devolve skipped.
 *
 * beth.t@example.com só entrega para o e-mail da conta Resend.
 * Para a turma: domínio verificado no Resend, ou SMTP_HOST + SMTP_USER + SMTP_PASS.
 */

const DEFAULT_RESEND_FROM = 'beth.t@example.com';

function domainOf(email) {
  const value = String(email || '');
  const at = value.lastIndexOf('@');
  return at >= 0 ? value.slice(at + 1) : '?';
}

function smtpConfig() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').replace(/\s+/g, '').trim();
  if (!host || !user || !pass) return null;

  const port = Number.parseInt(String(process.env.SMTP_PORT || '465'), 10) || 465;
  const secureFlag = String(process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure = secureFlag === 'true' || (secureFlag !== 'false' && port === 465);

  return { host, port, user, pass, secure };
}

function displayFrom(address) {
  const value = String(address || '').trim();
  if (!value) return DEFAULT_RESEND_FROM;
  if (value.includes('<')) return value;
  return `Fundamentos de Jogos Digitais <${value}>`;
}

export function mailFrom() {
  const raw = String(process.env.MAIL_FROM || '').trim();
  if (raw) return displayFrom(raw);

  const smtp = smtpConfig();
  if (smtp?.user) return displayFrom(smtp.user);

  return DEFAULT_RESEND_FROM;
}

function resendFrom() {
  const dedicated = String(process.env.RESEND_MAIL_FROM || '').trim();
  if (dedicated) return displayFrom(dedicated);
  // Gmail no MAIL_FROM não é domínio verificado no Resend — usa o remetente de teste.
  const from = mailFrom();
  if (/@gmail\.com>/i.test(from) || /@gmail\.com$/i.test(from)) return DEFAULT_RESEND_FROM;
  return from;
}

function isResendTestingRestriction(error) {
  const message = String(error?.message || error || '');
  return /only send testing emails/i.test(message)
    || /verify a domain/i.test(message)
    || /domain is not verified/i.test(message)
    || /onboarding\.dev/i.test(message);
}

async function sendViaResend({ recipient, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, skipped: true, reason: 'no_resend_key' };

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const from = resendFrom();
    const { data, error } = await resend.emails.send({
      from,
      to: [recipient],
      subject,
      html,
      text,
    });

    if (error) {
      const testing = isResendTestingRestriction(error);
      console.error('[mailer] Resend recusou o envio.', {
        subject,
        toDomain: domainOf(recipient),
        testingRestriction: testing,
        message: error.message || String(error),
      });
      if (testing) {
        console.error('[mailer] beth.t@example.com só entrega na caixa da conta Resend. Verifique um domínio ou configure SMTP_HOST.');
      }
      return { ok: false, error, reason: testing ? 'resend_testing_domain' : 'resend_rejected' };
    }

    return { ok: true, id: data?.id || null, provider: 'resend' };
  } catch (error) {
    console.error('[mailer] falha ao enviar via Resend.', {
      subject,
      toDomain: domainOf(recipient),
      message: error?.message || String(error),
    });
    return { ok: false, error, reason: 'resend_exception' };
  }
}

async function sendViaSmtp({ recipient, subject, html, text }) {
  const smtp = smtpConfig();
  if (!smtp) return { ok: false, skipped: true, reason: 'no_smtp' };

  try {
    const mailMod = await import('nodemailer');
    const createTransport = mailMod.createTransport ?? mailMod.default?.createTransport;
    if (typeof createTransport !== 'function') {
      throw new Error('nodemailer.createTransport indisponível');
    }
    const isGmail = /gmail\.com$/i.test(smtp.host);
    const transporter = createTransport(
      isGmail
        ? {
            service: 'gmail',
            auth: { user: smtp.user, pass: smtp.pass.replace(/\s+/g, '') },
            connectionTimeout: 8000,
            socketTimeout: 8000,
          }
        : {
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: { user: smtp.user, pass: smtp.pass.replace(/\s+/g, '') },
            connectionTimeout: 8000,
            socketTimeout: 8000,
          },
    );

    const info = await transporter.sendMail({
      from: displayFrom(smtp.user),
      to: recipient,
      subject,
      html,
      text,
    });

    return { ok: true, id: info?.messageId || null, provider: 'smtp' };
  } catch (error) {
    console.error('[mailer] falha ao enviar via SMTP.', {
      subject,
      toDomain: domainOf(recipient),
      host: smtp.host,
      message: error?.message || String(error),
    });
    return { ok: false, error, reason: 'smtp_exception' };
  }
}

export async function sendMail({ to, subject, html, text }) {
  const recipient = String(to || '').trim();
  if (!recipient) {
    console.error('[mailer] destinatário vazio; e-mail não enviado.', { subject });
    return { ok: false, skipped: true, reason: 'empty_to' };
  }

  const payload = { recipient, subject, html, text };
  const hasResend = Boolean(String(process.env.RESEND_API_KEY || '').trim());
  const hasSmtp = Boolean(smtpConfig());

  if (hasResend) {
    const resendResult = await sendViaResend(payload);
    if (resendResult.ok) return resendResult;

    if (hasSmtp) {
      console.warn('[mailer] Resend falhou; tentando SMTP.', { reason: resendResult.reason });
      return sendViaSmtp(payload);
    }

    return resendResult;
  }

  if (hasSmtp) {
    return sendViaSmtp(payload);
  }

  console.error('[mailer] RESEND_API_KEY ausente; e-mail não enviado.', {
    subject,
    toDomain: domainOf(recipient),
    hint: 'Defina RESEND_API_KEY ou SMTP_HOST + SMTP_USER + SMTP_PASS na Vercel / .env.local',
  });
  return { ok: false, skipped: true, reason: 'no_provider' };
}
