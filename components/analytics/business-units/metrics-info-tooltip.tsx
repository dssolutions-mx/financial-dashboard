"use client"

import { HelpCircle, Calculator, Target, TrendingUp, Users, DollarSign, Building2, Award, Crown, AlertTriangle, Activity } from "lucide-react"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface MetricsInfoTooltipProps {
  type: 'margen' | 'participacion' | 'eficiencia' | 'crecimiento' | 'estado' | 'competitividad' | 'tendencias' | 'ranking' | 'general'
  className?: string
}

export function MetricsInfoTooltip({ type, className = "" }: MetricsInfoTooltipProps) {
  const getTooltipContent = () => {
    switch (type) {
      case 'margen':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-green-700">Margen de Utilidad</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Fórmula:</strong> ((Ingresos - Egresos) / Ingresos) × 100</p>
              <p><strong>Interpretación:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">≥20%:</span> Excelente rentabilidad</li>
                <li>• <span className="text-blue-600">15-19%:</span> Buena rentabilidad</li>
                <li>• <span className="text-yellow-600">10-14%:</span> Rentabilidad promedio</li>
                <li>• <span className="text-red-600">&lt;10%:</span> Requiere atención</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Mide qué porcentaje de los ingresos se convierte en utilidad después de cubrir todos los gastos.
              </p>
            </div>
          </div>
        )

      case 'participacion':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-blue-700">Participación de Mercado</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Fórmula:</strong> (Ingresos Unidad / Ingresos Totales) × 100</p>
              <p><strong>Interpretación:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">≥25%:</span> Posición líder</li>
                <li>• <span className="text-blue-600">15-24%:</span> Posición fuerte</li>
                <li>• <span className="text-yellow-600">10-14%:</span> Posición promedio</li>
                <li>• <span className="text-red-600">&lt;10%:</span> Posición débil</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Indica el porcentaje de ingresos totales que aporta cada unidad de negocio.
              </p>
            </div>
          </div>
        )

      case 'eficiencia':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold text-purple-700">Eficiencia Operacional</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Fórmula:</strong> ((Ingresos - Egresos) / Ingresos) × 100</p>
              <p><strong>Interpretación:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">≥25%:</span> Muy eficiente</li>
                <li>• <span className="text-blue-600">20-24%:</span> Eficiente</li>
                <li>• <span className="text-yellow-600">15-19%:</span> Moderadamente eficiente</li>
                <li>• <span className="text-red-600">&lt;15%:</span> Poco eficiente</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Mide qué tan bien la unidad convierte ingresos en utilidad operacional.
              </p>
            </div>
          </div>
        )

      case 'crecimiento':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-green-700">Crecimiento Promedio</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Metodología:</strong> Compara el promedio de ingresos de los períodos más recientes con los anteriores</p>
              <p><strong>Cálculo:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• Se divide el período total en dos mitades</li>
                <li>• Se calcula el promedio de cada mitad</li>
                <li>• Se compara: ((Promedio Reciente - Promedio Anterior) / Promedio Anterior) × 100</li>
                <li>• Si hay pocos datos, compara último mes vs anterior</li>
              </ul>
              <p><strong>Interpretación:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">≥10%:</span> Crecimiento excelente</li>
                <li>• <span className="text-blue-600">5-9%:</span> Crecimiento bueno</li>
                <li>• <span className="text-yellow-600">0-4%:</span> Crecimiento lento</li>
                <li>• <span className="text-red-600">&lt;0%:</span> Decrecimiento</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Este método reduce el impacto de fluctuaciones mensuales y muestra la tendencia real de crecimiento.
              </p>
            </div>
          </div>
        )

      case 'estado':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-blue-700">Estado de Unidad de Negocio</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Clasificación Automática:</strong></p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-3 h-3 text-yellow-600" />
                  <span className="font-medium">Líder:</span>
                  <span className="text-xs">Margen ≥20% Y Participación ≥25%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-3 h-3 text-green-600" />
                  <span className="font-medium">Excelente:</span>
                  <span className="text-xs">Margen ≥15% Y Participación ≥15%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-blue-600" />
                  <span className="font-medium">Promedio:</span>
                  <span className="text-xs">Rentable pero no excelente</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  <span className="font-medium">Atención:</span>
                  <span className="text-xs">Margen &lt;10% O Participación &lt;10%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Estado calculado automáticamente basado en margen y participación.
              </p>
            </div>
          </div>
        )

      case 'competitividad':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold text-purple-700">Matriz de Competitividad</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Sistema de Puntuación (0-100 pts):</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Rentabilidad:</strong> 25% margen = 100 pts</li>
                <li>• <strong>Eficiencia:</strong> 30% eficiencia = 100 pts</li>
                <li>• <strong>Crecimiento:</strong> +20% = 100 pts, 0% = 50 pts</li>
                <li>• <strong>Participación:</strong> 50% mercado = 100 pts</li>
              </ul>
              <p><strong>Ventajas del nuevo método:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• Escalas fijas basadas en benchmarks empresariales</li>
                <li>• Fácil interpretación y comparación</li>
                <li>• Puntuación global = promedio de 4 dimensiones</li>
                <li>• Valores reales mostrados junto con puntos</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Cada unidad tiene un dashboard individual que muestra fortalezas y áreas de mejora específicas.
              </p>
            </div>
          </div>
        )

      case 'tendencias':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-green-700">Análisis de Tendencias</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Qué Muestra:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• Evolución temporal de ingresos por unidad</li>
                <li>• Patrones estacionales o cíclicos</li>
                <li>• Cambios en posición relativa</li>
                <li>• Momentum de crecimiento</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Permite identificar unidades con tendencias positivas o negativas para tomar decisiones estratégicas.
              </p>
            </div>
          </div>
        )

      case 'ranking':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-blue-700">Ranking y Posición</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Criterio de Ordenamiento:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Primario:</strong> Ingresos totales</li>
                <li>• <strong>Secundario:</strong> Margen de utilidad</li>
                <li>• <strong>Terciario:</strong> Participación de mercado</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                El ranking se actualiza automáticamente y refleja el desempeño relativo entre unidades.
              </p>
            </div>
          </div>
        )

      case 'general':
        return (
          <div className="space-y-3 max-w-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-blue-700">Análisis de Unidades de Negocio</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Objetivo:</strong> Evaluar y comparar el desempeño de las diferentes unidades de negocio.</p>
              <p><strong>Métricas Clave:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Margen:</strong> Rentabilidad operacional</li>
                <li>• <strong>Participación:</strong> Peso en ingresos totales</li>
                <li>• <strong>Eficiencia:</strong> Conversión de ingresos a utilidad</li>
                <li>• <strong>Crecimiento:</strong> Evolución temporal</li>
                <li>• <strong>Estado:</strong> Clasificación automática</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Este análisis permite identificar unidades líderes, oportunidades de mejora y estrategias de optimización.
              </p>
            </div>
          </div>
        )

      default:
        return <div>Información no disponible</div>
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={`w-4 h-4 text-muted-foreground hover:text-foreground cursor-help ${className}`} />
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-none">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Componente de información completa para el final de la página
export function BusinessUnitsInfoSection() {
  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          Guía de Interpretación - Unidades de Negocio
        </CardTitle>
        <CardDescription>
          Comprenda cómo interpretar las métricas y tomar decisiones estratégicas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3">📊 Métricas Principales</h4>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Margen de Utilidad:</strong> Porcentaje de ingresos que se convierte en utilidad. 
                Mayor margen indica mejor eficiencia de costos.
              </div>
              <div>
                <strong>Participación de Mercado:</strong> Porcentaje de ingresos totales que aporta cada unidad. 
                Indica el peso relativo en el negocio.
              </div>
              <div>
                <strong>Eficiencia Operacional:</strong> Capacidad de convertir ingresos en utilidad. 
                Refleja la gestión operativa de la unidad.
              </div>
                             <div>
                 <strong>Crecimiento:</strong> Compara el promedio de ingresos de períodos recientes vs anteriores. 
                 Reduce fluctuaciones mensuales y muestra la tendencia real de crecimiento.
               </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">🎯 Estados de Unidades</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-600" />
                <strong>Líder:</strong> Alta rentabilidad y participación dominante
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-green-600" />
                <strong>Excelente:</strong> Buen balance entre rentabilidad y participación
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <strong>Promedio:</strong> Rentable pero con oportunidades de mejora
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <strong>Atención:</strong> Requiere intervención estratégica urgente
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">📈 Análisis de Tendencias</h4>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Crecimiento Sostenido:</strong> Unidades que mantienen crecimiento positivo consistente.
              </div>
              <div>
                <strong>Volatilidad:</strong> Unidades con fluctuaciones significativas requieren análisis de causas.
              </div>
              <div>
                <strong>Estacionalidad:</strong> Patrones recurrentes que permiten planificación estratégica.
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">💡 Estrategias Recomendadas</h4>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Unidades Líderes:</strong> Mantener posición, explorar expansión.
              </div>
              <div>
                <strong>Unidades Promedio:</strong> Identificar oportunidades de optimización.
              </div>
              <div>
                <strong>Unidades en Declive:</strong> Evaluar reestructuración o desinversión.
              </div>
              <div>
                <strong>Unidades Emergentes:</strong> Considerar inversión adicional para crecimiento.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-yellow-600" />
            <span className="font-semibold text-yellow-800">Configuración de Objetivos</span>
          </div>
          <p className="text-sm text-yellow-700">
            Utilice el botón "Configurar Objetivos" para establecer metas específicas por unidad de negocio. 
            Los objetivos personalizados mejoran la precisión del análisis y permiten evaluaciones más relevantes 
            para su estrategia empresarial.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 