"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/app/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
  href?: string;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
  ghost:
    "text-slate-700 hover:bg-slate-100 focus:ring-slate-500 dark:text-slate-200 dark:hover:bg-slate-800",
  link:
    "text-indigo-600 underline-offset-4 hover:underline focus:ring-indigo-500",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3 text-xs",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild,
      href,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    const classes = cn(
      base,
      variantClasses[variant],
      sizeClasses[size],
      className
    );

    if (href) {
      return (
        <Link href={href} className={classes}>
          {props.children}
        </Link>
      );
    }

    if (asChild) {
      const child = props.children;
      if (React.isValidElement(child)) {
        const childElement = child as React.ReactElement<{
          className?: string;
        }>;
        const { children, ...rest } = props;
        return React.cloneElement(childElement, {
          className: cn(classes, childElement.props.className),
          ...rest,
        });
      }
    }

    return <button ref={ref} className={classes} {...props} />;
  }
);
Button.displayName = "Button";

export { Button };
