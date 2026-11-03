/**
 * @file page-loader.tsx
 * Full-page skeleton loading placeholder for views while queries are fetching.
 */

export function PageLoader() {
  return (
    <div
      className="mx-auto flex min-h-[50vh] max-w-[1000px] flex-col justify-center px-4 py-16 sm:px-6"
      data-testid="state-loading"
    >
      <div className="h-7 w-44 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-4 w-72 animate-pulse rounded bg-muted" />
      <div className="mt-8 h-44 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
