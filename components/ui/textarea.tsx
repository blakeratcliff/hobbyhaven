import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-cream-200 bg-white px-3 py-2 text-sm",
          "placeholder:text-ink-subtle",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:border-navy-400",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-cream-100",
          "transition-colors resize-y",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
