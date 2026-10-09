import { createHash, createHmac } from "crypto";
import { credentialStatus, sesConfig } from "../credentials";
import { classifyHttpError, failed } from "../errors";
import type { MailPayload, SendResult } from "../types";

function hmac(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256(data: string) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function amzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function signRequest(params: {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  body: string;
}) {
  const service = "ses";
  const host = `email.${params.region}.amazonaws.com`;
  const now = new Date();
  const amz = amzDate(now);
  const dateStamp = amz.slice(0, 8);
  const canonicalHeaders = `content-type:application/x-www-form-urlencoded\nhost:${host}\nx-amz-date:${amz}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    sha256(params.body),
  ].join("\n");
  const credentialScope = `${dateStamp}/${params.region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amz, credentialScope, sha256(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${params.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, params.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");
  return {
    url: `https://${host}/`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Amz-Date": amz,
      Authorization: `AWS4-HMAC-SHA256 Credential=${params.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

export async function sendViaSes(payload: MailPayload): Promise<SendResult> {
  const status = credentialStatus("ses");
  if (!status.configured) {
    return failed("ses", "missing_credentials", status.missing.join(", "));
  }
  if (!payload.from) {
    return failed("ses", "invalid_config", "Afzender e-mail ontbreekt.");
  }
  const config = sesConfig();
  const body = new URLSearchParams({
    Action: "SendEmail",
    Version: "2010-12-01",
    "Source": payload.fromName ? `${payload.fromName} <${payload.from}>` : payload.from,
    "Destination.ToAddresses.member.1": payload.to,
    "Message.Subject.Data": payload.subject,
    "Message.Subject.Charset": "UTF-8",
    "Message.Body.Text.Data": payload.text,
    "Message.Body.Text.Charset": "UTF-8",
  });
  if (payload.html) {
    body.set("Message.Body.Html.Data", payload.html);
    body.set("Message.Body.Html.Charset", "UTF-8");
  }
  if (payload.replyTo) {
    body.set("ReplyToAddresses.member.1", payload.replyTo);
  }
  const encoded = body.toString();
  try {
    const signed = signRequest({
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      body: encoded,
    });
    const response = await fetch(signed.url, {
      method: "POST",
      headers: signed.headers,
      body: encoded,
    });
    if (response.ok) return { ok: true, provider: "ses" };
    const text = await response.text();
    if (text.toLowerCase().includes("email address is not verified") || text.toLowerCase().includes("not verified")) {
      return failed("ses", "sender_unverified", "Afzender is niet geverifieerd bij Amazon SES.");
    }
    return classifyHttpError("ses", response.status, text);
  } catch {
    return failed("ses", "unreachable", "Provider is niet bereikbaar.");
  }
}
