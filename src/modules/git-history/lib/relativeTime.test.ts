import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relativeTime";

describe("formatRelativeTime", () => {
  const NOW = 1_700_000_000; // 2023-11-14T22:13:20Z
  const secs = (delta: number) => NOW - delta;

  it("returns 刚刚 within 60 seconds", () => {
    expect(formatRelativeTime(secs(10), NOW)).toBe("刚刚");
    expect(formatRelativeTime(secs(59), NOW)).toBe("刚刚");
  });

  it("returns N分钟前 under 1 hour", () => {
    expect(formatRelativeTime(secs(60), NOW)).toBe("1分钟前");
    expect(formatRelativeTime(secs(60 * 30), NOW)).toBe("30分钟前");
    expect(formatRelativeTime(secs(60 * 59 + 59), NOW)).toBe("59分钟前");
  });

  it("returns N小时前 under 24 hours", () => {
    expect(formatRelativeTime(secs(60 * 60), NOW)).toBe("1小时前");
    expect(formatRelativeTime(secs(60 * 60 * 5), NOW)).toBe("5小时前");
  });

  it("returns N天前 under 7 days", () => {
    expect(formatRelativeTime(secs(60 * 60 * 24), NOW)).toBe("1天前");
    expect(formatRelativeTime(secs(60 * 60 * 24 * 6 + 3599), NOW)).toBe("6天前");
  });

  it("returns M月D日 within same year", () => {
    // 30 天前但仍在 2023 年（NOW = 2023-11-14）
    const ts = secs(60 * 60 * 24 * 30);
    expect(formatRelativeTime(ts, NOW)).toBe("10月15日");
  });

  it("returns YYYY年M月D日 for older than current year", () => {
    // 假设 NOW 是 2023，2022 年同一天
    const ts = secs(60 * 60 * 24 * 365);
    expect(formatRelativeTime(ts, NOW)).toMatch(/^2022年\d{1,2}月\d{1,2}日$/);
  });

  it("accepts missing now and falls back to Date.now()", () => {
    const before = Math.floor(Date.now() / 1000) - 5;
    expect(formatRelativeTime(before)).toBe("刚刚");
  });
});