import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useSpaces } from "@/modules/spaces/lib/useSpaces";
import { useTimelinePath } from "./useTimelinePath";

describe("useTimelinePath", () => {
  beforeEach(() => {
    useSpaces.setState({
      spaces: [],
      activeId: "sp-A",
      hydrated: true,
      initialActiveIndex: {},
    });
  });

  it("starts null and updates via setter within the same space", () => {
    const { result } = renderHook(() => useTimelinePath());
    expect(result.current[0]).toBeNull();

    act(() => result.current[1]("/repo/foo.ts"));
    expect(result.current[0]).toBe("/repo/foo.ts");

    act(() => result.current[1]("/repo/bar.ts"));
    expect(result.current[0]).toBe("/repo/bar.ts");
  });

  it("resets to null when active space changes", () => {
    const { result } = renderHook(() => useTimelinePath());
    act(() => result.current[1]("/repo/foo.ts"));
    expect(result.current[0]).toBe("/repo/foo.ts");

    // Drive the store directly to avoid the persistence side-effect in
    // useSpaces.setActive; the hook subscribes to activeId either way.
    act(() => useSpaces.setState({ activeId: "sp-B" }));

    expect(result.current[0]).toBeNull();
  });

  it("does not reset on initial mount even if activeId is set", () => {
    const { result } = renderHook(() => useTimelinePath());
    act(() => result.current[1]("/repo/foo.ts"));
    expect(result.current[0]).toBe("/repo/foo.ts");

    // No setActive call — value must be retained.
    expect(result.current[0]).toBe("/repo/foo.ts");
  });
});
