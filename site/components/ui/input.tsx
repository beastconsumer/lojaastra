import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "astra-interactive h-10 w-full rounded-xl border border-white/14 bg-[rgba(0,0,0,0.2)] px-3 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-white/45 hover:border-white/28 focus:border-[rgb(var(--accent-rgb)/0.5)] focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.24)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
