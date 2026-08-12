const CONNECTION_URI =
  /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|redis):\/\/[^\s"'<>]+/gi;
const BEARER_TOKEN = /\bBearer\s+[^\s,"']+/gi;
const NAMED_SECRET =
  /\b(password|passwd|secret|token|authorization|cookie|api[_-]?key)\b(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi;

/** Removes credentials from operational logs without changing client errors. */
export const redactSensitive = (value: unknown): string =>
  String(value)
    .replace(CONNECTION_URI, "[REDACTED_CONNECTION_URI]")
    .replace(BEARER_TOKEN, "Bearer [REDACTED]")
    .replace(NAMED_SECRET, (_match, name: string, separator: string) =>
      `${name}${separator}[REDACTED]`
    );
