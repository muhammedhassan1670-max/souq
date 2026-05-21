export const CAIRO_TIME_ZONE = 'Africa/Cairo';

const isoWithoutTimeZonePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

const cairoDatePartsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: CAIRO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const cairoDateTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
  timeZone: CAIRO_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function parseAppDate(value?: string | number | Date) {
  if (!value) return null;
  const normalizedValue = typeof value === 'string' && isoWithoutTimeZonePattern.test(value)
    ? `${value}Z`
    : value;
  const date = normalizedValue instanceof Date ? normalizedValue : new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getCairoDateKey(value: string | number | Date = new Date()) {
  const date = parseAppDate(value);
  if (!date) return '';
  const parts = Object.fromEntries(cairoDatePartsFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getCairoYear(value: string | number | Date = new Date()) {
  return Number(getCairoDateKey(value).slice(0, 4));
}

export function isCairoToday(value?: string | number | Date) {
  return Boolean(value && getCairoDateKey(value) === getCairoDateKey());
}

export function formatCairoDateTime(value?: string | number | Date) {
  const date = parseAppDate(value);
  if (!date) return 'غير محدد';
  return cairoDateTimeFormatter.format(date);
}

export function formatCairoRelativeDate(value?: string | number | Date) {
  const date = parseAppDate(value);
  if (!date) return 'لم يحدث';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return formatCairoDateTime(date);

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;

  return formatCairoDateTime(date);
}
