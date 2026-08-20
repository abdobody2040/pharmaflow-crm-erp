export type DateLike = Date | string | number | null | undefined;

function activeLocale() {
  if (typeof document === "undefined") return "en-US";
  return document.documentElement.lang === "ar" ? "ar-EG" : "en-US";
}

function asDate(value: DateLike) {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  value: DateLike,
  options: Intl.DateTimeFormatOptions = {}
) {
  const date = asDate(value);
  return date
    ? new Intl.DateTimeFormat(activeLocale(), {
        dateStyle: "medium",
        ...options,
      }).format(date)
    : "—";
}

export function formatDateTime(
  value: DateLike,
  options: Intl.DateTimeFormatOptions = {}
) {
  const date = asDate(value);
  return date
    ? new Intl.DateTimeFormat(activeLocale(), {
        dateStyle: "medium",
        timeStyle: "short",
        ...options,
      }).format(date)
    : "—";
}

export function formatTime(
  value: DateLike,
  options: Intl.DateTimeFormatOptions = {}
) {
  const date = asDate(value);
  return date
    ? new Intl.DateTimeFormat(activeLocale(), {
        hour: "2-digit",
        minute: "2-digit",
        ...options,
      }).format(date)
    : "—";
}

export function formatNumber(
  value: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {}
) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat(activeLocale(), {
        maximumFractionDigits: 2,
        ...options,
      }).format(numeric)
    : "—";
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency = "USD"
) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat(activeLocale(), {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(numeric)
    : "—";
}
