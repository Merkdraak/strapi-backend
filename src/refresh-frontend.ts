export async function refreshFrontend(payload?: { slug?: string; siteKey?: string }) {
  const url = process.env.REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) return;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "page", entry: { slug: payload?.slug ?? "", siteKey: payload?.siteKey ?? "" } }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`revalidate ${response.status}`);
  }
}
