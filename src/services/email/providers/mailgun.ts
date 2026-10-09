import { credentialStatus, mailgunConfig } from "../credentials";
import { classifyHttpError, failed } from "../errors";
import type { MailPayload, SendResult } from "../types";

export async function sendViaMailgun(payload: MailPayload): Promise<SendResult> {
  const status = credentialStatus("mailgun");
  if (!status.configured) {
    return failed("mailgun", "missing_credentials", status.missing.join(", "));
  }
  if (!payload.from) {
    return failed("mailgun", "invalid_config", "Afzender e-mail ontbreekt.");
  }
  const config = mailgunConfig();
  const from = payload.fromName ? `${payload.fromName} <${payload.from}>` : payload.from;
  const form = new URLSearchParams();
  form.set("from", from);
  form.set("to", payload.to);
  form.set("subject", payload.subject);
  form.set("text", payload.text);
  if (payload.html) form.set("html", payload.html);
  if (payload.replyTo) form.set("h:Reply-To", payload.replyTo);
  const auth = Buffer.from(`api:${config.apiKey}`).toString("base64");
  try {
    const response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/v3/${config.domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    if (response.ok) return { ok: true, provider: "mailgun" };
    const body = await response.text();
    return classifyHttpError("mailgun", response.status, body);
  } catch {
    return failed("mailgun", "unreachable", "Provider is niet bereikbaar.");
  }
}
