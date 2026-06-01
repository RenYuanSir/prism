export function formatTime(
  dateStr: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t("prList.timeJustNow");
  if (diffMin < 60) return t("prList.timeMinutes", { n: diffMin });
  if (diffHr < 24) return t("prList.timeHours", { n: diffHr });
  if (diffDay < 7) return t("prList.timeDays", { n: diffDay });
  return date.toLocaleDateString();
}
