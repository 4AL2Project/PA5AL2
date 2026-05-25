import { AlertTriangle } from 'lucide-react';

interface AuthShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
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
