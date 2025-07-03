"use client"

import React, { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  BarChart3, 
  TrendingUp, 
  Calculator, 
  Database, 
  FileText, 
  Settings, 
  Menu, 
  X,
  ChevronDown,
  ChevronRight,
  PieChart,
  LineChart,
  DollarSign,
  Target,
  AlertTriangle
} from "lucide-react"

export interface NavigationItem {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  active?: boolean
  badge?: string | number
}

export interface NavigationSection {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  items: NavigationItem[]
}

interface SidebarProps {
  isCollapsed?: boolean
  onToggle?: () => void
  className?: string
}

// Navigation configuration
const navigationSections: NavigationSection[] = [
  {
    id: "dashboard",
    icon: BarChart3,
    label: "Panel Principal",
    items: [
      {
        id: "current-period",
        icon: Calculator,
        label: "Período Actual",
        href: "/dashboard",
      },
      {
        id: "quick-analysis",
        icon: TrendingUp,
        label: "Análisis Rápido",
        href: "/dashboard/analysis",
      }
    ]
  },
  {
    id: "analytics",
    icon: LineChart,
    label: "Análisis e Historial",
    items: [
      {
        id: "historical-trends",
        icon: TrendingUp,
        label: "Tendencias Históricas",
        href: "/analytics/trends",
      },
      {
        id: "kpis",
        icon: Target,
        label: "KPIs y Métricas",
        href: "/analytics/kpis",
      },
      {
        id: "comparative",
        icon: PieChart,
        label: "Análisis Comparativo",
        href: "/analytics/comparative",
      },
      {
        id: "projections",
        icon: TrendingUp,
        label: "Proyecciones",
        href: "/analytics/projections",
      },
      {
        id: "pain-points",
        icon: AlertTriangle,
        label: "Puntos Críticos",
        href: "/analytics/pain-points",
      }
    ]
  },
  {
    id: "reports",
    icon: FileText,
    label: "Reportes",
    items: [
      {
        id: "upload-data",
        icon: Database,
        label: "Cargar Datos",
        href: "/reports/upload",
      },
      {
        id: "manage-reports",
        icon: FileText,
        label: "Gestionar Reportes",
        href: "/reports/manage",
      },
      {
        id: "export",
        icon: FileText,
        label: "Exportar Datos",
        href: "/reports/export",
      }
    ]
  },
  {
    id: "settings",
    icon: Settings,
    label: "Configuración",
    items: [
      {
        id: "classifications",
        icon: Database,
        label: "Clasificaciones",
        href: "/settings/classifications",
      },
      {
        id: "business-units",
        icon: Settings,
        label: "Unidades de Negocio",
        href: "/settings/units",
      }
    ]
  }
]

// Logo component that adapts to sidebar state
function AppLogo({ isCollapsed = false, onClick }: { isCollapsed?: boolean; onClick?: () => void }) {
  const logoContent = (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <DollarSign className="h-4 w-4" />
      </div>
      {!isCollapsed && (
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Financial</span>
          <span className="text-xs text-muted-foreground">Dashboard</span>
        </div>
      )}
    </div>
  )

  if (onClick) {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start p-3 h-auto hover:bg-accent"
        onClick={onClick}
      >
        {logoContent}
      </Button>
    )
  }

  return (
    <Link href="/dashboard" className="flex items-center p-3 hover:bg-accent rounded-lg transition-colors">
      {logoContent}
    </Link>
  )
}

// Collapsed sidebar with tooltips
function CollapsedSidebar({ className }: { className?: string }) {
  const pathname = usePathname()

  const isItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  const isSectionActive = (items: NavigationItem[]) => {
    return items.some(item => isItemActive(item.href))
  }

  return (
    <TooltipProvider delayDuration={200}>
      <aside className={cn("flex flex-col w-16 border-r bg-background", className)}>
        <div className="p-2">
          <AppLogo isCollapsed />
        </div>
        
        <nav className="flex-1 space-y-1 p-2">
          {navigationSections.map((section) => (
            <div key={section.id} className="space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center justify-center p-2 rounded-lg transition-all duration-200 hover:scale-105",
                    isSectionActive(section.items) 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-accent hover:shadow-sm"
                  )}>
                    <section.icon className="h-5 w-5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  className="z-[9999999] p-4 max-w-sm bg-popover border shadow-lg rounded-lg"
                  sideOffset={8}
                >
                  <div className="flex items-center gap-2 mb-3 border-b border-border pb-2">
                    <section.icon className="h-5 w-5 text-primary" />
                    <div className="font-semibold text-base">{section.label}</div>
                  </div>
                  <div className="space-y-2">
                    {section.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-md text-sm transition-all duration-150 hover:scale-[1.02]",
                          isItemActive(item.href)
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto text-xs bg-muted px-2 py-1 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  )
}

// Expanded sidebar with collapsible sections
function ExpandedSidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(navigationSections.map(s => s.id))
  )

  const isItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  const isSectionActive = (items: NavigationItem[]) => {
    return items.some(item => isItemActive(item.href))
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  return (
    <aside className={cn("flex flex-col w-64 border-r bg-background", className)}>
      <div className="p-4">
        <AppLogo />
      </div>
      
      <nav className="flex-1 space-y-2 p-4">
        {navigationSections.map((section) => {
          const isExpanded = expandedSections.has(section.id)
          const isActive = isSectionActive(section.items)
          
          return (
            <div key={section.id} className="space-y-1">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between p-2 h-auto hover:bg-accent",
                  isActive && "bg-accent text-accent-foreground"
                )}
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center gap-3">
                  <section.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{section.label}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              
              {isExpanded && (
                <div className="ml-4 space-y-1">
                  {section.items.map((item) => (
                    <Link key={item.id} href={item.href}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start p-2 h-auto text-sm",
                          isItemActive(item.href) 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                            : "hover:bg-accent"
                        )}
                      >
                        <item.icon className="h-4 w-4 mr-3" />
                        {item.label}
                        {item.badge && (
                          <span className="ml-auto text-xs bg-muted px-2 py-1 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

// Mobile sidebar component
function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col p-0 w-64">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Access the main navigation menu to browse different sections of the financial dashboard.
        </SheetDescription>
        <ExpandedSidebar />
      </SheetContent>
    </Sheet>
  )
}

// Main sidebar component
export function Sidebar({ isCollapsed = false, onToggle, className }: SidebarProps) {
  if (isCollapsed) {
    return <CollapsedSidebar className={className} />
  }
  
  return <ExpandedSidebar className={className} />
}

// Sidebar toggle button
export function SidebarToggle({ 
  isCollapsed, 
  onToggle 
}: { 
  isCollapsed: boolean
  onToggle: () => void 
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onToggle}
      className="hidden md:flex"
    >
      {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  )
}

// Mobile sidebar export
export { MobileSidebar }

// Header component with breadcrumbs and sidebar controls
export function DashboardHeader({ 
  isCollapsed, 
  onToggle 
}: { 
  isCollapsed: boolean
  onToggle: () => void 
}) {
  const pathname = usePathname()
  
  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length === 0 || (parts.length === 1 && parts[0] === 'dashboard')) {
      return [{ label: 'Panel Principal', href: '/dashboard' }]
    }
    
    // Generate breadcrumbs based on navigation sections
    const breadcrumbs = []
    for (const section of navigationSections) {
      for (const item of section.items) {
        if (pathname.startsWith(item.href) && item.href !== '/dashboard') {
          breadcrumbs.push({ label: section.label, href: '#' })
          breadcrumbs.push({ label: item.label, href: item.href })
          break
        }
      }
      if (breadcrumbs.length > 0) break
    }
    
    return breadcrumbs.length > 0 ? breadcrumbs : [{ label: 'Panel Principal', href: '/dashboard' }]
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
      <div className="flex items-center gap-2">
        <MobileSidebar />
        <SidebarToggle isCollapsed={isCollapsed} onToggle={onToggle} />
      </div>
      
      <div className="flex-1 min-w-0">
        <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.href + index}>
              {index > 0 && <span>/</span>}
              <Link 
                href={crumb.href}
                className={cn(
                  "hover:text-foreground transition-colors",
                  index === breadcrumbs.length - 1 && "text-foreground font-medium"
                )}
              >
                {crumb.label}
              </Link>
            </React.Fragment>
          ))}
        </nav>
      </div>
    </header>
  )
}
