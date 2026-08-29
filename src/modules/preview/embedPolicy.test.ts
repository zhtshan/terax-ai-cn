import { describe, expect, it } from "vitest";
import { embedBlockedByHeaders, isLocalUrl } from "./embedPolicy";

describe("isLocalUrl", () => {
  it("accepts localhost/127.0.0.1/[::1]/.localhost forms", () => {
    expect(isLocalUrl("http://localhost:3000")).toBe(true);
    expect(isLocalUrl("http://127.0.0.1:5173")).toBe(true);
    expect(isLocalUrl("http://[::1]:3000")).toBe(true);
    expect(isLocalUrl("http://app.localhost:3000")).toBe(true);
  });

  it("rejects public hosts and garbage", () => {
    expect(isLocalUrl("https://example.com")).toBe(false);
    expect(isLocalUrl("not a url")).toBe(false);
  });
});

describe("embedBlockedByHeaders (#807)", () => {
  it("blocks on X-Frame-Options DENY", () => {
    expect(embedBlockedByHeaders({ "X-Frame-Options": "DENY" })).toBe(true);
  });

  it("blocks on X-Frame-Options SAMEORIGIN (webview origin differs)", () => {
    expect(embedBlockedByHeaders({ "x-frame-options": "SAMEORIGIN" })).toBe(true);
  });

  it("blocks on CSP frame-ancestors 'none'", () => {
    expect(
      embedBlockedByHeaders({
        "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'",
      }),
    ).toBe(true);
  });

  it("allows when frame-ancestors has a wildcard", () => {
    expect(
      embedBlockedByHeaders({ "content-security-policy": "frame-ancestors *" }),
    ).toBe(false);
  });

  it("passes through X-Frame-Options ALLOWALL (invalid per spec, browsers ignore it)", () => {
    expect(embedBlockedByHeaders({ "x-frame-options": "ALLOWALL" })).toBe(
      false,
    );
  });

  it("blocks an explicit frame-ancestors list without wildcard", () => {
    expect(
      embedBlockedByHeaders({
        "content-security-policy": "frame-ancestors 'self' https://example.com",
      }),
    ).toBe(true);
  });

  it("allows when neither header is present", () => {
    expect(embedBlockedByHeaders({ "content-type": "text/html" })).toBe(false);
  });
});
