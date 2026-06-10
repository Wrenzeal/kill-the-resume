export function formatWebsiteDisplay(value: string | undefined | null) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";

  return trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/g, "");
}

export function formatWebsiteHref(value: string | undefined | null) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";

  let candidate = trimmed;

  if (/^\/\//.test(candidate)) {
    candidate = `https:${candidate}`;
  } else if (!/^https?:\/\//i.test(candidate)) {
    const schemeSeparatorIndex = candidate.indexOf(":");
    const firstPathSeparatorIndex = candidate.search(/[/?#]/);
    const hasSchemeLikePrefix = schemeSeparatorIndex > 0 && (firstPathSeparatorIndex === -1 || schemeSeparatorIndex < firstPathSeparatorIndex);
    const schemeLikePrefix = hasSchemeLikePrefix ? candidate.slice(0, schemeSeparatorIndex).toLowerCase() : "";

    if (hasSchemeLikePrefix && !schemeLikePrefix.includes(".") && schemeLikePrefix !== "localhost") return "";
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.href;
  } catch {
    return "";
  }
}
