import type { SendResult } from "./types";

export function failed(
  provider: SendResult extends { provider: infer P } ? P : never,
  code: Extract<SendResult, { ok: false }>["code"],
  message: string,
): Extract<SendResult, { ok: false }> {
  return { ok: false, provider, code, message };
}

export function classifyHttpError(provider: SendResult["provider"], status: number, body: string): Extract<SendResult, { ok: false }> {
  const lower = body.toLowerCase();
  if (status === 401 || status === 403 || lower.includes("unauthorized") || lower.includes("forbidden") || lower.includes("invalid api")) {
    return failed(provider, "auth_failed", "Authenticatie mislukt. Controleer de API-key of credentials.");
  }
  if (
    lower.includes("not verified") ||
    lower.includes("unverified") ||
    lower.includes("from address") ||
    lower.includes("sender") && lower.includes("domain")
  ) {
    return failed(provider, "sender_unverified", "Afzender is niet geverifieerd bij de provider.");
  }
  if (status >= 500 || status === 0) {
    return failed(provider, "unreachable", "Provider is niet bereikbaar.");
  }
  return failed(provider, "unknown", "Mail kon niet worden verstuurd.");
}

export function safeUserMessage(result: Extract<SendResult, { ok: false }>) {
  switch (result.code) {
    case "missing_credentials":
      return `Credentials ontbreken: ${result.message}`;
    case "auth_failed":
      return "Authenticatie mislukt.";
    case "sender_unverified":
      return "Afzender niet geverifieerd.";
    case "unreachable":
      return "Provider niet bereikbaar.";
    case "invalid_config":
      return result.message || "Ongeldige mailconfiguratie.";
    default:
      return "Mail kon niet worden verstuurd.";
  }
}
