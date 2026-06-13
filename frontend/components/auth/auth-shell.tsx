import { AlertTriangle } from 'lucide-react';

import { SavelyLogo } from '@/components/savely-logo';

interface SplitSide {
  title: string;
  subtitle: string;
}

interface AuthShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  split?: SplitSide;
}

export function AuthShell({
  title,
  description,
  children,
  footer,
  split,
}: AuthShellProps) {
  if (split) {
    return (
      <div className="flex h-screen w-screen">
        {/* Left panel */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#0F766E]">
          <div className="flex flex-col gap-1">
            <SavelyLogo className="text-white w-24 h-auto" />
            <span className="text-white font-extrabold text-[64px] leading-tight whitespace-pre-line font-sans">
              {split.subtitle}
            </span>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-1 flex-col items-center justify-center bg-white px-8">
          <div className="w-[296px] flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <h1 className="text-2xl font-semibold text-black">{title}</h1>
              {description && (
                <p className="text-sm text-[#6B7280]">{description}</p>
              )}
            </div>
            <div className="flex flex-col gap-5">{children}</div>
            {footer && (
              <p className="text-center text-sm text-[#6B7280]">{footer}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center">
          <SavelyLogo className="w-20 h-auto" />
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-5 space-y-1.5">
            <h1 className="text-base font-semibold">{title}</h1>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {children}
        </div>
        {footer && (
          <p className="text-center text-xs text-muted-foreground">{footer}</p>
        )}
      </div>
    </div>
  );
}
