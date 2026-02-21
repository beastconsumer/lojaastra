import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "astra-interactive h-10 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white shadow-sm outline-none transition placeholder:text-white/45 hover:border-white/30 focus:border-red-400/70 focus:ring-2 focus:ring-red-500/30",
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
