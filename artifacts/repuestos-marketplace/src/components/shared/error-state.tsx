/**
 * @file error-state.tsx
 * Error state display component with friendly copy and retry button.
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ErrorStateProps {
  retry: () => void;
}

export function ErrorState({ retry }: ErrorStateProps) {
  return (
    <div
      className="rounded-2xl border border-[#e8bdb3] bg-[#fae9e5] p-10 text-center"
      data-testid="state-error"
    >
      <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
      <h3 className="mt-3 font-display text-xl font-bold text-[#71372e]">Algo no cargó bien</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#8c554a]">
        Revisa tu conexión y vuelve a intentarlo. No se ha perdido nada.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-5 border-[#d99c90] text-[#71372e]"
        onClick={retry}
        data-testid="button-retry"
      >
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}
