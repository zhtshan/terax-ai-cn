import { useEffect, useRef, useState } from "react";

import { useSpaces } from "@/modules/spaces/lib/useSpaces";

// TimelineSection accepts an explicit file path override (timelineFilePath)
// that takes precedence over the active editor file. The override is set by a
// right-click in the file tree and is only meaningful within the active
// space's authorized root. Reusing it after switching spaces would either
// keep stale commits visible or trigger PathOutsideWorkspace on reload,
// so we clear it whenever activeSpaceId transitions.
export function useTimelinePath() {
  const [path, setPath] = useState<string | null>(null);
  const activeSpaceId = useSpaces((s) => s.activeId);
  const prevSpaceIdRef = useRef<string | null>(activeSpaceId);

  useEffect(() => {
    if (prevSpaceIdRef.current === activeSpaceId) return;
    prevSpaceIdRef.current = activeSpaceId;
    setPath(null);
  }, [activeSpaceId]);

  return [path, setPath] as const;
}
