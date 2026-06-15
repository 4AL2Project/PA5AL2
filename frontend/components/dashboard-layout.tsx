'use client';

import { AppSidebar } from '@/components/app-sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  userEmail?: string;
}

export function DashboardLayout({
  children,
  title,
  description,
  actions,
  userEmail,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-svh bg-background">
      <AppSidebar userEmail={userEmail} />
      <div className="flex flex-1 flex-col overflow-auto">
        <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">{title}</h1>
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
