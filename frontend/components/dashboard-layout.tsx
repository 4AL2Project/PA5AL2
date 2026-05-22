'use client'

import { PanelLeft } from 'lucide-react'

import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
  actions?: React.ReactNode
}

function DashboardHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  const { open, toggleSidebar } = useSidebar()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/50 px-6">
      {!open && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="-ml-1 h-8 w-8"
        >
          <PanelLeft className="h-4 w-4" />
          <span className="sr-only">Ouvrir la barre laterale</span>
        </Button>
      )}
      <div className="flex flex-1 items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

export function DashboardLayout({ children, title, description, actions }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader title={title} description={description} actions={actions} />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
