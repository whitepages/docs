const COOKIE_NAME = "wp_docs_consent";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export type ConsentValue = "accepted" | "declined";

export function getConsent(): ConsentValue | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.split("=")[1];
  if (value === "accepted" || value === "declined") return value;
  return null;
}

export function setConsent(value: ConsentValue): void {
  document.cookie = `${COOKIE_NAME}=${value}; path=/docs; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  document.dispatchEvent(new CustomEvent("consentUpdated", { detail: value }));
}
