export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.trenzone.fit";
  return raw.trim().replace(/\/+$/, "");
}

export function getResendFromEmail(senderName: string = "TrenZone"): string {
  const configured = (process.env.RESEND_FROM_EMAIL || "").trim();
  if (configured) {
    if (configured.includes("<") && configured.includes(">")) {
      return configured;
    }
    return `${senderName} <${configured}>`;
  }
  return `${senderName} <contact@trenzone.fit>`;
}

