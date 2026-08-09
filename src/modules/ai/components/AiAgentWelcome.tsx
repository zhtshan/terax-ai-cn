import { AiContentGenerator02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";

export function AiAgentWelcome({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-emerald-500/10">
        <HugeiconsIcon
          icon={AiContentGenerator02Icon}
          size={28}
          strokeWidth={1.5}
          className="text-emerald-500"
        />
      </div>
      <div>
        <div className="text-[15px] font-semibold tracking-tight text-foreground">
          Agent
        </div>
        <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {t("ai.agentView.description")}
        </div>
      </div>
      <ul className="flex w-full flex-col gap-2 text-[11.5px] text-muted-foreground">
        {(t("ai.agentView.features", { returnObjects: true }) as string[])
          .slice(0, 3)
          .map((text: string) => (
            <li key={text} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-emerald-500">
                <HugeiconsIcon
                  icon={AiContentGenerator02Icon}
                  size={10}
                  strokeWidth={2.5}
                />
              </span>
              <span className="leading-relaxed">{text}</span>
            </li>
          ))}
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 rounded-md border border-border/60 bg-card px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {t("ai.agentView.switchToChat")}
      </button>
    </div>
  );
}
