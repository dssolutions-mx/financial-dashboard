"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Target, Info, Save, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export interface CostTargets {
  materiaPrima: number
  costosOperativos: number
  nomina: number
  eficienciaGeneral: number
  // Targets por categoría específica
  categorias: {
    [key: string]: number
  }
}

interface TargetsConfigModalProps {
  currentTargets: CostTargets
  onTargetsChange: (targets: CostTargets) => void
  totalIncome: number
}

const DEFAULT_TARGETS: CostTargets = {
  materiaPrima: 45, // 45% del ingreso
  costosOperativos: 15, // 15% del ingreso
  nomina: 18, // 18% del ingreso
  eficienciaGeneral: 25, // 25% margen mínimo
  categorias: {
    "Cemento": 35,
    "Agregado Grueso": 8,
    "Agregado Fino": 5,
    "Aditivos": 3,
    "Agua": 1,
    "Diesel CR": 4,
    "Nómina Producción": 12,
    "Nómina Operadores CR": 6,
    "Otros gastos Producción": 3,
    "Otros gastos CR": 2,
    "Otros gastos Administrativos": 2
  }
}

export function TargetsConfigModal({ currentTargets, onTargetsChange, totalIncome }: TargetsConfigModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempTargets, setTempTargets] = useState<CostTargets>(currentTargets)
  const { toast } = useToast()

  useEffect(() => {
    setTempTargets(currentTargets)
  }, [currentTargets])

  const handleSave = () => {
    // Validar que los targets sean razonables
    const totalMainTargets = tempTargets.materiaPrima + tempTargets.costosOperativos + tempTargets.nomina
    
    if (totalMainTargets > 95) {
      toast({
        title: "Error de Validación",
        description: "La suma de los objetivos principales no puede superar el 95% del ingreso",
        variant: "destructive"
      })
      return
    }

    onTargetsChange(tempTargets)
    
    // Guardar en localStorage
    localStorage.setItem('costAnalysisTargets', JSON.stringify(tempTargets))
    
    toast({
      title: "Objetivos Guardados",
      description: "Los objetivos de costos se han actualizado correctamente",
    })
    
    setIsOpen(false)
  }

  const handleReset = () => {
    setTempTargets(DEFAULT_TARGETS)
    toast({
      title: "Objetivos Restablecidos",
      description: "Se han restaurado los objetivos predeterminados",
    })
  }

  const updateMainTarget = (key: keyof Omit<CostTargets, 'categorias'>, value: number) => {
    setTempTargets(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateCategoryTarget = (category: string, value: number) => {
    setTempTargets(prev => ({
      ...prev,
      categorias: {
        ...prev.categorias,
        [category]: value
      }
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Configurar Objetivos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Configuración de Objetivos de Costos
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información General */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Info className="w-5 h-5" />
                Información sobre Objetivos
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800">
              <ul className="space-y-1">
                <li>• Los objetivos se expresan como porcentaje del ingreso total</li>
                <li>• La <strong>eficiencia</strong> se calcula como: (Objetivo - Costo Real) / Objetivo × 100</li>
                <li>• Un valor positivo indica que estás por debajo del objetivo (bueno)</li>
                <li>• Un valor negativo indica que estás por encima del objetivo (requiere atención)</li>
                <li>• Los objetivos deben ser realistas y basados en el desempeño histórico</li>
              </ul>
            </CardContent>
          </Card>

          {/* Objetivos Principales */}
          <Card>
            <CardHeader>
              <CardTitle>Objetivos Principales</CardTitle>
              <CardDescription>
                Define los objetivos para las categorías principales de costos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="materiaPrima">Materia Prima (% del ingreso)</Label>
                  <Input
                    id="materiaPrima"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.materiaPrima}
                    onChange={(e) => updateMainTarget('materiaPrima', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Objetivo: {formatCurrency(totalIncome * tempTargets.materiaPrima / 100)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costosOperativos">Costos Operativos (% del ingreso)</Label>
                  <Input
                    id="costosOperativos"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.costosOperativos}
                    onChange={(e) => updateMainTarget('costosOperativos', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Objetivo: {formatCurrency(totalIncome * tempTargets.costosOperativos / 100)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nomina">Nómina (% del ingreso)</Label>
                  <Input
                    id="nomina"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.nomina}
                    onChange={(e) => updateMainTarget('nomina', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Objetivo: {formatCurrency(totalIncome * tempTargets.nomina / 100)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eficienciaGeneral">Margen Mínimo (% del ingreso)</Label>
                  <Input
                    id="eficienciaGeneral"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.eficienciaGeneral}
                    onChange={(e) => updateMainTarget('eficienciaGeneral', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Margen objetivo: {formatCurrency(totalIncome * tempTargets.eficienciaGeneral / 100)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Objetivos por Categoría */}
          <Card>
            <CardHeader>
              <CardTitle>Objetivos por Categoría Específica</CardTitle>
              <CardDescription>
                Define objetivos detallados para categorías específicas de gastos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(tempTargets.categorias).map(([category, target]) => (
                  <div key={category} className="space-y-2">
                    <Label htmlFor={category}>{category} (%)</Label>
                    <Input
                      id={category}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={target}
                      onChange={(e) => updateCategoryTarget(category, parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(totalIncome * target / 100)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resumen de Objetivos */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle>Resumen de Objetivos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium">Total Costos Objetivo</p>
                  <p className="text-lg font-bold">
                    {(tempTargets.materiaPrima + tempTargets.costosOperativos + tempTargets.nomina).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="font-medium">Margen Esperado</p>
                  <p className="text-lg font-bold text-green-600">
                    {(100 - tempTargets.materiaPrima - tempTargets.costosOperativos - tempTargets.nomina).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="font-medium">Margen Mínimo</p>
                  <p className="text-lg font-bold text-blue-600">
                    {tempTargets.eficienciaGeneral.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="font-medium">Diferencia</p>
                  <p className={`text-lg font-bold ${
                    (100 - tempTargets.materiaPrima - tempTargets.costosOperativos - tempTargets.nomina) >= tempTargets.eficienciaGeneral
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(100 - tempTargets.materiaPrima - tempTargets.costosOperativos - tempTargets.nomina - tempTargets.eficienciaGeneral).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restablecer Predeterminados
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Guardar Objetivos
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook para manejar los targets
export function useCostTargets() {
  const [targets, setTargets] = useState<CostTargets>(DEFAULT_TARGETS)

  useEffect(() => {
    // Cargar targets desde localStorage
    const savedTargets = localStorage.getItem('costAnalysisTargets')
    if (savedTargets) {
      try {
        const parsedTargets = JSON.parse(savedTargets)
        setTargets(parsedTargets)
      } catch (error) {
        console.error('Error loading saved targets:', error)
      }
    }
  }, [])

  const updateTargets = (newTargets: CostTargets) => {
    setTargets(newTargets)
    localStorage.setItem('costAnalysisTargets', JSON.stringify(newTargets))
  }

  return {
    targets,
    updateTargets
  }
} 