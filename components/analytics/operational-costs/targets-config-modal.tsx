"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Target, Truck, Building2, Settings, Activity, Percent } from "lucide-react"

export interface OperationalTargets {
  costoTransporte: number // % of total income for concrete transport
  costoFijo: number // % of total income for fixed costs (distributed)
  costoUnitarioConcreto: number // MXN per m³ for concrete operations
  costoUnitarioBombeo: number // MXN per m³ for pumping operations
  eficienciaMinima: number // % minimum operational efficiency
  participacionMaxima: number // % maximum operational participation
}

// Default operational targets
const DEFAULT_TARGETS: OperationalTargets = {
  costoTransporte: 18, // 18% of income for concrete transport
  costoFijo: 15, // 15% of income for fixed costs
  costoUnitarioConcreto: 450, // 450 MXN per m³ for concrete
  costoUnitarioBombeo: 200, // 200 MXN per m³ for pumping service
  eficienciaMinima: 75, // 75% minimum efficiency
  participacionMaxima: 40, // 40% maximum operational participation
}

export function useOperationalTargets() {
  const [targets, setTargets] = useState<OperationalTargets>(DEFAULT_TARGETS)

  useEffect(() => {
    // Load targets from localStorage
    const savedTargets = localStorage.getItem('operational-targets')
    if (savedTargets) {
      try {
        const parsed = JSON.parse(savedTargets)
        setTargets({ ...DEFAULT_TARGETS, ...parsed })
      } catch (error) {
        console.error('Error loading operational targets:', error)
      }
    }
  }, [])

  const updateTargets = (newTargets: Partial<OperationalTargets>) => {
    const updatedTargets = { ...targets, ...newTargets }
    setTargets(updatedTargets)
    localStorage.setItem('operational-targets', JSON.stringify(updatedTargets))
  }

  return {
    targets,
    updateTargets
  }
}

export function OperationalTargetsConfigModal({
  currentTargets,
  onTargetsChange,
  totalIncome
}: {
  currentTargets: OperationalTargets
  onTargetsChange: (targets: OperationalTargets) => void
  totalIncome: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [targets, setTargets] = useState(currentTargets)

  useEffect(() => {
    setTargets(currentTargets)
  }, [currentTargets])

  const handleSave = () => {
    onTargetsChange(targets)
    setIsOpen(false)
  }

  const handleReset = () => {
    setTargets(DEFAULT_TARGETS)
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount.toFixed(0)}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Target className="h-4 w-4 mr-2" />
          Configurar Objetivos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Configurar Objetivos Operativos
          </DialogTitle>
          <DialogDescription>
            Establece los objetivos para cada categoría de costo operativo como porcentaje de ingresos
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Percentage Targets */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Objetivos por Categoría (% de ingresos)
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="costoTransporte" className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-orange-500" />
                    Costos de Transporte (%)
                  </Label>
                  <Input
                    id="costoTransporte"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={targets.costoTransporte}
                    onChange={(e) => setTargets({...targets, costoTransporte: parseFloat(e.target.value) || 0})}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recomendado: 15-20% | Incluye combustible, mantenimiento de vehículos, operadores
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="costoFijo" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    Costos Fijos Operativos (%)
                  </Label>
                  <Input
                    id="costoFijo"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={targets.costoFijo}
                    onChange={(e) => setTargets({...targets, costoFijo: parseFloat(e.target.value) || 0})}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recomendado: 12-18% | Incluye renta, servicios, seguros, gastos estructurales
                  </p>
                </div>
                

              </div>
            </div>
            
            {/* Efficiency Targets */}
            <div className="space-y-4">
              <h3 className="font-semibold">Objetivos de Eficiencia</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eficienciaMinima">Eficiencia Operativa Mínima (%)</Label>
                  <Input
                    id="eficienciaMinima"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={targets.eficienciaMinima}
                    onChange={(e) => setTargets({...targets, eficienciaMinima: parseFloat(e.target.value) || 0})}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Porcentaje mínimo de eficiencia operativa aceptable
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="costoUnitarioConcreto" className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-orange-500" />
                    Costo Unitario Concreto (MXN/m³)
                  </Label>
                  <Input
                    id="costoUnitarioConcreto"
                    type="number"
                    step="1"
                    min="0"
                    value={targets.costoUnitarioConcreto}
                    onChange={(e) => setTargets({...targets, costoUnitarioConcreto: parseFloat(e.target.value) || 0})}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recomendado: 400-500 MXN/m³ | Incluye transporte + fijos asignados
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="costoUnitarioBombeo" className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-purple-500" />
                    Costo Unitario Bombeo (MXN/m³)
                  </Label>
                  <Input
                    id="costoUnitarioBombeo"
                    type="number"
                    step="1"
                    min="0"
                    value={targets.costoUnitarioBombeo}
                    onChange={(e) => setTargets({...targets, costoUnitarioBombeo: parseFloat(e.target.value) || 0})}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recomendado: 150-250 MXN/m³ | Incluye servicio bomba + fijos asignados
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="participacionMaxima" className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-blue-500" />
                    Participación Máxima (%)
                  </Label>
                  <Input
                    id="participacionMaxima"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={targets.participacionMaxima}
                    onChange={(e) => setTargets({...targets, participacionMaxima: parseFloat(e.target.value) || 0})}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recomendado: 35-40% | Máximo porcentaje de ingresos para operación
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <h4 className="font-medium">Resumen de Objetivos Operativos</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Participación total:</strong> {(targets.costoTransporte + targets.costoFijo).toFixed(1)}% (max: {targets.participacionMaxima}%)</p>
                  <p><strong>Margen después de operación:</strong> {(100 - targets.costoTransporte - targets.costoFijo).toFixed(1)}%</p>
                  <p><strong>Costo concreto:</strong> ${targets.costoUnitarioConcreto}/m³ | <strong>Bombeo:</strong> ${targets.costoUnitarioBombeo}/m³</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Preview with current income */}
          {totalIncome > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg border">
              <h4 className="font-semibold mb-3">Vista Previa con Ingresos Actuales</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Transporte Concreto</p>
                    <p className="font-medium">{formatCurrency(totalIncome * targets.costoTransporte / 100)}</p>
                    <p className="text-xs text-orange-600">{targets.costoTransporte}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Costos Fijos (Distribuidos)</p>
                    <p className="font-medium">{formatCurrency(totalIncome * targets.costoFijo / 100)}</p>
                    <p className="text-xs text-blue-600">{targets.costoFijo}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Total Operativo</p>
                    <p className="font-medium">{formatCurrency(totalIncome * (targets.costoTransporte + targets.costoFijo) / 100)}</p>
                    <p className="text-xs text-gray-600">{(targets.costoTransporte + targets.costoFijo).toFixed(1)}%</p>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <h5 className="text-sm font-medium mb-2 text-gray-700">División por Tipo de Operación</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-400">
                      <p className="font-medium text-orange-700">🏗️ Operación Concreto</p>
                      <p className="text-xs text-gray-600 mt-1">Objetivo: ${targets.costoUnitarioConcreto}/m³</p>
                      <p className="text-xs text-gray-600">Incluye: Transporte + Fijos asignados por volumen</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded border-l-4 border-purple-400">
                      <p className="font-medium text-purple-700">🚚 Servicio Bombeo</p>
                      <p className="text-xs text-gray-600 mt-1">Objetivo: ${targets.costoUnitarioBombeo}/m³</p>
                      <p className="text-xs text-gray-600">Incluye: Servicio bomba + Fijos asignados por volumen</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warning for high percentages */}
          {(targets.costoTransporte + targets.costoFijo) > 40 && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Los objetivos suman {(targets.costoTransporte + targets.costoFijo).toFixed(1)}% de ingresos. 
                Un total operativo alto podría impactar la rentabilidad.
              </p>
            </div>
          )}
        </div>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Restaurar Valores Por Defecto
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Guardar Objetivos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 