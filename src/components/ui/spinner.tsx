import { cn } from "@/lib/utils";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import i18n from "@/i18n";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <HugeiconsIcon
      icon={Loading03Icon}
      // @ts-ignore
      strokeWidth={2}
      role="status"
      aria-label={i18n.t("common.loading")}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
