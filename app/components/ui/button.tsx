"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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
  /** Show a spinner and block clicks while an async action runs. */
  loading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 focus:ring-ring",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:bg-destructive/80 focus:ring-destructive",
  outline:
    "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-ring",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70 focus:ring-ring",
  ghost:
    "text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-ring",
  link:
    "text-primary underline-offset-4 hover:underline focus:ring-ring",
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
      loading = false,
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

    return (
      <button
        ref={ref}
        className={classes}
        {...props}
        disabled={props.disabled || loading}
      >
        {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />}
        {props.children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
