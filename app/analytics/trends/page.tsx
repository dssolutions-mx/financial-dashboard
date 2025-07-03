"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SupabaseStorageService, FinancialReport } from "@/lib/supabase-storage"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ComposedChart } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Activity, Calendar, Factory, Building2, Target, Percent } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TrendData {
  period: string
  fullDate: string
  ingresos: number
  egresos: number
  utilidad: number
  margen: number
  ingresosAcumulados: number
  egresosAcumulados: number
  utilidadAcumulada: number
  // Volume fields for future use
  volumenM3?: number
  volumenAcumulado?: number
  // Business unit breakdown
  bajioIngresos: number
  viaductoIngresos: number
  itisaIngresos: number
  // Cost efficiency
  materiaPrimaRatio: number
  costoOperativoRatio: number
}

interface BusinessUnitTrend {
  period: string
  BAJIO: number
  VIADUCTO: number
  ITISA: number
  OTROS: number
}

interface CostEfficiencyTrend {
  period: string
  materiaPrima: number
  costoOperativo: number
  costoFijo: number
  otros: number
  totalCostos: number
  eficiencia: number
}

interface KPICard {
  title: string
  value: string
  change: string
  trend: "up" | "down" | "neutral"
  icon: React.ComponentType<{ className?: string }>
}

// Business unit mapping
const PLANT_TO_UNIT: Record<string, string> = {
  P1: "BAJIO",
  P2: "VIADUCTO", 
  P3: "ITISA",
  P4: "VIADUCTO",
  P5: "BAJIO",
  "SIN CLASIFICACION": "OTROS"
}

export default function HistoricalTrendsPage() {
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [businessUnitTrends, setBusinessUnitTrends] = useState<BusinessUnitTrend[]>([])
  const [costEfficiencyTrends, setCostEfficiencyTrends] = useState<CostEfficiencyTrend[]>([])
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState("12")
  const [selectedView, setSelectedView] = useState<"monthly" | "quarterly" | "yearly">("monthly")
  const [selectedChart, setSelectedChart] = useState<"financial" | "businessUnit" | "efficiency">("financial")
  const [isLoading, setIsLoading] = useState(true)
  const [kpis, setKpis] = useState<KPICard[]>([])
  
  const storageService = new SupabaseStorageService()
  const { toast } = useToast()

  useEffect(() => {
    loadHistoricalData()
  }, [selectedPeriod, selectedView])

  const loadHistoricalData = async () => {
    try {
      setIsLoading(true)
      const allReports = await storageService.getFinancialReports()
      setReports(allReports)

      // Process historical data for trends
      const trends = await processHistoricalTrends(allReports)
      setTrendData(trends)
      
      // Process business unit trends
      const unitTrends = await processBusinessUnitTrends(allReports)
      setBusinessUnitTrends(unitTrends)

      // Process cost efficiency trends
      const costTrends = await processCostEfficiencyTrends(allReports)
      setCostEfficiencyTrends(costTrends)
      
      // Calculate KPIs
      const calculatedKpis = calculateKPIs(trends)
      setKpis(calculatedKpis)

    } catch (error) {
      console.error("Error loading historical data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos históricos",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const processHistoricalTrends = async (allReports: FinancialReport[]): Promise<TrendData[]> => {
    const trendsMap = new Map<string, {
      ingresos: number; egresos: number; 
      bajioIngresos: number; viaductoIngresos: number; itisaIngresos: number;
      materiaPrima: number; costoOperativo: number;
      count: number; fullDate: string;
    }>()
    
    // Group reports by period
    for (const report of allReports) {
      let periodKey: string
      
      if (selectedView === "yearly") {
        periodKey = report.year.toString()
      } else if (selectedView === "quarterly") {
        const quarter = Math.ceil(report.month / 3)
        periodKey = `Q${quarter} ${report.year}`
      } else {
        periodKey = `${String(report.month).padStart(2, '0')}/${report.year}`
      }

      try {
        const reportData = await storageService.getFinancialData(report.id)
        
        const ingresos = reportData
          .filter(row => row.tipo === "Ingresos")
          .reduce((sum, row) => sum + (row.monto || 0), 0)
        
        const egresos = Math.abs(reportData
          .filter(row => row.tipo === "Egresos")
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

        // Business unit breakdown
        const bajioIngresos = reportData
          .filter(row => row.tipo === "Ingresos" && ["P1", "P5"].includes(row.planta))
          .reduce((sum, row) => sum + (row.monto || 0), 0)
        
        const viaductoIngresos = reportData
          .filter(row => row.tipo === "Ingresos" && ["P2", "P4"].includes(row.planta))
          .reduce((sum, row) => sum + (row.monto || 0), 0)
        
        const itisaIngresos = reportData
          .filter(row => row.tipo === "Ingresos" && row.planta === "P3")
          .reduce((sum, row) => sum + (row.monto || 0), 0)

        // Cost breakdown
        const materiaPrima = Math.abs(reportData
          .filter(row => row.tipo === "Egresos" && row.clasificacion === "Materia prima")
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

        const costoOperativo = Math.abs(reportData
          .filter(row => row.tipo === "Egresos" && row.clasificacion === "Costo Operativo")
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

        if (trendsMap.has(periodKey)) {
          const existing = trendsMap.get(periodKey)!
          existing.ingresos += ingresos
          existing.egresos += egresos
          existing.bajioIngresos += bajioIngresos
          existing.viaductoIngresos += viaductoIngresos
          existing.itisaIngresos += itisaIngresos
          existing.materiaPrima += materiaPrima
          existing.costoOperativo += costoOperativo
          existing.count += 1
        } else {
          trendsMap.set(periodKey, { 
            ingresos, egresos, bajioIngresos, viaductoIngresos, itisaIngresos,
            materiaPrima, costoOperativo, count: 1,
            fullDate: `${report.year}-${String(report.month).padStart(2, '0')}-01`
          })
        }
      } catch (error) {
        console.error(`Error processing report ${report.id}:`, error)
      }
    }

    // Convert to array and calculate derived metrics with accumulated values
    const trends: TrendData[] = Array.from(trendsMap.entries())
      .map(([period, data]) => ({
        period,
        fullDate: data.fullDate,
        ingresos: data.ingresos / data.count,
        egresos: data.egresos / data.count,
        utilidad: (data.ingresos - data.egresos) / data.count,
        margen: data.ingresos > 0 ? ((data.ingresos - data.egresos) / data.ingresos) * 100 : 0,
        bajioIngresos: data.bajioIngresos / data.count,
        viaductoIngresos: data.viaductoIngresos / data.count,
        itisaIngresos: data.itisaIngresos / data.count,
        materiaPrimaRatio: data.ingresos > 0 ? (data.materiaPrima / data.ingresos) * 100 : 0,
        costoOperativoRatio: data.ingresos > 0 ? (data.costoOperativo / data.ingresos) * 100 : 0,
        // Accumulated values will be calculated below
        ingresosAcumulados: 0,
        egresosAcumulados: 0,
        utilidadAcumulada: 0
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate))
      .slice(-parseInt(selectedPeriod))

    // Calculate accumulated values
    let ingresosAcum = 0
    let egresosAcum = 0
    let utilidadAcum = 0

    trends.forEach(trend => {
      ingresosAcum += trend.ingresos
      egresosAcum += trend.egresos
      utilidadAcum += trend.utilidad
      
      trend.ingresosAcumulados = ingresosAcum
      trend.egresosAcumulados = egresosAcum
      trend.utilidadAcumulada = utilidadAcum
    })

    return trends
  }

  const processBusinessUnitTrends = async (allReports: FinancialReport[]): Promise<BusinessUnitTrend[]> => {
    const trendsMap = new Map<string, { BAJIO: number; VIADUCTO: number; ITISA: number; OTROS: number; count: number }>()
    
    for (const report of allReports) {
      let periodKey: string
      
      if (selectedView === "yearly") {
        periodKey = report.year.toString()
      } else if (selectedView === "quarterly") {
        const quarter = Math.ceil(report.month / 3)
        periodKey = `Q${quarter} ${report.year}`
      } else {
        periodKey = `${String(report.month).padStart(2, '0')}/${report.year}`
      }

      try {
        const reportData = await storageService.getFinancialData(report.id)
        
        const unitData = { BAJIO: 0, VIADUCTO: 0, ITISA: 0, OTROS: 0 }
        
        reportData
          .filter(row => row.tipo === "Ingresos")
          .forEach(row => {
            const unit = PLANT_TO_UNIT[row.planta] || "OTROS"
            unitData[unit as keyof typeof unitData] += row.monto || 0
          })

        if (trendsMap.has(periodKey)) {
          const existing = trendsMap.get(periodKey)!
          existing.BAJIO += unitData.BAJIO
          existing.VIADUCTO += unitData.VIADUCTO
          existing.ITISA += unitData.ITISA
          existing.OTROS += unitData.OTROS
          existing.count += 1
        } else {
          trendsMap.set(periodKey, { ...unitData, count: 1 })
        }
      } catch (error) {
        console.error(`Error processing report ${report.id}:`, error)
      }
    }

    return Array.from(trendsMap.entries())
      .map(([period, data]) => ({
        period,
        BAJIO: data.BAJIO / data.count,
        VIADUCTO: data.VIADUCTO / data.count,
        ITISA: data.ITISA / data.count,
        OTROS: data.OTROS / data.count
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-parseInt(selectedPeriod))
  }

  const processCostEfficiencyTrends = async (allReports: FinancialReport[]): Promise<CostEfficiencyTrend[]> => {
    const trendsMap = new Map<string, {
      materiaPrima: number; costoOperativo: number; costoFijo: number; otros: number;
      totalIngresos: number; count: number;
    }>()
    
    for (const report of allReports) {
      let periodKey: string
      
      if (selectedView === "yearly") {
        periodKey = report.year.toString()
      } else if (selectedView === "quarterly") {
        const quarter = Math.ceil(report.month / 3)
        periodKey = `Q${quarter} ${report.year}`
      } else {
        periodKey = `${String(report.month).padStart(2, '0')}/${report.year}`
      }

      try {
        const reportData = await storageService.getFinancialData(report.id)
        
        const ingresos = reportData
          .filter(row => row.tipo === "Ingresos")
          .reduce((sum, row) => sum + (row.monto || 0), 0)

        const materiaPrima = Math.abs(reportData
          .filter(row => row.tipo === "Egresos" && row.clasificacion === "Materia prima")
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

        const costoOperativo = Math.abs(reportData
          .filter(row => row.tipo === "Egresos" && row.clasificacion === "Costo Operativo")
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

        const costoFijo = Math.abs(reportData
          .filter(row => row.tipo === "Egresos" && row.clasificacion === "Costo Fijo")
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

        const otros = Math.abs(reportData
          .filter(row => row.tipo === "Egresos" && !["Materia prima", "Costo Operativo", "Costo Fijo"].includes(row.clasificacion))
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

        if (trendsMap.has(periodKey)) {
          const existing = trendsMap.get(periodKey)!
          existing.materiaPrima += materiaPrima
          existing.costoOperativo += costoOperativo
          existing.costoFijo += costoFijo
          existing.otros += otros
          existing.totalIngresos += ingresos
          existing.count += 1
        } else {
          trendsMap.set(periodKey, { materiaPrima, costoOperativo, costoFijo, otros, totalIngresos: ingresos, count: 1 })
        }
      } catch (error) {
        console.error(`Error processing report ${report.id}:`, error)
      }
    }

    return Array.from(trendsMap.entries())
      .map(([period, data]) => {
        const avgIngresos = data.totalIngresos / data.count
        const totalCostos = (data.materiaPrima + data.costoOperativo + data.costoFijo + data.otros) / data.count
        return {
          period,
          materiaPrima: data.materiaPrima / data.count,
          costoOperativo: data.costoOperativo / data.count,
          costoFijo: data.costoFijo / data.count,
          otros: data.otros / data.count,
          totalCostos,
          eficiencia: avgIngresos > 0 ? ((avgIngresos - totalCostos) / avgIngresos) * 100 : 0
        }
      })
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-parseInt(selectedPeriod))
  }

  const calculateKPIs = (trends: TrendData[]): KPICard[] => {
    if (trends.length < 2) return []

    const latest = trends[trends.length - 1]
    const previous = trends[trends.length - 2]

    const ingresosChange = ((latest.ingresos - previous.ingresos) / previous.ingresos) * 100
    const egresosChange = ((latest.egresos - previous.egresos) / previous.egresos) * 100
    const utilidadChange = previous.utilidad !== 0 ? ((latest.utilidad - previous.utilidad) / Math.abs(previous.utilidad)) * 100 : 0
    const margenChange = latest.margen - previous.margen

    // Calculate growth rates
    const periods = trends.length
    const firstPeriod = trends[0]
    const avgGrowthRate = periods > 1 ? 
      Math.pow(latest.ingresos / firstPeriod.ingresos, 1 / (periods - 1)) - 1 : 0

    // Calculate accumulated totals
    const accumulatedUtilidad = latest.utilidadAcumulada
    const accumulatedIngresos = latest.ingresosAcumulados

    return [
      {
        title: "Ingresos Mensuales",
        value: formatCompactCurrency(latest.ingresos),
        change: `${ingresosChange >= 0 ? '+' : ''}${ingresosChange.toFixed(1)}%`,
        trend: ingresosChange > 0 ? "up" : ingresosChange < 0 ? "down" : "neutral",
        icon: DollarSign
      },
      {
        title: "Utilidad Acumulada",
        value: formatCompactCurrency(accumulatedUtilidad),
        change: accumulatedUtilidad >= 0 ? "Positiva" : "Negativa",
        trend: accumulatedUtilidad > 0 ? "up" : accumulatedUtilidad < 0 ? "down" : "neutral",
        icon: TrendingUp
      },
      {
        title: "Margen Actual",
        value: `${latest.margen.toFixed(1)}%`,
        change: `${margenChange >= 0 ? '+' : ''}${margenChange.toFixed(1)}pp`,
        trend: margenChange > 0 ? "up" : margenChange < 0 ? "down" : "neutral",
        icon: Percent
      },
      {
        title: "Crecimiento Promedio",
        value: `${(avgGrowthRate * 100).toFixed(1)}%`,
        change: "Anualizado",
        trend: avgGrowthRate > 0 ? "up" : avgGrowthRate < 0 ? "down" : "neutral",
        icon: Target
      },
      {
        title: "Eficiencia Materias Primas",
        value: `${latest.materiaPrimaRatio.toFixed(1)}%`,
        change: `${latest.materiaPrimaRatio <= 45 ? 'Óptimo' : latest.materiaPrimaRatio <= 50 ? 'Bueno' : 'Alto'}`,
        trend: latest.materiaPrimaRatio <= 45 ? "up" : "down",
        icon: Activity
      },
      {
        title: "Ingresos Totales Período",
        value: formatCompactCurrency(accumulatedIngresos),
        change: `${periods} ${periods === 1 ? 'mes' : 'meses'}`,
        trend: "neutral",
        icon: Calendar
      }
    ]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return formatCurrency(amount)
  }

  const formatVolume = (volume: number) => {
    return new Intl.NumberFormat("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(volume)
  }

  const formatTooltipValue = (value: number) => {
    return formatCompactCurrency(value)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return TrendingUp
      case "down": return TrendingDown
      default: return Activity
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up": return "text-green-600"
      case "down": return "text-red-600"
      default: return "text-gray-600"
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando tendencias históricas...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tendencias Históricas</h1>
            <p className="text-gray-600 mt-1">Análisis de evolución financiera y operativa</p>
          </div>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <Select value={selectedView} onValueChange={(value: "monthly" | "quarterly" | "yearly") => setSelectedView(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 períodos</SelectItem>
                <SelectItem value="12">12 períodos</SelectItem>
                <SelectItem value="24">24 períodos</SelectItem>
                <SelectItem value="36">36 períodos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedChart} onValueChange={(value: "financial" | "businessUnit" | "efficiency") => setSelectedChart(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="financial">Financiero</SelectItem>
                <SelectItem value="businessUnit">Unidades</SelectItem>
                <SelectItem value="efficiency">Eficiencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((kpi, index) => {
            const TrendIcon = getTrendIcon(kpi.trend)
            const IconComponent = kpi.icon
            
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <IconComponent className="h-4 w-4 text-gray-500" />
                    <TrendIcon className={`h-4 w-4 ${getTrendColor(kpi.trend)}`} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{kpi.title}</p>
                    <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
                    <p className={`text-xs ${getTrendColor(kpi.trend)}`}>{kpi.change}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Main Trends Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {selectedChart === "financial" && "Rendimiento Financiero Acumulado"}
                  {selectedChart === "businessUnit" && "Tendencias por Unidad de Negocio"}
                  {selectedChart === "efficiency" && "Análisis de Eficiencia de Costos"}
                </CardTitle>
                <CardDescription>
                  {selectedChart === "financial" && "Evolución acumulada de ingresos, egresos y utilidad"}
                  {selectedChart === "businessUnit" && "Rendimiento comparativo de unidades de negocio"}
                  {selectedChart === "efficiency" && "Estructura y eficiencia de costos"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                {(() => {
                  if (selectedChart === "financial") {
                    return (
                      <ComposedChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="period" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            name.includes('Acumulad') ? formatCompactCurrency(value) : formatCompactCurrency(value),
                            name
                          ]}
                          labelFormatter={(label) => `Período: ${label}`}
                        />
                        <Legend />
                        
                        {/* Monthly bars */}
                        <Bar yAxisId="left" dataKey="ingresos" fill="#10b981" name="Ingresos Mensuales" opacity={0.7} />
                        <Bar yAxisId="left" dataKey="egresos" fill="#ef4444" name="Egresos Mensuales" opacity={0.7} />
                        
                        {/* Accumulated lines */}
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="ingresosAcumulados" 
                          stroke="#059669" 
                          strokeWidth={3}
                          name="Ingresos Acumulados"
                          dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="egresosAcumulados" 
                          stroke="#dc2626" 
                          strokeWidth={3}
                          name="Egresos Acumulados"
                          dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="utilidadAcumulada" 
                          stroke="#3b82f6" 
                          strokeWidth={4}
                          name="Utilidad Acumulada"
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                        />
                      </ComposedChart>
                    )
                  } else if (selectedChart === "businessUnit") {
                    return (
                      <AreaChart data={businessUnitTrends}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [formatCompactCurrency(value), '']} />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="BAJIO" 
                          stackId="1" 
                          stroke="#10b981" 
                          fill="#10b981" 
                          name="BAJIO"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="VIADUCTO" 
                          stackId="1" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          name="VIADUCTO"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="ITISA" 
                          stackId="1" 
                          stroke="#8b5cf6" 
                          fill="#8b5cf6" 
                          name="ITISA"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="OTROS" 
                          stackId="1" 
                          stroke="#f59e0b" 
                          fill="#f59e0b" 
                          name="OTROS"
                        />
                      </AreaChart>
                    )
                  } else {
                    return (
                      <ComposedChart data={costEfficiencyTrends}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="period" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            name === 'Eficiencia' ? `${value.toFixed(1)}%` : formatCompactCurrency(value),
                            name
                          ]}
                        />
                        <Legend />
                        
                        <Bar yAxisId="left" dataKey="materiaPrima" fill="#ef4444" name="Materia Prima" />
                        <Bar yAxisId="left" dataKey="costoOperativo" fill="#f59e0b" name="Costo Operativo" />
                        <Bar yAxisId="left" dataKey="costoFijo" fill="#6b7280" name="Costo Fijo" />
                        <Bar yAxisId="left" dataKey="otros" fill="#9ca3af" name="Otros" />
                        
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="eficiencia" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          name="Eficiencia (%)"
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        />
                      </ComposedChart>
                    )
                  }
                })()}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Evolution */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolución Mensual de Utilidad y Margen
              </CardTitle>
              <CardDescription>
                Análisis de rentabilidad mensual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'Margen' ? `${value.toFixed(1)}%` : formatCompactCurrency(value),
                        name
                      ]}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="utilidad" fill="#3b82f6" name="Utilidad" />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="margen" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      name="Margen (%)"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Volume Analysis - Prepared for future */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Análisis de Volúmenes
              </CardTitle>
              <CardDescription>
                Métricas de volumen de producción (Próximamente)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <Factory className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Datos de Volúmenes Próximamente</h3>
                  <p className="text-gray-600 max-w-sm">
                    Esta sección mostrará el análisis de volúmenes de concreto una vez que los datos estén disponibles.
                  </p>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      🚀 Preparado para integración automática de datos de volúmenes (m³)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
} 