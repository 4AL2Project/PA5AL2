'use client'

import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
}

function DashboardHeader({ title, description }: { title: string; description?: string }) {
  const { open, toggleSidebar } = useSidebar()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 px-4">
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
      <div className="flex flex-col">
        <h1 className="text-sm font-semibold">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </header>
  )
}

export function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader title={title} description={description} />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
