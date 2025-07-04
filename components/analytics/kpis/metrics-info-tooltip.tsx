"use client"

import { HelpCircle, Calculator, Target, TrendingUp, DollarSign, Building2, Activity, Percent, Factory, AlertTriangle, CheckCircle } from "lucide-react"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface MetricsInfoTooltipProps {
  type: 'ingresos' | 'margen' | 'eficiencia' | 'crecimiento' | 'participacion' | 'utilidad' | 'egresos' | 'roi' | 'productividad' | 'liquidez' | 'general'
  className?: string
}

export function MetricsInfoTooltip({ type, className = "" }: MetricsInfoTooltipProps) {
  const getTooltipContent = () => {
    switch (type) {
      case 'ingresos':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-green-700">Ingresos Totales</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Cálculo:</strong> Ingresos fiscales + ventas en efectivo</p>
              <p><strong>Crecimiento (metodología mejorada):</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• Con ≥4 períodos: compara promedios de mitades</li>
                <li>• Con &lt;4 períodos: compara período actual vs anterior</li>
                <li>• Reduce volatilidad y muestra tendencias reales</li>
              </ul>
              <p><strong>Interpretación (configurable):</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">Excelente:</span> Según objetivo configurado</li>
                <li>• <span className="text-blue-600">Bueno:</span> Por encima del mínimo</li>
                <li>• <span className="text-yellow-600">Advertencia:</span> Cerca del mínimo</li>
                <li>• <span className="text-red-600">Crítico:</span> Por debajo del mínimo</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Mide el volumen total de ventas y la capacidad de generar ingresos. La metodología de crecimiento se adapta automáticamente a los datos disponibles.
              </p>
            </div>
          </div>
        )

      case 'margen':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-blue-700">Margen de Utilidad</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Fórmula:</strong> ((Ingresos - Egresos) / Ingresos) × 100</p>
              <p><strong>Interpretación:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">≥25%:</span> Excelente rentabilidad</li>
                <li>• <span className="text-blue-600">15-24%:</span> Buena rentabilidad</li>
                <li>• <span className="text-yellow-600">5-14%:</span> Rentabilidad promedio</li>
                <li>• <span className="text-red-600">&lt;5%:</span> Rentabilidad crítica</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Indica qué porcentaje de los ingresos se convierte en utilidad después de cubrir costos.
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
              <p><strong>Fórmula:</strong> (Utilidad / Ingresos) × 100</p>
              <p><strong>Interpretación:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">≥30%:</span> Muy eficiente</li>
                <li>• <span className="text-blue-600">20-29%:</span> Eficiente</li>
                <li>• <span className="text-yellow-600">10-19%:</span> Moderadamente eficiente</li>
                <li>• <span className="text-red-600">&lt;10%:</span> Poco eficiente</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Mide la capacidad de convertir ingresos en utilidad de manera eficiente.
              </p>
            </div>
          </div>
        )

      case 'crecimiento':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-green-700">Crecimiento</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Metodología Mejorada:</strong> Análisis comparativo inteligente</p>
              <p><strong>Con ≥4 períodos (Robusto):</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• Divide datos en dos mitades (reciente vs anterior)</li>
                <li>• Calcula promedio de cada mitad</li>
                <li>• Compara: ((Promedio Reciente - Promedio Anterior) / Promedio Anterior) × 100</li>
                <li>• <strong>Ventaja:</strong> Reduce volatilidad mensual</li>
              </ul>
              <p><strong>Con &lt;4 períodos (Fallback):</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• Compara período actual vs anterior directamente</li>
                <li>• Menos robusto pero más actualizado</li>
              </ul>
              <p><strong>Interpretación (configurable):</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">Excelente:</span> Según objetivo configurado</li>
                <li>• <span className="text-blue-600">Bueno:</span> Por encima del mínimo</li>
                <li>• <span className="text-yellow-600">Advertencia:</span> Cerca del mínimo</li>
                <li>• <span className="text-red-600">Crítico:</span> Por debajo del mínimo</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                La metodología se adapta automáticamente a la cantidad de datos disponibles, priorizando estabilidad cuando es posible.
              </p>
            </div>
          </div>
        )

      case 'participacion':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-blue-700">Participación de Mercado</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Fórmula:</strong> (Ingresos Unidad / Ingresos Totales) × 100</p>
              <p><strong>Interpretación:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">≥30%:</span> Posición dominante</li>
                <li>• <span className="text-blue-600">20-29%:</span> Posición fuerte</li>
                <li>• <span className="text-yellow-600">10-19%:</span> Posición promedio</li>
                <li>• <span className="text-red-600">&lt;10%:</span> Posición débil</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Indica el porcentaje de participación de cada unidad en el mercado total.
              </p>
            </div>
          </div>
        )

      case 'utilidad':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-green-700">Utilidad Neta</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Fórmula:</strong> Ingresos - Egresos</p>
              <p><strong>Interpretación:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">Positivo:</span> Negocio rentable</li>
                <li>• <span className="text-red-600">Negativo:</span> Pérdidas operativas</li>
                <li>• <span className="text-blue-600">Tendencia:</span> Más importante que valor absoluto</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Beneficio final después de cubrir todos los costos y gastos operativos.
              </p>
            </div>
          </div>
        )

      case 'egresos':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h4 className="font-semibold text-red-700">Egresos Totales</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Componentes:</strong> Costos operativos + Gastos administrativos + Otros</p>
              <p><strong>Control:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">≤70% ingresos:</span> Control excelente</li>
                <li>• <span className="text-blue-600">70-80% ingresos:</span> Control bueno</li>
                <li>• <span className="text-yellow-600">80-90% ingresos:</span> Atención necesaria</li>
                <li>• <span className="text-red-600">≥90% ingresos:</span> Control crítico</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Monitoreo constante es clave para mantener rentabilidad y sostenibilidad.
              </p>
            </div>
          </div>
        )

      case 'roi':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold text-purple-700">Retorno de Inversión (ROI)</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Fórmula:</strong> (Utilidad / Inversión) × 100</p>
              <p><strong>Interpretación:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">≥20%:</span> Retorno excelente</li>
                <li>• <span className="text-blue-600">10-19%:</span> Retorno bueno</li>
                <li>• <span className="text-yellow-600">5-9%:</span> Retorno promedio</li>
                <li>• <span className="text-red-600">&lt;5%:</span> Retorno bajo</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Mide la efectividad de las inversiones realizadas en términos de rentabilidad.
              </p>
            </div>
          </div>
        )

      case 'productividad':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <Factory className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-blue-700">Productividad</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Fórmula:</strong> Ingresos / Número de empleados (o recursos)</p>
              <p><strong>Interpretación:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">Alto:</span> Recursos bien aprovechados</li>
                <li>• <span className="text-blue-600">Medio:</span> Eficiencia estándar</li>
                <li>• <span className="text-yellow-600">Bajo:</span> Oportunidades de mejora</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Indica la eficiencia con la que se utilizan los recursos para generar ingresos.
              </p>
            </div>
          </div>
        )

      case 'liquidez':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-green-700">Liquidez</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Fórmula:</strong> Activos Corrientes / Pasivos Corrientes</p>
              <p><strong>Interpretación:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• <span className="text-green-600">≥2.0:</span> Liquidez excelente</li>
                <li>• <span className="text-blue-600">1.5-1.9:</span> Liquidez buena</li>
                <li>• <span className="text-yellow-600">1.0-1.4:</span> Liquidez justa</li>
                <li>• <span className="text-red-600">&lt;1.0:</span> Problemas de liquidez</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Capacidad de la empresa para cubrir sus obligaciones a corto plazo.
              </p>
            </div>
          </div>
        )

      case 'general':
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-blue-700">KPIs y Métricas Clave</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Sistema Integral:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• Monitoreo en tiempo real de métricas clave</li>
                <li>• Objetivos configurables por métrica</li>
                <li>• Análisis de tendencias y comparaciones</li>
                <li>• Alertas automáticas por desviaciones</li>
              </ul>
              <p><strong>Beneficios:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• Toma de decisiones basada en datos</li>
                <li>• Identificación temprana de problemas</li>
                <li>• Seguimiento de objetivos estratégicos</li>
                <li>• Optimización continua del desempeño</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Panel de control ejecutivo para monitorear la salud financiera del negocio.
              </p>
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-blue-700">Información de Métrica</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p>Información detallada sobre esta métrica.</p>
            </div>
          </div>
        )
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 transition-colors ${className}`}>
            <HelpCircle className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function KPIsInfoSection() {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Target className="w-5 h-5" />
          Indicadores Clave de Rendimiento (KPIs)
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-blue-800">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">¿Qué son los KPIs?</h4>
            <p>Los KPIs son métricas que miden el desempeño de aspectos críticos del negocio. Cada KPI tiene objetivos configurables y se actualiza automáticamente con los datos más recientes.</p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Características del Sistema:</h4>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Objetivos Configurables:</strong> Establece metas específicas para cada KPI</li>
              <li>• <strong>Seguimiento de Tendencias:</strong> Monitora la evolución histórica</li>
              <li>• <strong>Alertas Automáticas:</strong> Notifica desviaciones significativas</li>
              <li>• <strong>Análisis Multidimensional:</strong> Por plantas, unidades y períodos</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Cómo Usar:</h4>
            <ul className="space-y-1 text-xs">
              <li>• Haz clic en los íconos de información para ver detalles de cada métrica</li>
              <li>• Configura objetivos usando el botón "Configurar Objetivos"</li>
              <li>• Monitorea los colores de estado: verde (excelente), azul (bueno), amarillo (atención), rojo (crítico)</li>
              <li>• Analiza tendencias para identificar patrones y oportunidades</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 