"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Save, X, DollarSign, BarChart3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CashSalesInputModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (cashSalesData: CashSalesData) => Promise<void>
  currentMonth: number | null
  currentYear: number | null
  initialData?: CashSalesData
}

interface CashSalesData {
  [category: string]: {
    [plant: string]: {
      volume: number
      amount: number
    }
  }
}

// Plant configuration
const PLANTS = ["P1", "P2", "P3", "P4", "P5"]
const CASH_CATEGORIES = [
  { key: "Ventas Concreto Cash", label: "Ventas Concreto Cash", color: "bg-emerald-500", icon: BarChart3 },
  { key: "Ventas Bombeo Cash", label: "Ventas Bombeo Cash", color: "bg-orange-500", icon: BarChart3 }
]

const PLANT_UNITS: Record<string, string> = {
  P1: "BAJIO",
  P2: "VIADUCTO", 
  P3: "ITISA",
  P4: "VIADUCTO",
  P5: "BAJIO"
}

export default function CashSalesInputModal({
  isOpen,
  onClose,
  onSave,
  currentMonth,
  currentYear,
  initialData = {}
}: CashSalesInputModalProps) {
  const [cashSalesData, setCashSalesData] = useState<CashSalesData>({})
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      // Initialize with existing data or zeros
      const initData: CashSalesData = {}
      CASH_CATEGORIES.forEach(category => {
        initData[category.key] = {}
        PLANTS.forEach(plant => {
          initData[category.key][plant] = {
            volume: initialData[category.key]?.[plant]?.volume || 0,
            amount: initialData[category.key]?.[plant]?.amount || 0
          }
        })
      })
      setCashSalesData(initData)
    }
  }, [isOpen, initialData])

  const handleVolumeChange = (category: string, plant: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value)
    if (isNaN(numValue) || numValue < 0) return

    setCashSalesData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [plant]: {
          ...prev[category][plant],
          volume: numValue
        }
      }
    }))
  }

  const handleAmountChange = (category: string, plant: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value)
    if (isNaN(numValue) || numValue < 0) return

    setCashSalesData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [plant]: {
          ...prev[category][plant],
          amount: numValue
        }
      }
    }))
  }

  const handleSave = async () => {
    if (!currentMonth || !currentYear) {
      toast({
        title: "Error",
        description: "No se ha seleccionado un mes/año válido",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      await onSave(cashSalesData)
      toast({
        title: "Datos guardados",
        description: `Se guardaron las ventas en efectivo para ${currentMonth}/${currentYear}`,
      })
      onClose()
    } catch (error) {
      console.error("Error saving cash sales data:", error)
      toast({
        title: "Error",
        description: "No se pudieron guardar las ventas en efectivo",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getTotalVolumeForCategory = (category: string) => {
    return PLANTS.reduce((sum, plant) => sum + (cashSalesData[category]?.[plant]?.volume || 0), 0)
  }

  const getTotalAmountForCategory = (category: string) => {
    return PLANTS.reduce((sum, plant) => sum + (cashSalesData[category]?.[plant]?.amount || 0), 0)
  }

  const getTotalForPlant = (plant: string) => {
    return CASH_CATEGORIES.reduce((sum, category) => {
      const plantData = cashSalesData[category.key]?.[plant]
      return sum + (plantData?.volume || 0)
    }, 0)
  }

  const getTotalAmountForPlant = (plant: string) => {
    return CASH_CATEGORIES.reduce((sum, category) => {
      const plantData = cashSalesData[category.key]?.[plant]
      return sum + (plantData?.amount || 0)
    }, 0)
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getUnitPrice = (category: string, plant: string) => {
    const volume = cashSalesData[category]?.[plant]?.volume || 0
    const amount = cashSalesData[category]?.[plant]?.amount || 0
    return volume > 0 ? amount / volume : 0
  }

  if (!currentMonth || !currentYear) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            Ingreso de Ventas en Efectivo - {currentMonth}/{currentYear}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h3 className="font-medium text-emerald-900 mb-2">Instrucciones:</h3>
            <ul className="text-sm text-emerald-800 space-y-1">
              <li>• Ingrese volumen (m³) y monto (MXN) para ventas en efectivo por planta</li>
              <li>• Estas ventas no están incluidas en los registros fiscales del Excel</li>
              <li>• El volumen se sumará al total para cálculos de costos unitarios</li>
              <li>• Puede dejar campos en 0 si no hay ventas en efectivo para esa combinación</li>
            </ul>
          </div>

          {/* Cash Sales Input Form */}
          <div className="space-y-6">
            {CASH_CATEGORIES.map(category => {
              const IconComponent = category.icon
              return (
                <Card key={category.key} className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-4 h-4 ${category.color} rounded-full`}></div>
                    <IconComponent size={16} className="text-gray-600" />
                    <h3 className="font-medium text-gray-800">{category.label}</h3>
                    <div className="ml-auto flex gap-4 text-sm text-gray-500">
                      <span>Volumen Total: {getTotalVolumeForCategory(category.key).toFixed(2)} m³</span>
                      <span>Monto Total: {formatMoney(getTotalAmountForCategory(category.key))}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {PLANTS.map(plant => (
                      <div key={plant} className="space-y-3 border rounded-lg p-3 bg-gray-50">
                        <div className="text-center">
                          <Label className="text-sm font-medium text-gray-700">
                            {plant}
                            <span className="text-xs text-gray-500 block">
                              ({PLANT_UNITS[plant]})
                            </span>
                          </Label>
                        </div>
                        
                        {/* Volume Input */}
                        <div className="space-y-1">
                          <Label htmlFor={`${category.key}-${plant}-volume`} className="text-xs text-gray-600">
                            Volumen (m³)
                          </Label>
                          <Input
                            id={`${category.key}-${plant}-volume`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={cashSalesData[category.key]?.[plant]?.volume || ''}
                            onChange={(e) => handleVolumeChange(category.key, plant, e.target.value)}
                            className="text-center text-sm"
                            placeholder="0.00"
                          />
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-1">
                          <Label htmlFor={`${category.key}-${plant}-amount`} className="text-xs text-gray-600">
                            Monto (MXN)
                          </Label>
                          <Input
                            id={`${category.key}-${plant}-amount`}
                            type="number"
                            step="1"
                            min="0"
                            value={cashSalesData[category.key]?.[plant]?.amount || ''}
                            onChange={(e) => handleAmountChange(category.key, plant, e.target.value)}
                            className="text-center text-sm"
                            placeholder="0"
                          />
                        </div>

                        {/* Unit Price Display */}
                        <div className="text-xs text-center text-gray-500 bg-white p-2 rounded">
                          Precio/m³: {formatMoney(getUnitPrice(category.key, plant))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Summary by Plant */}
          <Card className="p-4 bg-gray-50">
            <h3 className="font-medium text-gray-800 mb-3">Resumen por Planta:</h3>
            <div className="grid grid-cols-5 gap-4">
              {PLANTS.map(plant => (
                <div key={plant} className="text-center bg-white p-3 rounded">
                  <div className="font-medium text-gray-700">{plant}</div>
                  <div className="text-sm text-gray-600">({PLANT_UNITS[plant]})</div>
                  <div className="mt-2 space-y-1">
                    <div className="text-sm font-bold text-gray-800">
                      {getTotalForPlant(plant).toFixed(2)} m³
                    </div>
                    <div className="text-sm font-bold text-green-600">
                      {formatMoney(getTotalAmountForPlant(plant))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Overall Summary */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-medium text-blue-800 mb-3">Resumen General:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700">
                  {CASH_CATEGORIES.reduce((sum, cat) => sum + getTotalVolumeForCategory(cat.key), 0).toFixed(2)}
                </div>
                <div className="text-sm text-blue-600">Total m³</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {formatMoney(CASH_CATEGORIES.reduce((sum, cat) => sum + getTotalAmountForCategory(cat.key), 0))}
                </div>
                <div className="text-sm text-green-600">Total Ventas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-700">
                  {getTotalVolumeForCategory("Ventas Concreto Cash").toFixed(2)}
                </div>
                <div className="text-sm text-emerald-600">Concreto m³</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-700">
                  {getTotalVolumeForCategory("Ventas Bombeo Cash").toFixed(2)}
                </div>
                <div className="text-sm text-orange-600">Bombeo m³</div>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <X size={16} />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Save size={16} />
            {isSaving ? "Guardando..." : "Guardar Ventas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 