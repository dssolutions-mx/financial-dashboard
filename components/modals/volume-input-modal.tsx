"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface VolumeInputModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (volumeData: VolumeData) => Promise<void>
  currentMonth: number | null
  currentYear: number | null
  initialData?: VolumeData
}

interface VolumeData {
  [category: string]: {
    [plant: string]: number
  }
}

// Plant configuration
const PLANTS = ["P1", "P2", "P3", "P4", "P5"]
const CATEGORIES = [
  { key: "Ventas Concreto", label: "Ventas Concreto (m³)", color: "bg-blue-500" },
  { key: "Ventas Bombeo", label: "Ventas Bombeo (m³)", color: "bg-green-500" },
  { key: "Productos Alternativos", label: "Productos Alternativos (unidades)", color: "bg-purple-500" }
]

const PLANT_UNITS: Record<string, string> = {
  P1: "BAJIO",
  P2: "VIADUCTO", 
  P3: "ITISA",
  P4: "VIADUCTO",
  P5: "BAJIO"
}

export default function VolumeInputModal({
  isOpen,
  onClose,
  onSave,
  currentMonth,
  currentYear,
  initialData = {}
}: VolumeInputModalProps) {
  const [volumeData, setVolumeData] = useState<VolumeData>({})
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      // Initialize with existing data or zeros
      const initData: VolumeData = {}
      CATEGORIES.forEach(category => {
        initData[category.key] = {}
        PLANTS.forEach(plant => {
          initData[category.key][plant] = initialData[category.key]?.[plant] || 0
        })
      })
      setVolumeData(initData)
    }
  }, [isOpen, initialData])

  const handleInputChange = (category: string, plant: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value)
    if (isNaN(numValue) || numValue < 0) return

    setVolumeData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [plant]: numValue
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
      await onSave(volumeData)
      toast({
        title: "Datos guardados",
        description: `Se guardaron los datos de volumen para ${currentMonth}/${currentYear}`,
      })
      onClose()
    } catch (error) {
      console.error("Error saving volume data:", error)
      toast({
        title: "Error",
        description: "No se pudieron guardar los datos de volumen",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getTotalForCategory = (category: string) => {
    return PLANTS.reduce((sum, plant) => sum + (volumeData[category]?.[plant] || 0), 0)
  }

  const getTotalForPlant = (plant: string) => {
    return CATEGORIES.reduce((sum, category) => sum + (volumeData[category.key]?.[plant] || 0), 0)
  }

  if (!currentMonth || !currentYear) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            Ingreso de Datos de Volumen - {currentMonth}/{currentYear}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Instrucciones:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ingrese los metros cúbicos para cada planta y categoría</li>
              <li>• Los datos se guardarán para el mes/año actual del reporte</li>
              <li>• Puede dejar campos en 0 si no hay datos para esa combinación</li>
            </ul>
          </div>

          {/* Volume Input Form */}
          <div className="space-y-6">
            {CATEGORIES.map(category => (
              <Card key={category.key} className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-4 h-4 ${category.color} rounded-full`}></div>
                  <h3 className="font-medium text-gray-800">{category.label}</h3>
                  <span className="text-sm text-gray-500 ml-auto">
                    Total: {getTotalForCategory(category.key).toFixed(2)}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {PLANTS.map(plant => (
                    <div key={plant} className="space-y-2">
                      <Label htmlFor={`${category.key}-${plant}`} className="text-sm font-medium">
                        {plant}
                        <span className="text-xs text-gray-500 block">
                          ({PLANT_UNITS[plant]})
                        </span>
                      </Label>
                      <Input
                        id={`${category.key}-${plant}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={volumeData[category.key]?.[plant] || ''}
                        onChange={(e) => handleInputChange(category.key, plant, e.target.value)}
                        className="text-center"
                        placeholder="0.00"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Summary by Plant */}
          <Card className="p-4 bg-gray-50">
            <h3 className="font-medium text-gray-800 mb-3">Resumen por Planta:</h3>
            <div className="grid grid-cols-5 gap-4">
              {PLANTS.map(plant => (
                <div key={plant} className="text-center">
                  <div className="font-medium text-gray-700">{plant}</div>
                  <div className="text-sm text-gray-600">({PLANT_UNITS[plant]})</div>
                  <div className="text-lg font-bold text-gray-800 mt-1">
                    {getTotalForPlant(plant).toFixed(2)}
                  </div>
                </div>
              ))}
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
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Save size={16} />
            {isSaving ? "Guardando..." : "Guardar Datos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 