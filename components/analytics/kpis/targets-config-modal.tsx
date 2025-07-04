"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Target, Info, Save, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export interface KPITargets {
  // Objetivos principales
  margenUtilidadMinimo: number      // % margen mínimo
  margenUtilidadObjetivo: number    // % margen objetivo
  margenUtilidadExcelente: number   // % margen excelente
  
  crecimientoMinimo: number         // % crecimiento mínimo
  crecimientoObjetivo: number       // % crecimiento objetivo
  crecimientoExcelente: number      // % crecimiento excelente
  
  eficienciaMinima: number          // % eficiencia mínima
  eficienciaObjetivo: number        // % eficiencia objetivo
  eficienciaExcelente: number       // % eficiencia excelente
  
  participacionMinima: number       // % participación mínima
  participacionObjetivo: number     // % participación objetivo
  participacionExcelente: number    // % participación excelente
  
  // Control de egresos
  egresosMaximo: number             // % máximo de egresos vs ingresos
  egresosObjetivo: number           // % objetivo de egresos vs ingresos
  egresosExcelente: number          // % excelente de egresos vs ingresos
  
  // ROI y productividad
  roiMinimo: number                 // % ROI mínimo
  roiObjetivo: number               // % ROI objetivo
  roiExcelente: number              // % ROI excelente
  
  // Liquidez
  liquidezMinima: number            // Ratio mínimo
  liquidezObjetivo: number          // Ratio objetivo
  liquidezExcelente: number         // Ratio excelente
  
  // Objetivos por planta (opcional)
  plantas: {
    [key: string]: {
      margenObjetivo: number
      crecimientoObjetivo: number
      eficienciaObjetivo: number
      participacionObjetivo: number
    }
  }
}

interface KPITargetsConfigModalProps {
  currentTargets: KPITargets
  onTargetsChange: (targets: KPITargets) => void
  totalIncome: number
  availablePlants: string[]
}

const DEFAULT_TARGETS: KPITargets = {
  // Margen de utilidad
  margenUtilidadMinimo: 5,      // 5% mínimo
  margenUtilidadObjetivo: 15,   // 15% objetivo
  margenUtilidadExcelente: 25,  // 25% excelente
  
  // Crecimiento
  crecimientoMinimo: 0,         // 0% mínimo (sin decrecimiento)
  crecimientoObjetivo: 8,       // 8% objetivo
  crecimientoExcelente: 15,     // 15% excelente
  
  // Eficiencia
  eficienciaMinima: 10,         // 10% mínimo
  eficienciaObjetivo: 20,       // 20% objetivo
  eficienciaExcelente: 30,      // 30% excelente
  
  // Participación
  participacionMinima: 10,      // 10% mínimo
  participacionObjetivo: 20,    // 20% objetivo
  participacionExcelente: 30,   // 30% excelente
  
  // Control de egresos
  egresosMaximo: 90,           // 90% máximo vs ingresos
  egresosObjetivo: 80,         // 80% objetivo vs ingresos
  egresosExcelente: 70,        // 70% excelente vs ingresos
  
  // ROI
  roiMinimo: 5,                // 5% mínimo
  roiObjetivo: 12,             // 12% objetivo
  roiExcelente: 20,            // 20% excelente
  
  // Liquidez
  liquidezMinima: 1.0,         // 1.0 mínimo
  liquidezObjetivo: 1.5,       // 1.5 objetivo
  liquidezExcelente: 2.0,      // 2.0 excelente
  
  // Objetivos por planta
  plantas: {
    "P1": {
      margenObjetivo: 18,
      crecimientoObjetivo: 10,
      eficienciaObjetivo: 22,
      participacionObjetivo: 25
    },
    "P2": {
      margenObjetivo: 20,
      crecimientoObjetivo: 8,
      eficienciaObjetivo: 25,
      participacionObjetivo: 30
    },
    "P3": {
      margenObjetivo: 22,
      crecimientoObjetivo: 12,
      eficienciaObjetivo: 28,
      participacionObjetivo: 20
    },
    "P4": {
      margenObjetivo: 16,
      crecimientoObjetivo: 6,
      eficienciaObjetivo: 20,
      participacionObjetivo: 15
    },
    "P5": {
      margenObjetivo: 15,
      crecimientoObjetivo: 5,
      eficienciaObjetivo: 18,
      participacionObjetivo: 10
    }
  }
}

export function KPITargetsConfigModal({ 
  currentTargets, 
  onTargetsChange, 
  totalIncome,
  availablePlants 
}: KPITargetsConfigModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempTargets, setTempTargets] = useState<KPITargets>(currentTargets)
  const { toast } = useToast()

  useEffect(() => {
    setTempTargets(currentTargets)
  }, [currentTargets])

  const handleSave = () => {
    // Validar que los targets sean coherentes
    if (tempTargets.margenUtilidadMinimo >= tempTargets.margenUtilidadObjetivo) {
      toast({
        title: "Error de Validación",
        description: "El margen mínimo debe ser menor al objetivo",
        variant: "destructive"
      })
      return
    }

    if (tempTargets.margenUtilidadObjetivo >= tempTargets.margenUtilidadExcelente) {
      toast({
        title: "Error de Validación",
        description: "El margen objetivo debe ser menor al excelente",
        variant: "destructive"
      })
      return
    }

    if (tempTargets.egresosExcelente >= tempTargets.egresosObjetivo) {
      toast({
        title: "Error de Validación",
        description: "Los egresos excelentes deben ser menores a los objetivos",
        variant: "destructive"
      })
      return
    }

    onTargetsChange(tempTargets)
    
    // Guardar en localStorage
    localStorage.setItem('kpiTargets', JSON.stringify(tempTargets))
    
    toast({
      title: "Objetivos Guardados",
      description: "Los objetivos de KPIs se han actualizado correctamente",
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

  const updateTarget = (key: keyof Omit<KPITargets, 'plantas'>, value: number) => {
    setTempTargets(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updatePlantTarget = (plant: string, key: string, value: number) => {
    setTempTargets(prev => ({
      ...prev,
      plantas: {
        ...prev.plantas,
        [plant]: {
          ...prev.plantas[plant],
          [key]: value
        }
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Configuración de Objetivos - KPIs
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información General */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Info className="w-5 h-5" />
                Información sobre Objetivos de KPIs
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800">
              <ul className="space-y-1">
                <li>• Los objetivos se organizan en tres niveles: <strong>Mínimo</strong>, <strong>Objetivo</strong> y <strong>Excelente</strong></li>
                <li>• El sistema clasifica automáticamente el desempeño basado en estos umbrales</li>
                <li>• Los valores deben ser progresivos: Mínimo &lt; Objetivo &lt; Excelente</li>
                <li>• Los objetivos por planta permiten metas específicas por ubicación</li>
                <li>• El <strong>crecimiento</strong> se calcula comparando períodos para reducir fluctuaciones</li>
              </ul>
            </CardContent>
          </Card>

          {/* Objetivos de Margen */}
          <Card>
            <CardHeader>
              <CardTitle>Margen de Utilidad (%)</CardTitle>
              <CardDescription>
                Define los umbrales para clasificar el margen de utilidad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="margenMinimo">Mínimo Aceptable</Label>
                  <Input
                    id="margenMinimo"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.margenUtilidadMinimo}
                    onChange={(e) => updateTarget('margenUtilidadMinimo', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margenObjetivo">Objetivo</Label>
                  <Input
                    id="margenObjetivo"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.margenUtilidadObjetivo}
                    onChange={(e) => updateTarget('margenUtilidadObjetivo', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margenExcelente">Excelente</Label>
                  <Input
                    id="margenExcelente"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.margenUtilidadExcelente}
                    onChange={(e) => updateTarget('margenUtilidadExcelente', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Objetivos de Crecimiento */}
          <Card>
            <CardHeader>
              <CardTitle>Crecimiento (%)</CardTitle>
              <CardDescription>
                Define los umbrales para clasificar el crecimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crecimientoMinimo">Mínimo Aceptable</Label>
                  <Input
                    id="crecimientoMinimo"
                    type="number"
                    min="-100"
                    max="100"
                    step="0.1"
                    value={tempTargets.crecimientoMinimo}
                    onChange={(e) => updateTarget('crecimientoMinimo', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crecimientoObjetivo">Objetivo</Label>
                  <Input
                    id="crecimientoObjetivo"
                    type="number"
                    min="-100"
                    max="100"
                    step="0.1"
                    value={tempTargets.crecimientoObjetivo}
                    onChange={(e) => updateTarget('crecimientoObjetivo', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crecimientoExcelente">Excelente</Label>
                  <Input
                    id="crecimientoExcelente"
                    type="number"
                    min="-100"
                    max="100"
                    step="0.1"
                    value={tempTargets.crecimientoExcelente}
                    onChange={(e) => updateTarget('crecimientoExcelente', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Objetivos de Eficiencia */}
          <Card>
            <CardHeader>
              <CardTitle>Eficiencia Operacional (%)</CardTitle>
              <CardDescription>
                Define los umbrales para clasificar la eficiencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eficienciaMinima">Mínimo Aceptable</Label>
                  <Input
                    id="eficienciaMinima"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.eficienciaMinima}
                    onChange={(e) => updateTarget('eficienciaMinima', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eficienciaObjetivo">Objetivo</Label>
                  <Input
                    id="eficienciaObjetivo"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.eficienciaObjetivo}
                    onChange={(e) => updateTarget('eficienciaObjetivo', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eficienciaExcelente">Excelente</Label>
                  <Input
                    id="eficienciaExcelente"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.eficienciaExcelente}
                    onChange={(e) => updateTarget('eficienciaExcelente', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Control de Egresos */}
          <Card>
            <CardHeader>
              <CardTitle>Control de Egresos (% vs Ingresos)</CardTitle>
              <CardDescription>
                Define los umbrales para el control de egresos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="egresosExcelente">Excelente Control</Label>
                  <Input
                    id="egresosExcelente"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.egresosExcelente}
                    onChange={(e) => updateTarget('egresosExcelente', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(totalIncome * tempTargets.egresosExcelente / 100)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="egresosObjetivo">Objetivo</Label>
                  <Input
                    id="egresosObjetivo"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.egresosObjetivo}
                    onChange={(e) => updateTarget('egresosObjetivo', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(totalIncome * tempTargets.egresosObjetivo / 100)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="egresosMaximo">Máximo Aceptable</Label>
                  <Input
                    id="egresosMaximo"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.egresosMaximo}
                    onChange={(e) => updateTarget('egresosMaximo', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(totalIncome * tempTargets.egresosMaximo / 100)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Objetivos por Planta */}
          <Card>
            <CardHeader>
              <CardTitle>Objetivos por Planta</CardTitle>
              <CardDescription>
                Define objetivos específicos para cada planta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availablePlants.map((plant) => (
                  <div key={plant} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">{plant}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${plant}-margen`}>Margen (%)</Label>
                        <Input
                          id={`${plant}-margen`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={tempTargets.plantas[plant]?.margenObjetivo || 0}
                          onChange={(e) => updatePlantTarget(plant, 'margenObjetivo', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${plant}-crecimiento`}>Crecimiento (%)</Label>
                        <Input
                          id={`${plant}-crecimiento`}
                          type="number"
                          min="-100"
                          max="100"
                          step="0.1"
                          value={tempTargets.plantas[plant]?.crecimientoObjetivo || 0}
                          onChange={(e) => updatePlantTarget(plant, 'crecimientoObjetivo', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${plant}-eficiencia`}>Eficiencia (%)</Label>
                        <Input
                          id={`${plant}-eficiencia`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={tempTargets.plantas[plant]?.eficienciaObjetivo || 0}
                          onChange={(e) => updatePlantTarget(plant, 'eficienciaObjetivo', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${plant}-participacion`}>Participación (%)</Label>
                        <Input
                          id={`${plant}-participacion`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={tempTargets.plantas[plant]?.participacionObjetivo || 0}
                          onChange={(e) => updatePlantTarget(plant, 'participacionObjetivo', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restablecer
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Guardar Objetivos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function useKPITargets() {
  const [targets, setTargets] = useState<KPITargets>(DEFAULT_TARGETS)

  useEffect(() => {
    // Cargar targets desde localStorage
    const savedTargets = localStorage.getItem('kpiTargets')
    if (savedTargets) {
      try {
        const parsedTargets = JSON.parse(savedTargets)
        setTargets(parsedTargets)
      } catch (error) {
        console.error('Error loading KPI targets:', error)
      }
    }
  }, [])

  const updateTargets = (newTargets: KPITargets) => {
    setTargets(newTargets)
    localStorage.setItem('kpiTargets', JSON.stringify(newTargets))
  }

  return {
    targets,
    updateTargets,
    defaultTargets: DEFAULT_TARGETS
  }
} 