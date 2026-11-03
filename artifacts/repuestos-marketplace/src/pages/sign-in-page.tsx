/**
 * Sign-in page rendering Clerk SignIn component with fallback when auth is unavailable.
 */
import { SignIn } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { ArrowRight, Wrench } from 'lucide-react';
import { Link } from 'wouter';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

function Logo({ compact = false }: { compact?: boolean }) {
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

function AuthUnavailable({ kind }: { kind: 'sign-in' | 'sign-up' }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-primary px-4">
      <div className="w-full max-w-md rounded-3xl border border-primary-foreground/10 bg-card p-8 text-center shadow-workshop">
        <Logo compact={false} />
        <h1 className="mt-10 font-display text-3xl font-bold">
          {kind === 'sign-in' ? 'Entra a tu cuenta' : 'Crea tu cuenta'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          La autenticación está preparándose para este entorno. Vuelve al catálogo para continuar explorando.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          data-testid={`link-auth-fallback-${kind}`}
        >
          Volver al catálogo <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function SignInPage() {
  if (!clerkPubKey) return <AuthUnavailable kind="sign-in" />;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-primary px-4 py-10">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}
