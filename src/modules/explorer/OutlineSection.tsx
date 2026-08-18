import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OutlineItem, OutlineUnavailableReason } from "@/modules/editor";
import {
  ChevronRightIcon,
  CollapseIcon,
  ExpandIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { iconForSymbolKind } from "./lib/symbolKindIcons";
import { SectionHeader } from "./SectionHeader";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  items: OutlineItem[] | null;
  unavailableReason?: OutlineUnavailableReason | null;
  loading?: boolean;
  activeLine: number | null;
  onJump: (line: number) => void;
};

type OutlineNode = OutlineItem & { key: string; children: OutlineNode[] };

function buildOutlineTree(items: OutlineItem[]): OutlineNode[] {
  const roots: OutlineNode[] = [];
  const stack: OutlineNode[] = [];
  items.forEach((item, index) => {
    const node: OutlineNode = {
      ...item,
      key: `${item.line}-${index}`,
      children: [],
    };
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack.push(node);
  });
  return roots;
}

function collectParentKeys(nodes: OutlineNode[], out: Set<string>) {
  for (const node of nodes) {
    if (node.children.length > 0) {
      out.add(node.key);
      collectParentKeys(node.children, out);
    }
  }
}

export function OutlineSection({
  collapsed,
  onToggle,
  items,
  unavailableReason,
  loading = false,
  activeLine,
  onJump,
}: Props) {
  const { t } = useTranslation();

  const tree = useMemo(() => (items ? buildOutlineTree(items) : []), [items]);
  const parentKeys = useMemo(() => {
    const out = new Set<string>();
    collectParentKeys(tree, out);
    return out;
  }, [tree]);

  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(
    () => new Set(),
  );

  // Reset to fully expanded whenever the outline is recomputed (new file,
  // new symbols) rather than persisting stale keys across documents.
  useEffect(() => {
    setCollapsedKeys(new Set());
  }, [items]);

  const allCollapsed =
    parentKeys.size > 0 &&
    Array.from(parentKeys).every((key) => collapsedKeys.has(key));

  const toggleNode = (key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setCollapsedKeys(allCollapsed ? new Set() : new Set(parentKeys));
  };

  const emptyText =
    items !== null
      ? t("explorer.outlineEmpty")
      : unavailableReason === "request-failed"
        ? t("explorer.outlineRequestFailed")
        : unavailableReason === "unsupported-language"
          ? t("explorer.outlineUnsupported")
          : null;

  const renderNode = (node: OutlineNode): ReactNode => {
    const icon = iconForSymbolKind(node.kind);
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsedKeys.has(node.key);
    return (
      <Fragment key={node.key}>
        <div
          className={cn(
            "flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[12px] transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            node.line === activeLine
              ? "bg-accent font-medium text-accent-foreground"
              : "text-foreground/80",
          )}
          style={{ paddingLeft: `${(node.level - 1) * 12 + 4}px` }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleNode(node.key);
            }}
            tabIndex={hasChildren ? 0 : -1}
            className="flex size-4 shrink-0 items-center justify-center"
          >
            {hasChildren ? (
              <HugeiconsIcon
                icon={ChevronRightIcon}
                size={12}
                strokeWidth={2}
                className={cn(
                  "shrink-0 transition-transform duration-150",
                  !isCollapsed && "rotate-90",
                )}
              />
            ) : (
              <span className="block size-1 shrink-0 rounded-full bg-muted-foreground/50" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onJump(node.line)}
            className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left"
          >
            {icon && (
              <HugeiconsIcon
                icon={icon}
                size={12}
                strokeWidth={2}
                className="shrink-0 text-muted-foreground"
              />
            )}
            <span className="truncate">{node.text}</span>
          </button>
        </div>
        {hasChildren &&
          !isCollapsed &&
          node.children.map((child) => renderNode(child))}
      </Fragment>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <SectionHeader
        title={t("explorer.outline")}
        collapsed={collapsed}
        onToggle={onToggle}
        actions={
          parentKeys.size > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              onClick={toggleAll}
              title={
                allCollapsed
                  ? t("explorer.outlineExpandAll")
                  : t("explorer.outlineCollapseAll")
              }
              aria-label={
                allCollapsed
                  ? t("explorer.outlineExpandAll")
                  : t("explorer.outlineCollapseAll")
              }
            >
              <HugeiconsIcon
                icon={allCollapsed ? ExpandIcon : CollapseIcon}
                size={13}
                strokeWidth={2}
              />
            </Button>
          ) : undefined
        }
      />
      {!collapsed &&
        (items === null || items.length === 0) &&
        (loading || emptyText) && (
          <div className="flex flex-1 items-center justify-center px-3 py-2 text-center text-[11px] text-muted-foreground">
            {loading ? t("explorer.outlineLoading") : emptyText}
          </div>
        )}
      {!collapsed && items !== null && items.length > 0 && (
        <div className="flex-1 overflow-y-auto px-1 py-1">
          {tree.map((node) => renderNode(node))}
        </div>
      )}
    </div>
  );
}
