"use client"

import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MetricsInfoTooltipProps {
  metricType: "efficiency" | "target" | "variance" | "general"
  customContent?: React.ReactNode
}

const tooltipContent = {
  efficiency: {
    title: "Cálculo de Eficiencia",
    content: (
      <div className="space-y-2">
        <p className="font-medium">Fórmula: (Objetivo - Costo Real) / Objetivo × 100</p>
        <div className="text-sm space-y-1">
          <p><strong>Interpretación:</strong></p>
          <p>• <span className="text-green-600">Positivo:</span> Estás por debajo del objetivo (bueno)</p>
          <p>• <span className="text-red-600">Negativo:</span> Estás por encima del objetivo (requiere atención)</p>
          <p>• <span className="text-blue-600">Cero:</span> Cumples exactamente el objetivo</p>
        </div>
        <div className="text-sm mt-2">
          <p><strong>Ejemplo:</strong></p>
          <p>Objetivo: $100,000 | Real: $80,000</p>
          <p>Eficiencia: (100,000 - 80,000) / 100,000 × 100 = 20%</p>
        </div>
      </div>
    )
  },
  target: {
    title: "Objetivos de Costos",
    content: (
      <div className="space-y-2">
        <p className="font-medium">Los objetivos se expresan como % del ingreso total</p>
        <div className="text-sm space-y-1">
          <p><strong>Propósito:</strong></p>
          <p>• Establecer metas realistas de control de costos</p>
          <p>• Identificar desviaciones tempranamente</p>
          <p>• Medir el desempeño operativo</p>
        </div>
        <div className="text-sm mt-2">
          <p><strong>Configuración:</strong></p>
          <p>Usa "Configurar Objetivos" para personalizar las metas según tu operación</p>
        </div>
      </div>
    )
  },
  variance: {
    title: "Varianza vs Objetivo",
    content: (
      <div className="space-y-2">
        <p className="font-medium">Diferencia entre el costo real y el objetivo</p>
        <div className="text-sm space-y-1">
          <p><strong>Cálculo:</strong> Costo Real - Objetivo</p>
          <p>• <span className="text-green-600">Negativo:</span> Ahorro respecto al objetivo</p>
          <p>• <span className="text-red-600">Positivo:</span> Sobrecosto respecto al objetivo</p>
        </div>
        <div className="text-sm mt-2">
          <p><strong>Uso:</strong></p>
          <p>Identifica rápidamente las categorías que requieren atención inmediata</p>
        </div>
      </div>
    )
  },
  general: {
    title: "Análisis de Costos",
    content: (
      <div className="space-y-2">
        <p className="font-medium">Sistema integral de control de costos</p>
        <div className="text-sm space-y-1">
          <p><strong>Características:</strong></p>
          <p>• Objetivos configurables por categoría</p>
          <p>• Análisis de tendencias históricas</p>
          <p>• Comparación por plantas y unidades de negocio</p>
          <p>• Alertas automáticas por desviaciones</p>
        </div>
        <div className="text-sm mt-2">
          <p><strong>Beneficios:</strong></p>
          <p>• Control proactivo de costos</p>
          <p>• Identificación temprana de problemas</p>
          <p>• Toma de decisiones basada en datos</p>
        </div>
      </div>
    )
  }
}

export function MetricsInfoTooltip({ metricType, customContent }: MetricsInfoTooltipProps) {
  const content = customContent || tooltipContent[metricType]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 transition-colors">
            <Info className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <div className="space-y-2">
            {typeof content === 'object' && 'title' in content ? (
              <>
                <p className="font-semibold">{content.title}</p>
                {content.content}
              </>
            ) : (
              content
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Tooltips específicos para métricas comunes
export function EfficiencyTooltip() {
  return <MetricsInfoTooltip metricType="efficiency" />
}

export function TargetTooltip() {
  return <MetricsInfoTooltip metricType="target" />
}

export function VarianceTooltip() {
  return <MetricsInfoTooltip metricType="variance" />
}

export function GeneralInfoTooltip() {
  return <MetricsInfoTooltip metricType="general" />
} 