const CLEAR_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="m4 4 8 8m0-8-8 8"/></svg>';

export function syncClearVisibility(
  field: HTMLInputElement,
  button: HTMLButtonElement,
): void {
  button.hidden = field.value.length === 0;
}

// 置空后派发 change，让 CM 面板自带 commit() 重建空查询并派发 setSearchQuery
export function handleClear(field: HTMLInputElement): void {
  field.value = "";
  field.dispatchEvent(new Event("change"));
  field.focus();
}

export function augmentSearchField(
  field: HTMLInputElement,
  label: string,
): HTMLButtonElement {
  const parent = field.parentElement;
  if (parent?.classList.contains("cm-clear-wrap")) {
    const existing = parent.querySelector<HTMLButtonElement>(".cm-clear-btn");
    if (existing) return existing;
  }

  const wrap = document.createElement("span");
  wrap.className = "cm-clear-wrap";
  field.replaceWith(wrap);
  wrap.appendChild(field);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "cm-clear-btn";
  button.setAttribute("aria-label", label);
  button.innerHTML = CLEAR_ICON;
  wrap.appendChild(button);

  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", () => handleClear(field));
  field.addEventListener("input", () => syncClearVisibility(field, button));
  field.addEventListener("change", () => syncClearVisibility(field, button));
  syncClearVisibility(field, button);
  return button;
}
