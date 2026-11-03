/**
 * @file app-frame.tsx
 * Top-level application layout frame wrapping header, content area, footer, and notice alerts.
 */

import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { AppFooter } from '@/components/layout/app-footer';
import { NoticeBar, useNotice } from '@/components/shared/notice-bar';

export interface AppFrameProps {
  children: ReactNode;
}

export function AppFrame({ children }: AppFrameProps) {
  const { notice } = useNotice();

  return (
    <div className="min-h-[100dvh]">
      <AppHeader />
      <main className="route-enter">{children}</main>
      <AppFooter />
      <NoticeBar notice={notice} />
    </div>
  );
}
