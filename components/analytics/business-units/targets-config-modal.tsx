"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Target, Info, Save, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export interface BusinessUnitTargets {
  // Objetivos generales para clasificaciones
  margenExcelente: number        // % mínimo para ser "excelente"
  margenBueno: number           // % mínimo para ser "bueno"
  participacionLider: number    // % mínimo para ser "líder"
  participacionBuena: number    // % mínimo para ser "buena"
  crecimientoExcelente: number  // % mínimo de crecimiento para "excelente"
  eficienciaMinima: number      // % mínimo de eficiencia operacional
  
  // Objetivos específicos por unidad de negocio
  unidades: {
    [key: string]: {
      margenObjetivo: number      // % margen objetivo para la unidad
      participacionObjetivo: number // % participación objetivo
      crecimientoObjetivo: number   // % crecimiento objetivo
      eficienciaObjetivo: number    // % eficiencia objetivo
    }
  }
}

interface BusinessUnitTargetsConfigModalProps {
  currentTargets: BusinessUnitTargets
  onTargetsChange: (targets: BusinessUnitTargets) => void
  totalIncome: number
  availableUnits: string[]
}

const DEFAULT_TARGETS: BusinessUnitTargets = {
  // Umbrales generales
  margenExcelente: 20,      // 20% o más es excelente
  margenBueno: 15,          // 15% o más es bueno
  participacionLider: 25,   // 25% o más es líder
  participacionBuena: 15,   // 15% o más es buena participación
  crecimientoExcelente: 10, // 10% o más es excelente crecimiento
  eficienciaMinima: 12,     // 12% mínimo de eficiencia operacional
  
  // Objetivos por unidad
  unidades: {
    BAJIO: {
      margenObjetivo: 22,
      participacionObjetivo: 35,
      crecimientoObjetivo: 12,
      eficienciaObjetivo: 25
    },
    VIADUCTO: {
      margenObjetivo: 25,
      participacionObjetivo: 30,
      crecimientoObjetivo: 8,
      eficienciaObjetivo: 23
    },
    ITISA: {
      margenObjetivo: 28,
      participacionObjetivo: 20,
      crecimientoObjetivo: 15,
      eficienciaObjetivo: 27
    },
    OTROS: {
      margenObjetivo: 15,
      participacionObjetivo: 15,
      crecimientoObjetivo: 5,
      eficienciaObjetivo: 15
    }
  }
}

const UNIT_NAMES = {
  BAJIO: "Bajío",
  VIADUCTO: "Viaducto", 
  ITISA: "ITISA",
  OTROS: "Otros"
}

export function BusinessUnitTargetsConfigModal({ 
  currentTargets, 
  onTargetsChange, 
  totalIncome,
  availableUnits 
}: BusinessUnitTargetsConfigModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempTargets, setTempTargets] = useState<BusinessUnitTargets>(currentTargets)
  const { toast } = useToast()

  useEffect(() => {
    setTempTargets(currentTargets)
  }, [currentTargets])

  const handleSave = () => {
    // Validar que los targets sean razonables
    if (tempTargets.margenExcelente <= tempTargets.margenBueno) {
      toast({
        title: "Error de Validación",
        description: "El margen excelente debe ser mayor al margen bueno",
        variant: "destructive"
      })
      return
    }

    if (tempTargets.participacionLider <= tempTargets.participacionBuena) {
      toast({
        title: "Error de Validación", 
        description: "La participación líder debe ser mayor a la participación buena",
        variant: "destructive"
      })
      return
    }

    onTargetsChange(tempTargets)
    
    // Guardar en localStorage
    localStorage.setItem('businessUnitTargets', JSON.stringify(tempTargets))
    
    toast({
      title: "Objetivos Guardados",
      description: "Los objetivos de unidades de negocio se han actualizado correctamente",
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

  const updateGeneralTarget = (key: keyof Omit<BusinessUnitTargets, 'unidades'>, value: number) => {
    setTempTargets(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateUnitTarget = (unit: string, key: string, value: number) => {
    setTempTargets(prev => ({
      ...prev,
      unidades: {
        ...prev.unidades,
        [unit]: {
          ...prev.unidades[unit],
          [key]: value
        }
      }
    }))
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
            Configuración de Objetivos - Unidades de Negocio
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información General */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Info className="w-5 h-5" />
                Información sobre Objetivos de Unidades de Negocio
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800">
              <ul className="space-y-1">
                <li>• Los <strong>umbrales generales</strong> determinan la clasificación automática de estados</li>
                <li>• Los <strong>objetivos por unidad</strong> establecen metas específicas para cada negocio</li>
                <li>• El <strong>estado</strong> se calcula combinando margen y participación de mercado</li>
                <li>• La <strong>eficiencia</strong> mide qué tan bien convierte ingresos en utilidad</li>
                <li>• El <strong>crecimiento</strong> compara el período actual con el anterior</li>
              </ul>
            </CardContent>
          </Card>

          {/* Umbrales Generales */}
          <Card>
            <CardHeader>
              <CardTitle>Umbrales de Clasificación</CardTitle>
              <CardDescription>
                Define los criterios para clasificar automáticamente el estado de las unidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="margenExcelente">Margen Excelente (%)</Label>
                  <Input
                    id="margenExcelente"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.margenExcelente}
                    onChange={(e) => updateGeneralTarget('margenExcelente', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Mínimo para estado "Líder"</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="margenBueno">Margen Bueno (%)</Label>
                  <Input
                    id="margenBueno"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.margenBueno}
                    onChange={(e) => updateGeneralTarget('margenBueno', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Mínimo para estado "Excelente"</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="participacionLider">Participación Líder (%)</Label>
                  <Input
                    id="participacionLider"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.participacionLider}
                    onChange={(e) => updateGeneralTarget('participacionLider', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Mínimo para estado "Líder"</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="participacionBuena">Participación Buena (%)</Label>
                  <Input
                    id="participacionBuena"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.participacionBuena}
                    onChange={(e) => updateGeneralTarget('participacionBuena', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Mínimo para estado "Excelente"</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crecimientoExcelente">Crecimiento Excelente (%)</Label>
                  <Input
                    id="crecimientoExcelente"
                    type="number"
                    min="-100"
                    max="1000"
                    step="0.1"
                    value={tempTargets.crecimientoExcelente}
                    onChange={(e) => updateGeneralTarget('crecimientoExcelente', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Mínimo para crecimiento excelente</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eficienciaMinima">Eficiencia Mínima (%)</Label>
                  <Input
                    id="eficienciaMinima"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tempTargets.eficienciaMinima}
                    onChange={(e) => updateGeneralTarget('eficienciaMinima', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Eficiencia operacional mínima</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Objetivos por Unidad */}
          <Card>
            <CardHeader>
              <CardTitle>Objetivos Específicos por Unidad de Negocio</CardTitle>
              <CardDescription>
                Define metas particulares para cada unidad según su estrategia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {availableUnits.map(unit => (
                  <div key={unit} className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold mb-4 text-lg">{UNIT_NAMES[unit as keyof typeof UNIT_NAMES] || unit}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Margen Objetivo (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={tempTargets.unidades[unit]?.margenObjetivo || 0}
                          onChange={(e) => updateUnitTarget(unit, 'margenObjetivo', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Participación Objetivo (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={tempTargets.unidades[unit]?.participacionObjetivo || 0}
                          onChange={(e) => updateUnitTarget(unit, 'participacionObjetivo', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Crecimiento Objetivo (%)</Label>
                        <Input
                          type="number"
                          min="-100"
                          max="1000"
                          step="0.1"
                          value={tempTargets.unidades[unit]?.crecimientoObjetivo || 0}
                          onChange={(e) => updateUnitTarget(unit, 'crecimientoObjetivo', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Eficiencia Objetivo (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={tempTargets.unidades[unit]?.eficienciaObjetivo || 0}
                          onChange={(e) => updateUnitTarget(unit, 'eficienciaObjetivo', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lógica de Estados */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle>Lógica de Clasificación de Estados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="font-bold text-yellow-700 mb-1">🏆 Líder</div>
                  <p className="text-yellow-800">
                    Margen ≥ {tempTargets.margenExcelente}% Y Participación ≥ {tempTargets.participacionLider}%
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="font-bold text-green-700 mb-1">⭐ Excelente</div>
                  <p className="text-green-800">
                    Margen ≥ {tempTargets.margenBueno}% Y Participación ≥ {tempTargets.participacionBuena}%
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="font-bold text-blue-700 mb-1">📊 Promedio</div>
                  <p className="text-blue-800">
                    No cumple criterios de excelente pero es rentable
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="font-bold text-red-700 mb-1">⚠️ Atención</div>
                  <p className="text-red-800">
                    Margen &lt; 10% O Participación &lt; 10%
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

// Hook para manejar los targets de unidades de negocio
export function useBusinessUnitTargets() {
  const [targets, setTargets] = useState<BusinessUnitTargets>(DEFAULT_TARGETS)

  useEffect(() => {
    // Cargar targets desde localStorage
    const savedTargets = localStorage.getItem('businessUnitTargets')
    if (savedTargets) {
      try {
        const parsedTargets = JSON.parse(savedTargets)
        setTargets(parsedTargets)
      } catch (error) {
        console.error('Error loading saved business unit targets:', error)
      }
    }
  }, [])

  const updateTargets = (newTargets: BusinessUnitTargets) => {
    setTargets(newTargets)
    localStorage.setItem('businessUnitTargets', JSON.stringify(newTargets))
  }

  return {
    targets,
    updateTargets
  }
} 