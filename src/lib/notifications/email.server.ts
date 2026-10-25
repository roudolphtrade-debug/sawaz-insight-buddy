/**
 * Pass 3F : Abstraction de provider email.
 * Aucune dépendance forte : le reste du code ne connaît que l'interface
 * `EmailProvider`. Le provider réel est résolu au runtime ; sans configuration,
 * le provider "log" est utilisé (rien n'est envoyé, tout est tracé).
 */

import { resendProviderFromEnv } from "./providers/resend.server";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Identité graphique du tenant, utilisée par le rendu. */
  tenant: { name: string; primary: string; logoUrl: string | null };
};

export type EmailSendResult = { ok: true; providerId: string } | { ok: false; error: string };

export interface EmailProvider {
  readonly id: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

/** Provider par défaut : trace la sortie serveur, n'envoie rien. */
export const logEmailProvider: EmailProvider = {
  id: "log",
  async send(message) {
    console.info("[email:log]", message.to, "·", message.subject);
    return { ok: true, providerId: "log" };
  },
};

let override: EmailProvider | null = null;

/** Permet d'injecter un provider (tests, futur provider transactionnel). */
export function setEmailProvider(provider: EmailProvider | null) {
  override = provider;
}

export function resolveEmailProvider(): EmailProvider {
  if (override) return override;
  // Provider réel résolu au runtime (clés lues ici, jamais au module scope).
  // Sans configuration, on retombe sur le provider log : aucune dépendance forte.
  return resendProviderFromEnv() ?? logEmailProvider;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Gabarit transactionnel « Strategic Review disponible », thémé par tenant. */
export function renderReviewPublishedEmail(input: {
  tenantName: string;
  primary: string;
  logoUrl: string | null;
  recipientName: string;
  reviewTitle: string;
  periodLabel: string;
  url: string;
}): { subject: string; html: string; text: string } {
  const subject = `Ta Strategic Review ${input.tenantName} est disponible`;
  const logo = input.logoUrl
    ? `<img src="${escapeHtml(input.logoUrl)}" alt="${escapeHtml(input.tenantName)}" style="height:34px" />`
    : `<span style="font-weight:800;font-size:18px;color:${escapeHtml(input.primary)}">${escapeHtml(input.tenantName)}</span>`;

  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#0B0C0F;color:#F4F4F5;font-family:Manrope,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:560px;background:#14151A;border:1px solid #23252C;border-radius:14px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:24px 24px 0">${logo}</td></tr>
      <tr><td style="padding:20px 24px 0">
        <p style="margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${escapeHtml(input.primary)}">Sawaz Strategic Review</p>
        <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3">${escapeHtml(input.reviewTitle)}</h1>
        <p style="margin:8px 0 0;font-size:14px;color:#94969F">${escapeHtml(input.periodLabel)}</p>
      </td></tr>
      <tr><td style="padding:18px 24px 0">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#D1D2D6">Bonjour ${escapeHtml(input.recipientName)},<br/>ton analyse stratégique est prête. Elle est accessible via un lien sécurisé, personnel et révocable.</p>
      </td></tr>
      <tr><td style="padding:24px">
        <a href="${escapeHtml(input.url)}" style="display:inline-block;background:${escapeHtml(input.primary)};color:#0B0C0F;font-weight:700;font-size:15px;text-decoration:none;padding:13px 22px;border-radius:10px">Ouvrir ma Strategic Review</a>
        <p style="margin:16px 0 0;font-size:12px;color:#94969F">Document confidentiel. Ne transfère pas ce lien : il ouvre un accès à ta restitution.</p>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:11px;color:#6B6D75">Sawaz Client Intelligence</p>
  </td></tr></table></body></html>`;

  const text = `${input.reviewTitle}\n${input.periodLabel}\n\nTa Strategic Review est disponible : ${input.url}\n\nDocument confidentiel : ne transfère pas ce lien.`;

  return { subject, html, text };
}
