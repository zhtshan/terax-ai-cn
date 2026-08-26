import { cleanup, render } from "@testing-library/react";
import { Streamdown } from "streamdown";
import { afterEach, describe, expect, it } from "vitest";
import { streamdownPlugins } from "./markdownPlugins";

afterEach(cleanup);

describe("streamdownPlugins", () => {
  it("enables single dollar inline math per project requirement", async () => {
    // createMathPlugin 默认 singleDollarTextMath=false，必须显式开启
    const remarkArgs = streamdownPlugins.math.remarkPlugin as unknown[];
    const opts = remarkArgs[1] as { singleDollarTextMath?: boolean };
    expect(opts.singleDollarTextMath).toBe(true);
  });

  it("is a stable module-level singleton for streamdown memo", () => {
    expect(streamdownPlugins.math.name).toBe("katex");
    expect(streamdownPlugins.math.type).toBe("math");
  });
});

describe("Streamdown with math plugin", () => {
  it("renders inline $...$ as katex", () => {
    const { container } = render(
      <Streamdown plugins={streamdownPlugins} mode="static">
        {"Euler: $e^{i\\pi} + 1 = 0$"}
      </Streamdown>,
    );
    expect(container.querySelector(".katex")).not.toBeNull();
  });

  it("renders block $$...$$ as katex-display", () => {
    const { container } = render(
      <Streamdown plugins={streamdownPlugins} mode="static">
        {"$$\n\\int_0^1 x^2 dx = \\frac{1}{3}\n$$"}
      </Streamdown>,
    );
    expect(container.querySelector(".katex-display")).not.toBeNull();
  });

  it("renders single-line $$...$$ as inline katex (remark-math text math)", () => {
    const { container } = render(
      <Streamdown plugins={streamdownPlugins} mode="static">
        {"$$\\int_0^1 x^2 dx = \\frac{1}{3}$$"}
      </Streamdown>,
    );
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.querySelector(".katex-display")).toBeNull();
  });

  it("does not render dollar signs inside fenced code", () => {
    const { container } = render(
      <Streamdown plugins={streamdownPlugins} mode="static">
        {"```\nconst price = $100;\n```"}
      </Streamdown>,
    );
    expect(container.querySelector(".katex")).toBeNull();
  });

  it("does not trigger on escaped dollar (price text)", () => {
    const { container } = render(
      <Streamdown plugins={streamdownPlugins} mode="static">
        {"it costs \\$100 and \\$200 total"}
      </Streamdown>,
    );
    expect(container.querySelector(".katex")).toBeNull();
  });
});
