import type { EmailMessage, EmailProvider, EmailSendResult } from "../email.server";

/**
 * Provider transactionnel r├®el (API HTTP Resend), branch├® uniquement si la
 * configuration est pr├®sente. Aucun couplage m├®tier : le reste du code ne
 * conna├«t que l'interface `EmailProvider`.
 *
 * Configuration serveur (secrets, jamais expos├®s au navigateur) :
 *  - EMAIL_PROVIDER   : "resend" (sinon provider log)
 *  - RESEND_API_KEY   : cl├® API
 *  - EMAIL_FROM       : "Sawaz <review@domaine-verifie.tld>"
 *  - EMAIL_REPLY_TO   : optionnel
 *
 * Le domaine d'envoi doit ├¬tre v├®rifi├® avec SPF, DKIM et DMARC ÔÇö voir
 * docs/production-hardening.md.
 */

const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createResendProvider(config: {
  apiKey: string;
  from: string;
  replyTo?: string | undefined;
}): EmailProvider {
  return {
    id: "resend",
    async send(message: EmailMessage): Promise<EmailSendResult> {
      let lastError = "Envoi email impossible";

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              "Content-Type": "application/json",
              // Emp├¬che un double envoi si une tentative r├®ussit sans r├®ponse lisible.
              "Idempotency-Key": `${message.to}:${message.subject}`,
            },
            body: JSON.stringify({
              from: config.from,
              to: [message.to],
              subject: message.subject,
              html: message.html,
              text: message.text,
              ...(config.replyTo ? { reply_to: config.replyTo } : {}),
            }),
          });

          if (response.ok) {
            const payload = (await response.json().catch(() => ({}))) as { id?: string };
            return { ok: true, providerId: payload.id ?? "resend" };
          }

          lastError = `Provider email ${response.status}`;
          if (!RETRYABLE_STATUS.has(response.status)) break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Erreur r├®seau";
        }

        if (attempt < MAX_ATTEMPTS) await wait(300 * 2 ** (attempt - 1));
      }

      console.error(JSON.stringify({ level: "error", scope: "email", message: lastError }));
      return { ok: false, error: lastError };
    },
  };
}

/** R├®sout le provider r├®el depuis l'environnement, ou `null` si non configur├®. */
export function resendProviderFromEnv(): EmailProvider | null {
  if ((process.env['EMAIL_PROVIDER'] ?? "").toLowerCase() !== "resend") return null;
  const apiKey = process.env['RESEND_API_KEY'];
  const from = process.env['EMAIL_FROM'];
  if (!apiKey || !from) {
    console.warn("[email] EMAIL_PROVIDER=resend mais RESEND_API_KEY/EMAIL_FROM manquants");
    return null;
  }
  return createResendProvider({ apiKey, from, replyTo: process.env['EMAIL_REPLY_TO'] });
}
