/**
 * @file logo.tsx
 * Brand logo component with link to home and optional compact mode.
 */

import { Link } from 'wouter';
import { Wrench } from 'lucide-react';

export interface LogoProps {
  compact?: boolean;
}

export function Logo({ compact = false }: LogoProps) {
  return (
    <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary shadow-sm">
        <Wrench className="h-5 w-5" strokeWidth={2.6} />
      </span>
      {!compact && (
        <span className="font-display text-[1.15rem] font-bold tracking-[-.03em] text-sidebar-foreground">
          RUTA <span className="text-secondary">44</span>
        </span>
      )}
    </Link>
  );
}
