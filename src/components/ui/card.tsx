import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card — superfície com profundidade (sombra tintada + borda sutil).
 * `interactive` adiciona elevação no hover (para cards clicáveis).
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Profundidade: degradê sutil de cima para baixo + realce na borda superior
      // (luz vindo de cima, como nos painéis de referência) e brilho de marca no hover.
      "relative rounded-2xl border border-border/70 bg-card text-card-foreground shadow-card",
      "bg-[linear-gradient(180deg,color-mix(in_oklch,var(--color-foreground)_3.5%,transparent),transparent_42%)]",
      "transition-[transform,box-shadow,border-color] duration-300 ease-out",
      "hover:border-[color-mix(in_oklch,var(--color-primary)_28%,var(--color-border))]",
      interactive && "cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--sh-elevated),var(--sh-glow)]",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-header" className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("font-display text-base font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

/**
 * Padding simétrico por padrão (conteúdo centralizado no card). Só remove o
 * padding de cima quando vem logo depois de um CardHeader — antes o pt-0 era
 * incondicional e o conteúdo de cards sem header ficava colado na borda.
 */
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn("p-5 sm:p-6 [[data-slot=card-header]+&]:pt-0 sm:[[data-slot=card-header]+&]:pt-0", className)}
      {...props}
    />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-footer" className={cn("flex items-center p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
