import { credentialStatus, resendApiKey } from "../credentials";
import { classifyHttpError, failed } from "../errors";
import type { MailPayload, SendResult } from "../types";

export async function sendViaResend(payload: MailPayload): Promise<SendResult> {
  const status = credentialStatus("resend");
  if (!status.configured) {
    return failed("resend", "missing_credentials", status.missing.join(", "));
  }
  if (!payload.from) {
    return failed("resend", "invalid_config", "Afzender e-mail ontbreekt.");
  }
  const from = payload.fromName ? `${payload.fromName} <${payload.from}>` : payload.from;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        reply_to: payload.replyTo || undefined,
      }),
    });
    if (response.ok) return { ok: true, provider: "resend" };
    const body = await response.text();
    return classifyHttpError("resend", response.status, body);
  } catch {
    return failed("resend", "unreachable", "Provider is niet bereikbaar.");
  }
}
