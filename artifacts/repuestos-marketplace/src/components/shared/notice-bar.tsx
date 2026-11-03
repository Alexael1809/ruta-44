/**
 * @file notice-bar.tsx
 * Floating notification alert component and state management hook.
 */

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export type Notice = {
  tone: 'success' | 'error' | 'info';
  text: string;
};

export interface NoticeBarProps {
  notice: Notice | null;
  onDismiss?: () => void;
}

export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);

  const notify = (next: Notice) => {
    setNotice(next);
    window.setTimeout(() => setNotice(null), 3500);
  };

  return { notice, notify };
}

export function NoticeBar({ notice, onDismiss }: NoticeBarProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => setDismissed(false), [notice]);

  if (!notice || dismissed) return null;

  return (
    <div
      className={`fixed right-4 top-20 z-[70] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-workshop ${
        notice.tone === 'success'
          ? 'border-[#b8dccd] bg-[#e8f4ef] text-[#256b55]'
          : notice.tone === 'error'
            ? 'border-[#e8bdb3] bg-[#fae9e5] text-[#a94535]'
            : 'border-[#e5d394] bg-[#fff5d8] text-[#73540c]'
      }`}
      data-testid="status-notice"
    >
      {notice.tone === 'success' ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{notice.text}</span>
      <button
        type="button"
        className="ml-1 opacity-60 hover:opacity-100"
        onClick={() => {
          setDismissed(true);
          onDismiss?.();
        }}
        aria-label="Cerrar mensaje"
        data-testid="button-dismiss-notice"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
