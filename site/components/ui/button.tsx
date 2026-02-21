import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "astra-interactive astra-press inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-extrabold transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-rgb)/0.35)]",
  {
    variants: {
      variant: {
        default:
          "border border-[rgb(var(--accent-rgb)/0.36)] bg-[linear-gradient(135deg,var(--accent),var(--accent2))] text-white shadow-[0_16px_36px_rgb(var(--accent-rgb)/0.28)] hover:shadow-[0_20px_44px_rgb(var(--accent-rgb)/0.34)]",
        ghost: "border border-white/10 bg-white/6 text-white hover:border-white/20 hover:bg-white/10",
        outline: "border border-white/18 bg-transparent text-white hover:border-white/30 hover:bg-white/9"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
