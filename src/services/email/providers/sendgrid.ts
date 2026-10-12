import { credentialStatus, sendgridApiKey } from "../credentials";
import { classifyHttpError, failed } from "../errors";
import type { MailPayload, SendResult } from "../types";

export async function sendViaSendgrid(payload: MailPayload): Promise<SendResult> {
  const status = credentialStatus("sendgrid");
  if (!status.configured) {
    return failed("sendgrid", "missing_credentials", status.missing.join(", "));
  }
  if (!payload.from) {
    return failed("sendgrid", "invalid_config", "Afzender e-mail ontbreekt.");
  }
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }],
        from: {
          email: payload.from,
          ...(payload.fromName ? { name: payload.fromName } : {}),
        },
        ...(payload.replyTo ? { reply_to: { email: payload.replyTo } } : {}),
        subject: payload.subject,
        content: [
          { type: "text/plain", value: payload.text },
          ...(payload.html ? [{ type: "text/html", value: payload.html }] : []),
        ],
      }),
    });
    if (response.ok || response.status === 202) return { ok: true, provider: "sendgrid" };
    const body = await response.text();
    return classifyHttpError("sendgrid", response.status, body);
  } catch {
    return failed("sendgrid", "unreachable", "Provider is niet bereikbaar.");
  }
}
