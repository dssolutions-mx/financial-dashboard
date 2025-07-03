"use client"

import React, { useState } from "react"
import { Sidebar, DashboardHeader } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  className?: string
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={toggleSidebar}
        className="hidden md:flex"
      />
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with breadcrumbs and controls */}
        <DashboardHeader 
          isCollapsed={isSidebarCollapsed} 
          onToggle={toggleSidebar} 
        />
        
        {/* Content */}
        <main className={cn(
          "flex-1 overflow-auto bg-muted/50 p-6",
          className
        )}>
          {children}
        </main>
      </div>
    </div>
  )
} 