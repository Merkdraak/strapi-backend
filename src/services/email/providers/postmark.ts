import { credentialStatus, postmarkApiKey } from "../credentials";
import { classifyHttpError, failed } from "../errors";
import type { MailPayload, SendResult } from "../types";

export async function sendViaPostmark(payload: MailPayload): Promise<SendResult> {
  const status = credentialStatus("postmark");
  if (!status.configured) {
    return failed("postmark", "missing_credentials", status.missing.join(", "));
  }
  if (!payload.from) {
    return failed("postmark", "invalid_config", "Afzender e-mail ontbreekt.");
  }
  const from = payload.fromName ? `${payload.fromName} <${payload.from}>` : payload.from;
  try {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "X-Postmark-Server-Token": postmarkApiKey(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        From: from,
        To: payload.to,
        Subject: payload.subject,
        TextBody: payload.text,
        HtmlBody: payload.html || undefined,
        ReplyTo: payload.replyTo || undefined,
        MessageStream: "outbound",
      }),
    });
    if (response.ok) return { ok: true, provider: "postmark" };
    const body = await response.text();
    return classifyHttpError("postmark", response.status, body);
  } catch {
    return failed("postmark", "unreachable", "Provider is niet bereikbaar.");
  }
}
