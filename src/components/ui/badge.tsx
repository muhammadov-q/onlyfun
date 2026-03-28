import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-orange-200 bg-orange-50 text-orange-600",
        secondary:
          "border-gray-200 bg-gray-100 text-gray-600",
        destructive:
          "border-red-200 bg-red-50 text-red-600",
        outline:
          "border-gray-300 text-gray-600",
        success:
          "border-green-200 bg-green-50 text-green-600",
        coming:
          "border-purple-200 bg-purple-50 text-purple-600",
        new:
          "border-blue-200 bg-blue-50 text-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
