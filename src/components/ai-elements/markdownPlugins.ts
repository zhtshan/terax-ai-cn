import { createMathPlugin } from "@streamdown/math";
import type { MathPlugin } from "@streamdown/math";

// Module-level singleton: Streamdown's memo compares the plugins prop by
// reference, a fresh literal each render would break memoization.
export const streamdownPlugins: { math: MathPlugin } = {
  math: createMathPlugin({ singleDollarTextMath: true }),
};
