const DEFAULT_COMPACT_LIMIT = 14;

export function getTeamInitials(name?: string) {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "T";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();

  return words.map((word) => word.charAt(0).toUpperCase()).join("");
}

export function formatTeamName(name?: string, compactLimit = DEFAULT_COMPACT_LIMIT) {
  const trimmed = String(name ?? "").trim();

  if (!trimmed) return "Team";
  if (trimmed.length <= compactLimit) return trimmed;

  return getTeamInitials(trimmed);
}
