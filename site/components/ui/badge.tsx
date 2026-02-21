import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide transition",
  {
    variants: {
      variant: {
        default: "border-red-400/40 bg-red-500/15 text-red-100",
        muted: "border-white/20 bg-white/6 text-white/75",
        good: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
        warn: "border-amber-400/35 bg-amber-500/15 text-amber-100",
        bad: "border-rose-400/35 bg-rose-500/15 text-rose-100"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
