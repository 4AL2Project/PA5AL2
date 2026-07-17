import { AssoSidebar } from '@/components/asso-sidebar';

interface AssoLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}

export function AssoLayout({
  children,
  title,
  description,
  actions,
  breadcrumb,
}: AssoLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <AssoSidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-8">
          {breadcrumb && <div className="mb-4">{breadcrumb}</div>}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">{actions}</div>
            )}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
