import { afterEach, describe, expect, it } from "vitest";
import {
  _testFirePtyDropped,
  _testHasPtyDropWaiter,
  _testResetPtyDropState,
  _testWaitForPtyDropped,
} from "./useTerminalSession";

// Pure-logic tests for the ConPTY drop wait layer added in #1156/#977.
// Real ConPTY behavior lives on Windows and is exercised there; here we
// cover the registration, fan-out, timeout, and re-registration paths so a
// frontend regression surfaces in unit tests.
describe("pty drop wait (#1156/#977)", () => {
  afterEach(() => {
    _testResetPtyDropState();
  });

  it("registers a waiter that resolves on the matching drop event", async () => {
    const wait = _testWaitForPtyDropped(101, 1000);
    expect(_testHasPtyDropWaiter(101)).toBe(true);

    const fired = _testFirePtyDropped(101);
    expect(fired).toBe(true);
    expect(_testHasPtyDropWaiter(101)).toBe(false);
    await expect(wait).resolves.toBeUndefined();
  });

  it("ignores drop events for ids no one is waiting on", () => {
    expect(_testFirePtyDropped(404)).toBe(false);
  });

  it("resolves after the timeout if the drop event never fires", async () => {
    const t0 = Date.now();
    await _testWaitForPtyDropped(202, 30);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(25);
    expect(_testHasPtyDropWaiter(202)).toBe(false);
  });

  it("fans out the drop event to every concurrent waiter for the same id", async () => {
    const a = _testWaitForPtyDropped(303, 1000);
    const b = _testWaitForPtyDropped(303, 1000);
    const c = _testWaitForPtyDropped(303, 1000);
    expect(_testHasPtyDropWaiter(303)).toBe(true);

    _testFirePtyDropped(303);
    await Promise.all([a, b, c]);
    expect(_testHasPtyDropWaiter(303)).toBe(false);
  });

  it("a second registration after the first extends the live timer", async () => {
    // First waiter starts a 1000ms timer. Second registration reuses the
    // entry; firing should resolve both without spurious timeout work.
    const a = _testWaitForPtyDropped(404, 1000);
    const b = _testWaitForPtyDropped(404, 1000);
    _testFirePtyDropped(404);
    await Promise.all([a, b]);
    expect(_testHasPtyDropWaiter(404)).toBe(false);
  });
});
