const SECONDS_IN_MIN = 60;
const SECONDS_IN_HOUR = 60 * 60;
const SECONDS_IN_DAY = 60 * 60 * 24;
const DAYS_THRESHOLD = 7;

export function formatRelativeTime(unixSecs: number, now?: number): string {
  const reference = now ?? Math.floor(Date.now() / 1000);
  const delta = reference - unixSecs;
  if (delta < SECONDS_IN_MIN) {
    return "刚刚";
  }
  if (delta < SECONDS_IN_HOUR) {
    return `${Math.floor(delta / SECONDS_IN_MIN)}分钟前`;
  }
  if (delta < SECONDS_IN_DAY) {
    return `${Math.floor(delta / SECONDS_IN_HOUR)}小时前`;
  }
  if (delta < SECONDS_IN_DAY * DAYS_THRESHOLD) {
    return `${Math.floor(delta / SECONDS_IN_DAY)}天前`;
  }
  const date = new Date(unixSecs * 1000);
  const refDate = new Date(reference * 1000);
  const sameYear = date.getUTCFullYear() === refDate.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if (sameYear) {
    return `${month}月${day}日`;
  }
  return `${date.getUTCFullYear()}年${month}月${day}日`;
}