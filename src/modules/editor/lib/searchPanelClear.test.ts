// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import {
  augmentSearchField,
  handleClear,
  syncClearVisibility,
} from "./searchPanelClear";

function makeField(value: string): HTMLInputElement {
  const field = document.createElement("input");
  field.className = "cm-textfield";
  field.name = "search";
  field.value = value;
  document.body.appendChild(field);
  return field;
}

describe("augmentSearchField", () => {
  it("包裹输入框并注入清空按钮", () => {
    const field = makeField("foo");
    const button = augmentSearchField(field, "清空查找");
    const wrap = field.parentElement;
    expect(wrap?.classList.contains("cm-clear-wrap")).toBe(true);
    expect(button.classList.contains("cm-clear-btn")).toBe(true);
    expect(button.getAttribute("aria-label")).toBe("清空查找");
    expect(wrap?.contains(button)).toBe(true);
  });

  it("重复增强不二次注入", () => {
    const field = makeField("foo");
    const first = augmentSearchField(field, "清空查找");
    const again = augmentSearchField(field, "清空查找");
    expect(field.parentElement?.querySelectorAll(".cm-clear-btn")).toHaveLength(
      1,
    );
    expect(again).toBe(first);
  });

  it("有内容时按钮可见，空值时隐藏", () => {
    const field = makeField("foo");
    const button = augmentSearchField(field, "清空查找");
    expect(button.hidden).toBe(false);
    field.value = "";
    field.dispatchEvent(new Event("input"));
    expect(button.hidden).toBe(true);
    field.value = "bar";
    field.dispatchEvent(new Event("input"));
    expect(button.hidden).toBe(false);
  });
});

describe("handleClear", () => {
  it("清空值、派发 change 并保持焦点", () => {
    const field = makeField("foo");
    field.focus();
    const spy = vi.fn();
    field.addEventListener("change", spy);
    handleClear(field);
    expect(field.value).toBe("");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(field);
  });
});

describe("syncClearVisibility", () => {
  it("按值切换 hidden", () => {
    const field = makeField("");
    const button = document.createElement("button");
    syncClearVisibility(field, button);
    expect(button.hidden).toBe(true);
    field.value = "x";
    syncClearVisibility(field, button);
    expect(button.hidden).toBe(false);
  });
});
