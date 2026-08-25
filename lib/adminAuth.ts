export async function getAdminCookieValue(secret: string) {
  const bytes = new TextEncoder().encode(`balance-bingo-admin:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
