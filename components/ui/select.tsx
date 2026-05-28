import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full appearance-none rounded-md border border-cream-200 bg-white px-3 py-2 pr-9 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:border-navy-400",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-cream-100",
            "transition-colors",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-ink-subtle"
          aria-hidden="true"
        />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
