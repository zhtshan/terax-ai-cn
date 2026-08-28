import { describe, expect, it } from "vitest";
import { pendingExternalAdoption } from "./externalAdoption";

describe("pendingExternalAdoption", () => {
  it("returns null when the view already matches the doc content", () => {
    expect(pendingExternalAdoption("hello", "hello")).toBeNull();
    expect(pendingExternalAdoption("", "")).toBeNull();
  });

  it("returns the doc content when the view has drifted", () => {
    // #988: git discard reverts disk to the previously loaded snapshot, so
    // the value prop never changes while the live view has drifted ahead.
    expect(pendingExternalAdoption("snapshot", "snapshot\n// typed")).toBe(
      "snapshot",
    );
  });

  it("returns the doc content when the view is empty", () => {
    expect(pendingExternalAdoption("content", "")).toBe("content");
  });
});
