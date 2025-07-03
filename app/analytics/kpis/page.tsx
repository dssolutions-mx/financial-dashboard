"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { SupabaseStorageService, FinancialReport } from "@/lib/supabase-storage"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadialBarChart, RadialBar, LineChart, Line } from "recharts"
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Factory,
  Percent,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface KPIMetric {
  id: string
  title: string
  value: string | number
  target?: number
  unit: string
  change: string
  trend: "up" | "down" | "neutral"
  status: "excellent" | "good" | "warning" | "critical"
  description: string
  icon: React.ComponentType<{ className?: string }>
}

interface PlantPerformance {
  planta: string
  businessUnit: string
  ingresos: number
  egresos: number
  utilidad: number
  margen: number
  eficiencia: number
  participacion: number
}

interface BusinessUnitPerformance {
  unit: string
  plants: string[]
  ingresos: number
  egresos: number
  utilidad: number
  margen: number
  participacion: number
}

interface CategoryBreakdown {
  name: string
  value: number
  percentage: number
  color: string
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

const UNIT_TO_PLANTS: Record<string, string[]> = {
  BAJIO: ["P1", "P5"],
  VIADUCTO: ["P2", "P4"], 
  ITISA: ["P3"],
  OTROS: ["SIN CLASIFICACION"]
}

export default function KPIsPage() {
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetric[]>([])
  const [plantPerformance, setPlantPerformance] = useState<PlantPerformance[]>([])
  const [businessUnitPerformance, setBusinessUnitPerformance] = useState<BusinessUnitPerformance[]>([])
  const [incomeBreakdown, setIncomeBreakdown] = useState<CategoryBreakdown[]>([])
  const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("3") // months
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const storageService = new SupabaseStorageService()
  const { toast } = useToast()

  useEffect(() => {
    loadKPIData()
  }, [selectedPeriod])

  const loadKPIData = async () => {
    try {
      setIsLoading(true)
      const allReports = await storageService.getFinancialReports()
      setReports(allReports)

      if (allReports.length === 0) {
        setIsLoading(false)
        return
      }

      // Get reports for the selected period (always use latest X reports)
      const periodsToAnalyze = parseInt(selectedPeriod)
      const reportsToAnalyze = allReports.slice(0, periodsToAnalyze)

      if (reportsToAnalyze.length === 0) {
        setIsLoading(false)
        return
      }

      // Load data for all selected reports
      const allData = []
      for (const report of reportsToAnalyze) {
        const reportData = await storageService.getFinancialData(report.id)
        allData.push({ report, data: reportData })
      }

      // Calculate KPIs from latest report
      const latestReportData = allData[0]
      const metrics = calculateKPIMetrics(latestReportData.data, latestReportData.report, allData)
      setKpiMetrics(metrics)

      // Calculate plant performance
      const plantPerf = calculatePlantPerformance(latestReportData.data)
      setPlantPerformance(plantPerf)

      // Calculate business unit performance
      const businessUnitPerf = calculateBusinessUnitPerformance(latestReportData.data)
      setBusinessUnitPerformance(businessUnitPerf)

      // Calculate category breakdowns
      const { income, expense } = calculateCategoryBreakdowns(latestReportData.data)
      setIncomeBreakdown(income)
      setExpenseBreakdown(expense)



    } catch (error) {
      console.error("Error loading KPI data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los KPIs",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateKPIMetrics = (data: any[], report: FinancialReport, allData: any[]): KPIMetric[] => {
    const ingresos = data
      .filter(row => row.tipo === "Ingresos")
      .reduce((sum, row) => sum + (row.monto || 0), 0)
    
    const egresos = Math.abs(data
      .filter(row => row.tipo === "Egresos")
      .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

    const utilidad = ingresos - egresos
    const margenUtilidad = ingresos > 0 ? (utilidad / ingresos) * 100 : 0

    // Calculate trends from multiple periods
    let ingresosChange = 0
    let egresoChange = 0
    let utilidadChange = 0
    let margenChange = 0

    if (allData.length > 1) {
      const previousData = allData[1].data
      const prevIngresos = previousData
        .filter((row: any) => row.tipo === "Ingresos")
        .reduce((sum: number, row: any) => sum + (row.monto || 0), 0)
      
      const prevEgresos = Math.abs(previousData
        .filter((row: any) => row.tipo === "Egresos")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0))
      
      const prevUtilidad = prevIngresos - prevEgresos
      const prevMargen = prevIngresos > 0 ? (prevUtilidad / prevIngresos) * 100 : 0

      ingresosChange = prevIngresos > 0 ? ((ingresos - prevIngresos) / prevIngresos) * 100 : 0
      egresoChange = prevEgresos > 0 ? ((egresos - prevEgresos) / prevEgresos) * 100 : 0
      utilidadChange = prevUtilidad !== 0 ? ((utilidad - prevUtilidad) / Math.abs(prevUtilidad)) * 100 : 0
      margenChange = margenUtilidad - prevMargen
    }

    // Calculate efficiency metrics
    const plantas = [...new Set(data.map(row => row.planta).filter(Boolean))]
    const eficienciaPromedio = plantas.length > 0 ? 
      plantas.reduce((sum, planta) => {
        const plantaData = data.filter(row => row.planta === planta)
        const plantaIngresos = plantaData
          .filter(row => row.tipo === "Ingresos")
          .reduce((sum, row) => sum + (row.monto || 0), 0)
        const plantaEgresos = Math.abs(plantaData
          .filter(row => row.tipo === "Egresos")
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))
        return sum + (plantaIngresos > 0 ? (plantaIngresos - plantaEgresos) / plantaIngresos : 0)
      }, 0) / plantas.length * 100 : 0

    // Calculate cost efficiency
    const costoEficiencia = egresos > 0 ? (ingresos / egresos) : 0

    return [
      {
        id: "ingresos",
        title: "Ingresos Totales",
        value: formatCompactCurrency(ingresos),
        unit: "",
        change: `${ingresosChange >= 0 ? '+' : ''}${ingresosChange.toFixed(1)}%`,
        trend: ingresosChange > 0 ? "up" : ingresosChange < 0 ? "down" : "neutral",
        status: ingresosChange > 5 ? "excellent" : ingresosChange > 0 ? "good" : ingresosChange > -5 ? "warning" : "critical",
        description: `Ingresos del período actual vs anterior`,
        icon: DollarSign
      },
      {
        id: "egresos",
        title: "Egresos Totales", 
        value: formatCompactCurrency(egresos),
        unit: "",
        change: `${egresoChange >= 0 ? '+' : ''}${egresoChange.toFixed(1)}%`,
        trend: egresoChange < 0 ? "up" : egresoChange > 0 ? "down" : "neutral",
        status: egresoChange < -5 ? "excellent" : egresoChange < 0 ? "good" : egresoChange < 5 ? "warning" : "critical",
        description: `Control de gastos vs período anterior`,
        icon: TrendingDown
      },
      {
        id: "utilidad",
        title: "Utilidad Neta",
        value: formatCompactCurrency(utilidad),
        unit: "",
        change: `${utilidadChange >= 0 ? '+' : ''}${utilidadChange.toFixed(1)}%`,
        trend: utilidadChange > 0 ? "up" : utilidadChange < 0 ? "down" : "neutral", 
        status: utilidadChange > 10 ? "excellent" : utilidadChange > 0 ? "good" : utilidadChange > -10 ? "warning" : "critical",
        description: `Rentabilidad neta del período`,
        icon: TrendingUp
      },
      {
        id: "margen",
        title: "Margen de Utilidad",
        value: margenUtilidad.toFixed(1),
        unit: "%",
        change: `${margenChange >= 0 ? '+' : ''}${margenChange.toFixed(1)}pp`,
        trend: margenChange > 0 ? "up" : margenChange < 0 ? "down" : "neutral",
        status: margenUtilidad > 20 ? "excellent" : margenUtilidad > 10 ? "good" : margenUtilidad > 5 ? "warning" : "critical",
        description: `Eficiencia en generación de utilidades`,
        icon: Percent,
        target: 15
      },
      {
        id: "eficiencia",
        title: "Eficiencia Operativa",
        value: eficienciaPromedio.toFixed(1),
        unit: "%", 
        change: "N/A",
        trend: "neutral",
        status: eficienciaPromedio > 15 ? "excellent" : eficienciaPromedio > 10 ? "good" : eficienciaPromedio > 5 ? "warning" : "critical",
        description: `Promedio de eficiencia por planta`,
        icon: Activity,
        target: 12
      },
      {
        id: "costo_eficiencia",
        title: "Eficiencia de Costos",
        value: costoEficiencia.toFixed(2),
        unit: "x",
        change: "N/A", 
        trend: "neutral",
        status: costoEficiencia > 1.5 ? "excellent" : costoEficiencia > 1.2 ? "good" : costoEficiencia > 1.0 ? "warning" : "critical",
        description: `Ratio ingresos/egresos`,
        icon: Target,
        target: 1.3
      }
    ]
  }

  const calculatePlantPerformance = (data: any[]): PlantPerformance[] => {
    const plantas = [...new Set(data.map((row: any) => row.planta).filter(Boolean))]
    
    const totalIngresos = data
      .filter((row: any) => row.tipo === "Ingresos")
      .reduce((sum: number, row: any) => sum + (row.monto || 0), 0)

    return plantas.map(planta => {
      const plantaData = data.filter((row: any) => row.planta === planta)
      
      const ingresos = plantaData
        .filter((row: any) => row.tipo === "Ingresos")
        .reduce((sum: number, row: any) => sum + (row.monto || 0), 0)
      
      const egresos = Math.abs(plantaData
        .filter((row: any) => row.tipo === "Egresos")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0))
      
      const utilidad = ingresos - egresos
      const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0
      const eficiencia = ingresos > 0 ? ((ingresos - egresos) / ingresos) * 100 : 0
      const participacion = totalIngresos > 0 ? (ingresos / totalIngresos) * 100 : 0

      return {
        planta,
        businessUnit: PLANT_TO_UNIT[planta] || "OTROS",
        ingresos,
        egresos,
        utilidad,
        margen,
        eficiencia,
        participacion
      }
    }).sort((a, b) => b.ingresos - a.ingresos)
  }

  const calculateBusinessUnitPerformance = (data: any[]): BusinessUnitPerformance[] => {
    return Object.entries(UNIT_TO_PLANTS).map(([unit, plants]) => {
      const unitData = data.filter((row: any) => plants.includes(row.planta))
      
      const ingresos = unitData
        .filter((row: any) => row.tipo === "Ingresos")
        .reduce((sum: number, row: any) => sum + (row.monto || 0), 0)
      
      const egresos = Math.abs(unitData
        .filter((row: any) => row.tipo === "Egresos")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0))
      
      const utilidad = ingresos - egresos
      const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0
      
      const totalIngresos = data
        .filter((row: any) => row.tipo === "Ingresos")
        .reduce((sum: number, row: any) => sum + (row.monto || 0), 0)
      const participacion = totalIngresos > 0 ? (ingresos / totalIngresos) * 100 : 0

      return {
        unit,
        plants,
        ingresos,
        egresos,
        utilidad,
        margen,
        participacion
      }
    }).sort((a, b) => b.ingresos - a.ingresos)
  }

  const calculateCategoryBreakdowns = (data: any[]) => {
    // Income breakdown by categoria_1
    const incomeData = data.filter((row: any) => row.tipo === "Ingresos")
    const incomeByCategory = incomeData.reduce((acc: Record<string, number>, row: any) => {
      const category = row.categoria_1 || "Sin Categoría"
      acc[category] = (acc[category] || 0) + (row.monto || 0)
      return acc
    }, {} as Record<string, number>)

    const totalIncome = Object.values(incomeByCategory).reduce((sum: number, val: number) => sum + val, 0)
    const incomeColors = ["#10b981", "#059669", "#047857", "#065f46", "#064e3b"]
    
    const income = Object.entries(incomeByCategory)
      .map(([name, value]: [string, number], index: number) => ({
        name,
        value,
        percentage: totalIncome > 0 ? (value / totalIncome) * 100 : 0,
        color: incomeColors[index % incomeColors.length]
      }))
      .sort((a, b) => b.value - a.value)

    // Expense breakdown by categoria_1
    const expenseData = data.filter((row: any) => row.tipo === "Egresos")
    const expenseByCategory = expenseData.reduce((acc: Record<string, number>, row: any) => {
      const category = row.categoria_1 || "Sin Categoría"
      acc[category] = (acc[category] || 0) + Math.abs(row.monto || 0)
      return acc
    }, {} as Record<string, number>)

    const totalExpense = Object.values(expenseByCategory).reduce((sum: number, val: number) => sum + val, 0)
    const expenseColors = ["#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d"]
    
    const expense = Object.entries(expenseByCategory)
      .map(([name, value]: [string, number], index: number) => ({
        name,
        value,
        percentage: totalExpense > 0 ? (value / totalExpense) * 100 : 0,
        color: expenseColors[index % expenseColors.length]
      }))
      .sort((a, b) => b.value - a.value)

    return { income, expense }
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

  // Add new function for axis formatting
  const formatAxisNumber = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K`
    }
    return value.toString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "bg-green-500"
      case "good": return "bg-blue-500"
      case "warning": return "bg-yellow-500"
      case "critical": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "excellent": return CheckCircle
      case "good": return Target
      case "warning": return AlertTriangle
      case "critical": return AlertTriangle
      default: return Activity
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return ArrowUpRight
      case "down": return ArrowDownRight
      case "neutral": return Minus
      default: return Minus
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up": return "text-green-600"
      case "down": return "text-red-600"
      case "neutral": return "text-gray-600"
      default: return "text-gray-600"
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando KPIs...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">KPIs y Métricas</h1>
            <p className="text-gray-600 mt-1">Indicadores clave de rendimiento y análisis financiero</p>
          </div>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Último mes</SelectItem>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {kpiMetrics.map((metric) => {
            const StatusIcon = getStatusIcon(metric.status)
            const TrendIcon = getTrendIcon(metric.trend)
            const MetricIcon = metric.icon

            return (
              <Card key={metric.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MetricIcon className="h-5 w-5 text-gray-600" />
                      <CardTitle className="text-sm font-medium text-gray-600">{metric.title}</CardTitle>
                    </div>
                    <StatusIcon className={`h-4 w-4 ${getStatusColor(metric.status).replace('bg-', 'text-')}`} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {metric.value}
                        <span className="text-sm font-normal text-gray-500 ml-1">{metric.unit}</span>
                      </div>
                      <div className={`flex items-center mt-1 ${getTrendColor(metric.trend)}`}>
                        <TrendIcon className="h-3 w-3 mr-1" />
                        <span className="text-xs font-medium">{metric.change}</span>
                      </div>
                    </div>
                    {metric.target && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Meta: {metric.target}{metric.unit}</div>
                        <Progress 
                          value={Math.min(100, (parseFloat(metric.value.toString()) / metric.target) * 100)} 
                          className="w-16 h-2 mt-1"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{metric.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>



        {/* Business Unit Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Rendimiento por Unidad de Negocio
              </CardTitle>
              <CardDescription>
                Análisis comparativo de unidades de negocio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={businessUnitPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="unit" fontSize={12} />
                    <YAxis tickFormatter={formatAxisNumber} fontSize={12} />
                    <Tooltip 
                      formatter={(value: number) => [formatCompactCurrency(value), '']}
                      contentStyle={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                    <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
                    <Bar dataKey="egresos" fill="#ef4444" name="Egresos" />
                    <Bar dataKey="utilidad" fill="#3b82f6" name="Utilidad" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Rendimiento por Planta
              </CardTitle>
              <CardDescription>
                Métricas de eficiencia y participación por planta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plantPerformance.slice(0, 6).map((plant, index) => (
                  <div key={plant.planta} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    {/* Header row with plant info */}
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-green-800">
                          {plant.planta.includes('SIN') ? 'SC' : plant.planta}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-lg truncate">
                          {plant.planta === 'SIN CLASIFICACION' ? 'SIN CLASIFICACIÓN' : plant.planta}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">{plant.businessUnit}</div>
                      </div>
                    </div>
                    
                    {/* Metrics grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="font-bold text-gray-900 text-lg">{formatCompactCurrency(plant.ingresos)}</div>
                        <div className="text-xs text-gray-500 font-medium">{plant.participacion.toFixed(1)}% participación</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-bold text-lg ${plant.margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {plant.margen.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500 font-medium">margen</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-gray-900 text-lg">{plant.eficiencia.toFixed(1)}%</div>
                        <div className="text-xs text-gray-500 font-medium">eficiencia</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Income Distribution */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Distribución de Ingresos
              </CardTitle>
              <CardDescription>
                Participación por categoría de ingresos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {incomeBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [formatCompactCurrency(value), '']}
                      contentStyle={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-3">
                {incomeBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-semibold text-gray-700">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{formatCompactCurrency(item.value)}</div>
                      <div className="text-xs text-gray-500 font-medium">{item.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Expense Distribution */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Distribución de Egresos
              </CardTitle>
              <CardDescription>
                Participación por categoría de gastos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [formatCompactCurrency(value), '']}
                      contentStyle={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-3">
                {expenseBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-semibold text-gray-700">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{formatCompactCurrency(item.value)}</div>
                      <div className="text-xs text-gray-500 font-medium">{item.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
} 