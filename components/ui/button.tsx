import * as React from "react";

import { cn } from "@/lib/utils";

const variantClasses = {
  default: "bg-white text-black hover:opacity-90",
  outline:
    "border border-zinc-800 bg-zinc-900/50 text-white hover:opacity-90",
  ghost: "text-zinc-400 hover:text-white hover:opacity-90",
} as const;

const sizeClasses = {
  default: "h-11 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-12 rounded-md px-8 text-base",
  icon: "size-11",
} as const;

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
};

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-opacity disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

export { Button };
