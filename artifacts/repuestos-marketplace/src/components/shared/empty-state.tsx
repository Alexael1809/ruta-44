/**
 * @file empty-state.tsx
 * Reusable empty state view with icon, title, description, and optional CTA action.
 */

import type { ElementType, ReactNode } from 'react';

export interface EmptyStateProps {
  icon: ElementType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center"
      data-testid="state-empty"
    >
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-accent">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-5 font-display text-2xl font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
