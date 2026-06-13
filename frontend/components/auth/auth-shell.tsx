import { AlertTriangle } from 'lucide-react';

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
            <span className="text-white font-semibold text-[36px] leading-none font-sans">
              Savely
            </span>
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
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <AlertTriangle className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold">Savely</span>
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
