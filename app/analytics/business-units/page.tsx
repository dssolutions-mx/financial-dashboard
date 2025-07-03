"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { SupabaseStorageService, FinancialReport } from "@/lib/supabase/storage"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Area, AreaChart, PieChart, Pie, Cell } from "recharts"
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  AlertTriangle,
  DollarSign,
  Factory,
  Users,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Crown,
  Activity,
  PieChart as PieChartIcon
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BusinessUnitMetrics {
  unit: string
  plants: string[]
  ingresos: number
  egresos: number
  utilidad: number
  margenUtilidad: number
  participacionMercado: number
  eficienciaOperacional: number
  costoPorUnidad: number
  crecimiento: number
  rank: number
  status: "leader" | "good" | "average" | "needs_attention"
  color: string
}

interface PlantComparison {
  planta: string
  unit: string
  ingresos: number
  egresos: number
  utilidad: number
  margen: number
  eficiencia: number
  participacion: number
  costosUnitarios: number
}

interface UnitTrend {
  period: string
  BAJIO: number
  VIADUCTO: number
  ITISA: number
  OTROS: number
}

interface CompetitivenessMatrix {
  unit: string
  profitability: number
  efficiency: number
  growth: number
  marketShare: number
  overall: number
}

interface KPIComparison {
  metric: string
  BAJIO: number
  VIADUCTO: number
  ITISA: number
  OTROS: number
  best: string
  worst: string
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

// Unit colors and characteristics
const UNIT_CONFIG = {
  BAJIO: { 
    color: "#10b981", 
    name: "Bajío", 
    description: "Zona centro con alta demanda",
    target: "Líder en volumen y eficiencia"
  },
  VIADUCTO: { 
    color: "#3b82f6", 
    name: "Viaducto", 
    description: "Zona metropolitana estratégica",
    target: "Alta rentabilidad por ubicación"
  },
  ITISA: { 
    color: "#8b5cf6", 
    name: "ITISA", 
    description: "Operación especializada",
    target: "Nichos de alto valor agregado"
  },
  OTROS: { 
    color: "#f59e0b", 
    name: "Otros", 
    description: "Operaciones diversas",
    target: "Optimización y consolidación"
  }
}

export default function BusinessUnitsPage() {
  const [businessUnitMetrics, setBusinessUnitMetrics] = useState<BusinessUnitMetrics[]>([])
  const [plantComparison, setPlantComparison] = useState<PlantComparison[]>([])
  const [unitTrends, setUnitTrends] = useState<UnitTrend[]>([])
  const [competitivenessMatrix, setCompetitivenessMatrix] = useState<CompetitivenessMatrix[]>([])
  const [kpiComparison, setKpiComparison] = useState<KPIComparison[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("6")
  const [selectedMetric, setSelectedMetric] = useState<string>("ingresos")
  const [selectedView, setSelectedView] = useState<"overview" | "trends" | "comparison" | "performance">("overview")
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const storageService = new SupabaseStorageService()
  const { toast } = useToast()

  useEffect(() => {
    loadBusinessUnitAnalysis()
  }, [selectedPeriod])

  const loadBusinessUnitAnalysis = async () => {
    try {
      setIsLoading(true)
      const allReports = await storageService.getFinancialReports()
      setReports(allReports)

      if (allReports.length === 0) {
        setIsLoading(false)
        return
      }

      // Get reports for the selected period
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

      // Calculate business unit analysis
      await calculateBusinessUnitAnalysis(allData)

    } catch (error) {
      console.error("Error loading business unit analysis:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el análisis de unidades de negocio",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateBusinessUnitAnalysis = async (allData: any[]) => {
    if (allData.length === 0) return

    // Aggregate data from all reports in the selected timeframe
    const aggregatedData = aggregateReportsData(allData)

    // Calculate metrics from aggregated data
    const unitMetrics = calculateUnitMetrics(aggregatedData, allData)
    setBusinessUnitMetrics(unitMetrics)

    // Calculate plant comparison using aggregated data
    const plantComp = calculatePlantComparison(aggregatedData)
    setPlantComparison(plantComp)

    // Calculate trends
    const trends = calculateUnitTrends(allData)
    setUnitTrends(trends)

    // Calculate competitiveness matrix
    const competitiveness = calculateCompetitivenessMatrix(unitMetrics)
    setCompetitivenessMatrix(competitiveness)

    // Calculate KPI comparison
    const kpiComp = calculateKPIComparison(unitMetrics)
    setKpiComparison(kpiComp)
  }

  // New function to aggregate data from multiple reports
  const aggregateReportsData = (allData: any[]) => {
    const aggregated: Record<string, any> = {}
    
    allData.forEach(({ data }) => {
      data.forEach((row: any) => {
        const key = `${row.tipo}-${row.planta}-${row.categoria_1}-${row.categoria_2}-${row.categoria_3}-${row.cuenta}`
        
        if (aggregated[key]) {
          aggregated[key].monto += (row.monto || 0)
        } else {
          aggregated[key] = {
            ...row,
            monto: row.monto || 0
          }
        }
      })
    })
    
    return Object.values(aggregated)
  }

  const calculateUnitMetrics = (currentData: any[], allData: any[]): BusinessUnitMetrics[] => {
    const unitData = new Map<string, {
      ingresos: number; egresos: number; plantas: Set<string>;
    }>()
    
    // Calculate current period metrics
    currentData.forEach(row => {
      const planta = row.planta || "SIN CLASIFICACION"
      const unit = PLANT_TO_UNIT[planta] || "OTROS"
      
      if (!unitData.has(unit)) {
        unitData.set(unit, { ingresos: 0, egresos: 0, plantas: new Set() })
      }
      
      const current = unitData.get(unit)!
      current.plantas.add(planta)
      
      if (row.tipo === "Ingresos") {
        current.ingresos += row.monto || 0
      } else if (row.tipo === "Egresos") {
        current.egresos += Math.abs(row.monto || 0)
      }
    })

    const totalIngresos = Array.from(unitData.values()).reduce((sum, unit) => sum + unit.ingresos, 0)
    
    // Calculate growth rates from historical data
    const growthRates = calculateGrowthRates(allData)
    
    return Array.from(unitData.entries())
      .map(([unit, data], index) => {
        const utilidad = data.ingresos - data.egresos
        const margenUtilidad = data.ingresos > 0 ? (utilidad / data.ingresos) * 100 : 0
        const participacionMercado = totalIngresos > 0 ? (data.ingresos / totalIngresos) * 100 : 0
        const costoPorUnidad = data.ingresos > 0 ? data.egresos / data.ingresos : 0
        const eficienciaOperacional = data.ingresos > 0 ? ((data.ingresos - data.egresos) / data.ingresos) * 100 : 0
        const crecimiento = growthRates[unit] || 0
        
        // Determine status based on performance
        let status: "leader" | "good" | "average" | "needs_attention" = "average"
        if (margenUtilidad >= 20 && participacionMercado >= 25) status = "leader"
        else if (margenUtilidad >= 15 && participacionMercado >= 15) status = "good"
        else if (margenUtilidad < 10 || participacionMercado < 10) status = "needs_attention"
        
        return {
          unit,
          plants: Array.from(data.plantas),
          ingresos: data.ingresos,
          egresos: data.egresos,
          utilidad,
          margenUtilidad,
          participacionMercado,
          eficienciaOperacional,
          costoPorUnidad,
          crecimiento,
          rank: index + 1, // Will be recalculated
          status,
          color: UNIT_CONFIG[unit as keyof typeof UNIT_CONFIG]?.color || "#6b7280"
        }
      })
      .sort((a, b) => b.ingresos - a.ingresos)
      .map((unit, index) => ({ ...unit, rank: index + 1 }))
  }

  const calculateGrowthRates = (allData: any[]): Record<string, number> => {
    if (allData.length < 2) return {}
    
    const currentPeriod = allData[0].data
    const previousPeriod = allData[1].data
    
    const getCurrentUnitIncome = (data: any[], unit: string) => {
      return data
        .filter(row => row.tipo === "Ingresos" && PLANT_TO_UNIT[row.planta] === unit)
        .reduce((sum, row) => sum + (row.monto || 0), 0)
    }
    
    const growthRates: Record<string, number> = {}
    
    Object.keys(UNIT_CONFIG).forEach(unit => {
      const current = getCurrentUnitIncome(currentPeriod, unit)
      const previous = getCurrentUnitIncome(previousPeriod, unit)
      
      if (previous > 0) {
        growthRates[unit] = ((current - previous) / previous) * 100
      }
    })
    
    return growthRates
  }

  const calculatePlantComparison = (data: any[]): PlantComparison[] => {
    const plantData = new Map<string, { ingresos: number; egresos: number }>()
    
    data.forEach(row => {
      const planta = row.planta || "SIN CLASIFICACION"
      if (!plantData.has(planta)) {
        plantData.set(planta, { ingresos: 0, egresos: 0 })
      }
      
      const current = plantData.get(planta)!
      if (row.tipo === "Ingresos") {
        current.ingresos += row.monto || 0
      } else if (row.tipo === "Egresos") {
        current.egresos += Math.abs(row.monto || 0)
      }
    })

    const totalIngresos = Array.from(plantData.values()).reduce((sum, p) => sum + p.ingresos, 0)
    
    return Array.from(plantData.entries())
      .map(([planta, data]) => {
        const utilidad = data.ingresos - data.egresos
        const margen = data.ingresos > 0 ? (utilidad / data.ingresos) * 100 : 0
        const eficiencia = data.ingresos > 0 ? ((data.ingresos - data.egresos) / data.ingresos) * 100 : 0
        const participacion = totalIngresos > 0 ? (data.ingresos / totalIngresos) * 100 : 0
        const costosUnitarios = data.ingresos > 0 ? data.egresos / data.ingresos : 0

        return {
          planta,
          unit: PLANT_TO_UNIT[planta] || "OTROS",
          ingresos: data.ingresos,
          egresos: data.egresos,
          utilidad,
          margen,
          eficiencia,
          participacion,
          costosUnitarios
        }
      })
      .sort((a, b) => b.ingresos - a.ingresos)
  }

  const calculateUnitTrends = (allData: any[]): UnitTrend[] => {
    return allData.map(({ report, data }) => {
      const unitIncome = { BAJIO: 0, VIADUCTO: 0, ITISA: 0, OTROS: 0 }
      
      data
        .filter((row: any) => row.tipo === "Ingresos")
        .forEach((row: any) => {
          const unit = PLANT_TO_UNIT[row.planta] || "OTROS"
          unitIncome[unit as keyof typeof unitIncome] += row.monto || 0
        })

      return {
        period: `${String(report.month).padStart(2, '0')}/${report.year}`,
        ...unitIncome
      }
    }).reverse()
  }

  const calculateCompetitivenessMatrix = (unitMetrics: BusinessUnitMetrics[]): CompetitivenessMatrix[] => {
    return unitMetrics.map(unit => {
      // Normalize metrics to 0-100 scale
      const maxIngresos = Math.max(...unitMetrics.map(u => u.ingresos))
      const maxMargen = Math.max(...unitMetrics.map(u => u.margenUtilidad))
      const maxEficiencia = Math.max(...unitMetrics.map(u => u.eficienciaOperacional))
      const maxCrecimiento = Math.max(...unitMetrics.map(u => u.crecimiento))
      
      const profitability = maxMargen > 0 ? (unit.margenUtilidad / maxMargen) * 100 : 0
      const efficiency = maxEficiencia > 0 ? (unit.eficienciaOperacional / maxEficiencia) * 100 : 0
      const growth = maxCrecimiento > 0 ? Math.max(0, (unit.crecimiento / maxCrecimiento) * 100) : 0
      const marketShare = unit.participacionMercado
      const overall = (profitability + efficiency + growth + marketShare) / 4
      
      return {
        unit: unit.unit,
        profitability,
        efficiency,
        growth,
        marketShare,
        overall
      }
    })
  }

  const calculateKPIComparison = (unitMetrics: BusinessUnitMetrics[]): KPIComparison[] => {
    const metrics = [
      {
        metric: "Ingresos (M)",
        values: unitMetrics.reduce((acc, unit) => ({ ...acc, [unit.unit]: unit.ingresos / 1000000 }), {} as any)
      },
      {
        metric: "Margen (%)",
        values: unitMetrics.reduce((acc, unit) => ({ ...acc, [unit.unit]: unit.margenUtilidad }), {} as any)
      },
      {
        metric: "Participación (%)",
        values: unitMetrics.reduce((acc, unit) => ({ ...acc, [unit.unit]: unit.participacionMercado }), {} as any)
      },
      {
        metric: "Eficiencia (%)",
        values: unitMetrics.reduce((acc, unit) => ({ ...acc, [unit.unit]: unit.eficienciaOperacional }), {} as any)
      },
      {
        metric: "Crecimiento (%)",
        values: unitMetrics.reduce((acc, unit) => ({ ...acc, [unit.unit]: unit.crecimiento }), {} as any)
      }
    ]

    return metrics.map(m => {
      const values = Object.values(m.values) as number[]
      const maxValue = Math.max(...values)
      const minValue = Math.min(...values)
      const maxUnit = Object.keys(m.values).find(key => m.values[key] === maxValue) || ""
      const minUnit = Object.keys(m.values).find(key => m.values[key] === minValue) || ""
      
      return {
        metric: m.metric,
        BAJIO: m.values.BAJIO || 0,
        VIADUCTO: m.values.VIADUCTO || 0,
        ITISA: m.values.ITISA || 0,
        OTROS: m.values.OTROS || 0,
        best: maxUnit,
        worst: minUnit
      }
    })
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

  const formatAxisNumber = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K`
    }
    return value.toString()
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "leader": 
        return { 
          icon: Crown, 
          color: "text-yellow-600 bg-yellow-50 border-yellow-200", 
          label: "Líder" 
        }
      case "good": 
        return { 
          icon: Award, 
          color: "text-green-600 bg-green-50 border-green-200", 
          label: "Excelente" 
        }
      case "average": 
        return { 
          icon: Target, 
          color: "text-blue-600 bg-blue-50 border-blue-200", 
          label: "Promedio" 
        }
      case "needs_attention": 
        return { 
          icon: AlertTriangle, 
          color: "text-red-600 bg-red-50 border-red-200", 
          label: "Atención" 
        }
      default: 
        return { 
          icon: Activity, 
          color: "text-gray-600 bg-gray-50 border-gray-200", 
          label: "N/A" 
        }
    }
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return ArrowUpRight
    if (trend < 0) return ArrowDownRight
    return Minus
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-600"
    if (trend < 0) return "text-red-600"
    return "text-gray-600"
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando análisis de unidades de negocio...</p>
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
            <h1 className="text-3xl font-bold text-foreground">Unidades de Negocio</h1>
            <p className="text-muted-foreground mt-1">Análisis comparativo de rendimiento por unidad</p>
          </div>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedView} onValueChange={(value: "overview" | "trends" | "comparison" | "performance") => setSelectedView(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Resumen</SelectItem>
                <SelectItem value="trends">Tendencias</SelectItem>
                <SelectItem value="comparison">Comparación</SelectItem>
                <SelectItem value="performance">Rendimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Business Unit Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {businessUnitMetrics.map((unit, index) => {
            const config = UNIT_CONFIG[unit.unit as keyof typeof UNIT_CONFIG]
            const statusInfo = getStatusInfo(unit.status)
            const TrendIcon = getTrendIcon(unit.crecimiento)
            const StatusIcon = statusInfo.icon
            
            return (
              <Card key={unit.unit} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <div 
                  className="absolute top-0 left-0 w-full h-1" 
                  style={{ backgroundColor: unit.color }}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-gray-600" />
                      <CardTitle className="text-lg font-bold text-foreground">{config?.name || unit.unit}</CardTitle>
                    </div>
                    <Badge className={`${statusInfo.color} border`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{config?.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Ingresos</span>
                        <span className="text-lg font-bold text-foreground">{formatCompactCurrency(unit.ingresos)}</span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Margen</span>
                        <span className={`text-sm font-semibold ${unit.margenUtilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {unit.margenUtilidad.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Participación</span>
                        <span className="text-sm font-semibold text-foreground">{unit.participacionMercado.toFixed(1)}%</span>
                      </div>
                      <Progress value={unit.participacionMercado} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-1">
                        <TrendIcon className={`h-4 w-4 ${getTrendColor(unit.crecimiento)}`} />
                        <span className={`text-sm font-medium ${getTrendColor(unit.crecimiento)}`}>
                          {unit.crecimiento >= 0 ? '+' : ''}{unit.crecimiento.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Rank #{unit.rank}</div>
                        <div className="text-xs text-muted-foreground">{unit.plants.length} plantas</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Main Content Based on Selected View */}
        {selectedView === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Unit Performance Comparison */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Comparación de Rendimiento
                </CardTitle>
                <CardDescription>
                  Ingresos, egresos y utilidad por unidad de negocio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={businessUnitMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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

            {/* Market Share Distribution */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Participación de Mercado
                </CardTitle>
                <CardDescription>
                  Distribución de ingresos por unidad de negocio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={businessUnitMetrics.map((unit, index) => ({
                          name: UNIT_CONFIG[unit.unit as keyof typeof UNIT_CONFIG]?.name || unit.unit,
                          value: unit.ingresos,
                          color: UNIT_CONFIG[unit.unit as keyof typeof UNIT_CONFIG]?.color || "#6b7280"
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {businessUnitMetrics.map((unit, index) => (
                          <Cell key={`cell-${index}`} fill={UNIT_CONFIG[unit.unit as keyof typeof UNIT_CONFIG]?.color || "#6b7280"} />
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
                  {businessUnitMetrics.map((unit, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: UNIT_CONFIG[unit.unit as keyof typeof UNIT_CONFIG]?.color || "#6b7280" }}
                        />
                        <span className="text-sm font-semibold text-foreground">{UNIT_CONFIG[unit.unit as keyof typeof UNIT_CONFIG]?.name || unit.unit}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">{formatCompactCurrency(unit.ingresos)}</div>
                        <div className="text-xs text-muted-foreground font-medium">{unit.participacionMercado.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedView === "trends" && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tendencias Históricas por Unidad
              </CardTitle>
              <CardDescription>
                Evolución de ingresos por unidad de negocio en el tiempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={unitTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="period" fontSize={12} />
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
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedView === "comparison" && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Comparación de KPIs
              </CardTitle>
              <CardDescription>
                Métricas clave comparativas entre unidades de negocio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-foreground">Métrica</th>
                      <th className="text-center p-3 font-medium text-foreground">BAJIO</th>
                      <th className="text-center p-3 font-medium text-foreground">VIADUCTO</th>
                      <th className="text-center p-3 font-medium text-foreground">ITISA</th>
                      <th className="text-center p-3 font-medium text-foreground">OTROS</th>
                      <th className="text-center p-3 font-medium text-foreground">Mejor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiComparison.map((kpi, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium text-foreground">{kpi.metric}</td>
                        <td className={`text-center p-3 ${kpi.best === 'BAJIO' ? 'font-bold text-green-600' : 'text-muted-foreground'}`}>
                          {kpi.BAJIO.toFixed(1)}
                        </td>
                        <td className={`text-center p-3 ${kpi.best === 'VIADUCTO' ? 'font-bold text-green-600' : 'text-muted-foreground'}`}>
                          {kpi.VIADUCTO.toFixed(1)}
                        </td>
                        <td className={`text-center p-3 ${kpi.best === 'ITISA' ? 'font-bold text-green-600' : 'text-muted-foreground'}`}>
                          {kpi.ITISA.toFixed(1)}
                        </td>
                        <td className={`text-center p-3 ${kpi.best === 'OTROS' ? 'font-bold text-green-600' : 'text-muted-foreground'}`}>
                          {kpi.OTROS.toFixed(1)}
                        </td>
                        <td className="text-center p-3">
                          <Badge className="bg-green-50 text-green-700 border-green-200">
                            {kpi.best}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedView === "performance" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Competitiveness Matrix */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Matriz de Competitividad
                </CardTitle>
                <CardDescription>
                  Análisis multidimensional de rendimiento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={competitivenessMatrix}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="unit" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar
                        name="Rentabilidad"
                        dataKey="profitability"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.1}
                      />
                      <Radar
                        name="Eficiencia"
                        dataKey="efficiency"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.1}
                      />
                      <Radar
                        name="Crecimiento"
                        dataKey="growth"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.1}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Plant Performance Detail */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  Rendimiento Detallado por Planta
                </CardTitle>
                <CardDescription>
                  Métricas individuales de cada planta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plantComparison.slice(0, 8).map((plant, index) => {
                    const unitConfig = UNIT_CONFIG[plant.unit as keyof typeof UNIT_CONFIG]
                    
                    return (
                      <div key={plant.planta} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: unitConfig?.color }}>
                            {plant.planta}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{plant.planta}</div>
                            <div className="text-sm text-muted-foreground">{unitConfig?.name}</div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="font-semibold text-foreground">{formatCompactCurrency(plant.ingresos)}</div>
                          <div className="text-sm text-muted-foreground">{plant.participacion.toFixed(1)}% participación</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${plant.margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {plant.margen.toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">margen</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 