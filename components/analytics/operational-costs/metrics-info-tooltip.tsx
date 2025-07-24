"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  HelpCircle, 
  Target, 
  Calculator, 
  TrendingUp,
  Truck,
  Building2,
  Settings,
  Activity,
  Percent,
  DollarSign
} from "lucide-react"

interface MetricsInfoTooltipProps {
  type: "transport" | "fixed" | "operational" | "efficiency" | "unit_cost" | "participation"
  className?: string
}

export function MetricsInfoTooltip({ type, className }: MetricsInfoTooltipProps) {
  const getTooltipContent = () => {
    switch (type) {
      case "transport":
        return {
          title: "Costos de Transporte",
          content: "Incluye todos los gastos relacionados con la entrega y distribución de concreto. Comprende combustible, mantenimiento de vehículos, salarios de operadores y otros gastos de logística.",
          icon: Truck
        }
      case "fixed":
        return {
          title: "Costos Fijos Operativos",
          content: "Gastos estructurales de la operación que no varían con el volumen de producción. Incluye renta, servicios básicos, seguros y otros gastos fijos operativos.",
          icon: Building2
        }
      case "operational":
        return {
          title: "Otros Costos Operativos",
          content: "Gastos adicionales de la operación no clasificados en transporte o costos fijos. Incluye mantenimiento, servicios especializados y otros gastos operativos.",
          icon: Settings
        }
      case "efficiency":
        return {
          title: "Eficiencia Operativa",
          content: "Mide qué tan bien se controlan los costos operativos en relación a los ingresos. Se calcula como (Ingresos - Costos Operativos) / Ingresos × 100.",
          icon: Target
        }
      case "unit_cost":
        return {
          title: "Costo Operativo Unitario",
          content: "Costo operativo promedio por metro cúbico de material procesado. Útil para comparar eficiencia entre plantas y períodos.",
          icon: Calculator
        }
      case "participation":
        return {
          title: "Participación Operativa",
          content: "Porcentaje de los ingresos totales que se destina a costos operativos. Un indicador clave de la estructura de costos.",
          icon: Percent
        }
      default:
        return {
          title: "Información",
          content: "Información adicional sobre esta métrica.",
          icon: HelpCircle
        }
    }
  }

  const info = getTooltipContent()
  const IconComponent = info.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className={`p-1 h-6 w-6 ${className}`}>
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="flex items-start gap-2">
            <IconComponent className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{info.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{info.content}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function OperationalCostsInfoSection() {
  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Información sobre Costos Operativos
        </CardTitle>
        <CardDescription>
          Guía para interpretar las métricas de costos operativos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-6">
          {/* División por Tipo de Operación */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              División de Costos por Tipo de Operación
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-400">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-orange-600" />
                  <h5 className="font-medium text-orange-700">🏗️ Operación Concreto</h5>
                </div>
                <div className="text-xs text-gray-700 space-y-1">
                  <p><strong>Costos directos:</strong> Diesel, fletes, mantenimiento CR, servicios</p>
                  <p><strong>Costos fijos asignados:</strong> Proporción según volumen de concreto</p>
                  <p><strong>Volumen base:</strong> Concreto + productos alternativos</p>
                </div>
              </div>
              
              <div className="bg-purple-50 p-3 rounded border-l-4 border-purple-400">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-4 w-4 text-purple-600" />
                  <h5 className="font-medium text-purple-700">🚚 Servicio Bombeo</h5>
                </div>
                <div className="text-xs text-gray-700 space-y-1">
                  <p><strong>Costos directos:</strong> Solo "Costo servicio de bomba"</p>
                  <p><strong>Costos fijos asignados:</strong> Proporción según volumen de bombeo</p>
                  <p><strong>Volumen base:</strong> Solo volumen de bombeo</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detalle de Categorías */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-orange-500" />
                <h4 className="font-semibold">Costos de Transporte Concreto</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Costos específicos para entrega de concreto (EXCLUYE servicio bomba):
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                <li>• Diesel CR</li>
                <li>• Servicios</li>
                <li>• Mantenimiento Preventivo CR</li>
                <li>• Mantenimiento Correctivo CR</li>
                <li>• Fletes</li>
                <li>• Otros gastos CR</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                <h4 className="font-semibold">Costos Fijos (Distribuidos)</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Gastos estructurales distribuidos proporcionalmente:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                <li>• Nómina Producción</li>
                <li>• Nómina Operadores CR</li>
                <li>• Nómina Administrativos</li>
                <li>• Mantenimiento Producción</li>
                <li>• Rentas Equipos</li>
                <li>• Rentas Inmuebles</li>
                <li>• Otros gastos Producción</li>
                <li>• Otros gastos Administrativos</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Interpretación de Métricas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <p><strong>Eficiencia Positiva:</strong> Costos por debajo del objetivo</p>
              <p><strong>Eficiencia Negativa:</strong> Costos por encima del objetivo</p>
            </div>
            <div>
              <p><strong>Costos Unitarios:</strong> Permiten comparar entre plantas</p>
              <p><strong>Participación:</strong> Muestra estructura de costos</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function OperationalTargetsConfigModal({
  currentTargets,
  onTargetsChange,
  totalIncome
}: {
  currentTargets: any
  onTargetsChange: (targets: any) => void
  totalIncome: number
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [targets, setTargets] = React.useState(currentTargets)

  const handleSave = () => {
    onTargetsChange(targets)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Target className="h-4 w-4 mr-2" />
          Configurar Objetivos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Objetivos Operativos</DialogTitle>
          <DialogDescription>
            Establece los objetivos para cada categoría de costo operativo
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Objetivos por Categoría (% de ingresos)</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Costos de Transporte (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={targets.costoTransporte}
                    onChange={(e) => setTargets({...targets, costoTransporte: parseFloat(e.target.value)})}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Costos Fijos (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={targets.costoFijo}
                    onChange={(e) => setTargets({...targets, costoFijo: parseFloat(e.target.value)})}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Otros Operativos (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={targets.otrosOperativos}
                    onChange={(e) => setTargets({...targets, otrosOperativos: parseFloat(e.target.value)})}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Objetivos de Eficiencia</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Eficiencia Mínima (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={targets.eficienciaMinima}
                    onChange={(e) => setTargets({...targets, eficienciaMinima: parseFloat(e.target.value)})}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Costo Unitario Máximo (MXN/m³)</label>
                  <input
                    type="number"
                    step="1"
                    value={targets.costoUnitarioMaximo}
                    onChange={(e) => setTargets({...targets, costoUnitarioMaximo: parseFloat(e.target.value)})}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {totalIncome > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Objetivos en Valores Absolutos</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Transporte</p>
                  <p className="font-medium">${((totalIncome * targets.costoTransporte / 100) / 1000).toFixed(0)}K</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Costos Fijos</p>
                  <p className="font-medium">${((totalIncome * targets.costoFijo / 100) / 1000).toFixed(0)}K</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Otros</p>
                  <p className="font-medium">${((totalIncome * targets.otrosOperativos / 100) / 1000).toFixed(0)}K</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar Objetivos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 