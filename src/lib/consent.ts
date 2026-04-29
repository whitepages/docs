const COOKIE_NAME = "wp_docs_consent";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export enum ConsentValue {
  Accepted = "accepted",
  Declined = "declined",
}

export enum ConsentEvent {
  Updated = "consentUpdated",
}

export function getConsent(): ConsentValue | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.split("=")[1];
  if (value === ConsentValue.Accepted || value === ConsentValue.Declined)
    return value;
  return null;
}

export function setConsent(value: ConsentValue): void {
  document.cookie = `${COOKIE_NAME}=${value}; path=/docs; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  document.dispatchEvent(
    new CustomEvent(ConsentEvent.Updated, { detail: value }),
  );
}
