"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SupabaseStorageService, FinancialReport } from "@/lib/supabase/storage"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, RadialBarChart, RadialBar, ComposedChart } from "recharts"
import { 
  Calculator, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Factory, 
  Truck,
  Zap,
  DollarSign,
  Building2,
  Package,
  Fuel,
  Settings,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity,
  HelpCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { TargetsConfigModal, useCostTargets, CostTargets } from "@/components/analytics/cost-analysis/targets-config-modal"
import { EfficiencyTooltip, TargetTooltip, VarianceTooltip, GeneralInfoTooltip } from "@/components/analytics/cost-analysis/metrics-info-tooltip"

interface CostCategory {
  name: string
  amount: number
  percentage: number
  trend: number
  efficiency: number
  target: number
  status: "excellent" | "good" | "warning" | "critical"
  color: string
}

interface PlantCostBreakdown {
  planta: string
  businessUnit: string
  materiaPrima: number
  costoOperativo: number
  costoFijo: number
  nomina: number
  otros: number
  total: number
  eficienciaTotal: number
}

interface CostEfficiencyMetric {
  category: string
  currentCost: number
  targetCost: number
  efficiency: number
  variance: number
  trend: "up" | "down" | "neutral"
}

interface CostTrend {
  period: string
  materiaPrima: number
  operativos: number
  fijos: number
  personal: number
  eficienciaGeneral: number
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

// Cost category colors
const COST_COLORS = {
  materiaPrima: "#dc2626",
  operativo: "#ea580c", 
  fijo: "#d97706",
  nomina: "#ca8a04",
  otros: "#9ca3af"
}

// Cost category icons
const COST_ICONS = {
  Cemento: Package,
  "Agregado Grueso": Package,
  "Agregado Fino": Package,
  Aditivos: Package,
  Agua: Package,
  "Diesel CR": Fuel,
  "Nómina Producción": Users,
  "Nómina Operadores CR": Users,
  "Otros gastos Producción": Settings,
  "Otros gastos CR": Settings,
  "Otros gastos Administrativos": Settings
}

export default function CostAnalysisPage() {
  const [costCategories, setCostCategories] = useState<CostCategory[]>([])
  const [plantCostBreakdown, setPlantCostBreakdown] = useState<PlantCostBreakdown[]>([])
  const [costEfficiencyMetrics, setCostEfficiencyMetrics] = useState<CostEfficiencyMetric[]>([])
  const [costTrends, setCostTrends] = useState<CostTrend[]>([])
  const [selectedReport, setSelectedReport] = useState<string>("latest")
  const [selectedPeriod, setSelectedPeriod] = useState<string>("6")
  const [selectedView, setSelectedView] = useState<"category" | "plant" | "efficiency">("category")
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCosts, setTotalCosts] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)
  
  const storageService = new SupabaseStorageService()
  const { toast } = useToast()
  const { targets, updateTargets } = useCostTargets()

  useEffect(() => {
    loadCostAnalysis()
  }, [selectedReport, selectedPeriod, targets])

  const loadCostAnalysis = async () => {
    try {
      setIsLoading(true)
      const allReports = await storageService.getFinancialReports()
      setReports(allReports)

      if (allReports.length === 0) {
        setIsLoading(false)
        return
      }

      // Get reports for analysis
      const periodsToAnalyze = parseInt(selectedPeriod)
      const reportsToAnalyze = selectedReport === "latest" 
        ? allReports.slice(0, periodsToAnalyze)
        : allReports.filter(r => r.id === selectedReport).slice(0, 1)

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

      // Aggregate data from all reports in the selected timeframe
      const aggregatedData = aggregateReportsData(allData)

      // Calculate cost analysis from aggregated data
      await calculateCostAnalysis(aggregatedData, allData)

    } catch (error) {
      console.error("Error loading cost analysis:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el análisis de costos",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
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

  const calculateCostAnalysis = async (currentData: any[], allData: any[]) => {
    // Calculate total income and costs
    const income = currentData
      .filter(row => row.tipo === "Ingresos")
      .reduce((sum, row) => sum + (row.monto || 0), 0)
    
    const costs = Math.abs(currentData
      .filter(row => row.tipo === "Egresos")
      .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

    setTotalIncome(income)
    setTotalCosts(costs)

    // Calculate cost categories
    const categories = calculateCostCategories(currentData, income)
    setCostCategories(categories)

    // Calculate plant cost breakdown
    const plantBreakdown = calculatePlantCostBreakdown(currentData, income)
    setPlantCostBreakdown(plantBreakdown)

    // Calculate cost efficiency metrics
    const efficiencyMetrics = calculateCostEfficiencyMetrics(currentData, income)
    setCostEfficiencyMetrics(efficiencyMetrics)

    // Calculate cost trends
    const trends = await calculateCostTrends(allData)
    setCostTrends(trends)
  }

  const calculateCostCategories = (data: any[], income: number): CostCategory[] => {
    const categoryMap = new Map<string, { amount: number; items: any[] }>()
    
    // Group costs by Categoria 1
    data
      .filter(row => row.tipo === "Egresos")
      .forEach(row => {
        const category = row.categoria_1 || "Otros"
        const amount = Math.abs(row.monto || 0)
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { amount: 0, items: [] })
        }
        
        const current = categoryMap.get(category)!
        current.amount += amount
        current.items.push(row)
      })

    const totalCosts = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0)

    const colors = [
      "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#a3a3a3",
      "#ef4444", "#f97316", "#eab308", "#84cc16", "#6b7280"
    ]

    return Array.from(categoryMap.entries())
      .map(([name, data], index) => {
        const percentage = totalCosts > 0 ? (data.amount / totalCosts) * 100 : 0
        const incomePercentage = income > 0 ? (data.amount / income) * 100 : 0
        
        // Use dynamic targets from configuration
        const targetPercentage = targets.categorias[name] || 0
        const targetAmount = income * targetPercentage / 100
        
        // Calculate efficiency: (Target - Actual) / Target * 100
        const efficiency = targetAmount > 0 ? ((targetAmount - data.amount) / targetAmount) * 100 : 0
        
        let status: "excellent" | "good" | "warning" | "critical" = "good"
        if (efficiency >= 10) status = "excellent"      // 10% or more under target
        else if (efficiency >= 0) status = "good"        // At or under target
        else if (efficiency >= -10) status = "warning"   // Up to 10% over target
        else status = "critical"                          // More than 10% over target

        return {
          name,
          amount: data.amount,
          percentage,
          trend: Math.random() * 10 - 5, // TODO: Calculate from historical data
          efficiency,
          target: targetPercentage,
          status,
          color: colors[index % colors.length]
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }

  const calculatePlantCostBreakdown = (data: any[], income: number): PlantCostBreakdown[] => {
    const plantMap = new Map<string, {
      materiaPrima: number; costoOperativo: number; costoFijo: number; 
      nomina: number; otros: number;
    }>()
    
    data
      .filter(row => row.tipo === "Egresos")
      .forEach(row => {
        const planta = row.planta || "SIN CLASIFICACION"
        const amount = Math.abs(row.monto || 0)
        const clasificacion = row.clasificacion || ""
        const categoria = row.categoria_1 || ""
        
        if (!plantMap.has(planta)) {
          plantMap.set(planta, {
            materiaPrima: 0, costoOperativo: 0, costoFijo: 0, nomina: 0, otros: 0
          })
        }
        
        const current = plantMap.get(planta)!
        
        if (clasificacion === "Materia prima") {
          current.materiaPrima += amount
        } else if (row.sub_categoria === "Costo operativo") {
          current.costoOperativo += amount
        } else if (clasificacion === "Costo Fijo") {
          current.costoFijo += amount
        } else if (categoria.includes("Nómina")) {
          current.nomina += amount
        } else {
          current.otros += amount
        }
      })

    return Array.from(plantMap.entries())
      .map(([planta, costs]) => {
        const total = costs.materiaPrima + costs.costoOperativo + costs.costoFijo + costs.nomina + costs.otros
        const eficienciaTotal = income > 0 ? ((income - total) / income) * 100 : 0
        
        return {
          planta,
          businessUnit: PLANT_TO_UNIT[planta] || "OTROS",
          materiaPrima: costs.materiaPrima,
          costoOperativo: costs.costoOperativo,
          costoFijo: costs.costoFijo,
          nomina: costs.nomina,
          otros: costs.otros,
          total,
          eficienciaTotal
        }
      })
      .sort((a, b) => b.total - a.total)
  }

  const calculateCostEfficiencyMetrics = (data: any[], income: number): CostEfficiencyMetric[] => {
    const metrics = [
      {
        category: "Materias Primas",
        target: income * targets.materiaPrima / 100,
        current: Math.abs(data
          .filter(row => row.tipo === "Egresos" && row.clasificacion === "Materia prima")
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))
      },
      {
        category: "Costo Operativo", 
        target: income * targets.costosOperativos / 100,
        current: Math.abs(data
          .filter(row => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo")
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))
      },
      {
        category: "Nómina",
        target: income * targets.nomina / 100,
        current: Math.abs(data
          .filter(row => row.tipo === "Egresos" && row.categoria_1?.includes("Nómina"))
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))
      }
    ]

    return metrics.map(metric => {
      // Calculate efficiency: (Target - Actual) / Target * 100
      const efficiency = metric.target > 0 ? ((metric.target - metric.current) / metric.target) * 100 : 0
      const variance = metric.current - metric.target
      const trend = variance < 0 ? "up" : variance > 0 ? "down" : "neutral"
      
      return {
        category: metric.category,
        currentCost: metric.current,
        targetCost: metric.target,
        efficiency,
        variance,
        trend: trend as "up" | "down" | "neutral"
      }
    })
  }

  const calculateCostTrends = async (allData: any[]): Promise<CostTrend[]> => {
    return allData.map(({ report, data }) => {
      const income = data
        .filter((row: any) => row.tipo === "Ingresos")
        .reduce((sum: number, row: any) => sum + (row.monto || 0), 0)

      const materiaPrima = Math.abs(data
        .filter((row: any) => row.tipo === "Egresos" && row.clasificacion === "Materia prima")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0))

      const operativos = Math.abs(data
        .filter((row: any) => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0))

      const fijos = Math.abs(data
        .filter((row: any) => row.tipo === "Egresos" && row.clasificacion === "Costo Fijo")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0))

      const personal = Math.abs(data
        .filter((row: any) => row.tipo === "Egresos" && row.categoria_1?.includes("Nómina"))
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0))

      const totalCosts = materiaPrima + operativos + fijos + personal
      const eficienciaGeneral = income > 0 ? ((income - totalCosts) / income) * 100 : 0

      return {
        period: `${String(report.month).padStart(2, '0')}/${report.year}`,
        materiaPrima,
        operativos,
        fijos,
        personal,
        eficienciaGeneral
      }
    }).reverse()
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "text-green-600 bg-green-50"
      case "good": return "text-blue-600 bg-blue-50"
      case "warning": return "text-yellow-600 bg-yellow-50"
      case "critical": return "text-red-600 bg-red-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up": return ArrowUpRight
      case "down": return ArrowDownRight
      default: return Minus
    }
  }

  const getTrendColor = (trend: "up" | "down" | "neutral") => {
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
            <p className="text-muted-foreground">Cargando análisis de costos...</p>
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
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground">Análisis de Costos</h1>
              <GeneralInfoTooltip />
            </div>
            <p className="text-muted-foreground mt-1">Análisis detallado de estructura de costos y eficiencia</p>
          </div>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <TargetsConfigModal
              currentTargets={targets}
              onTargetsChange={updateTargets}
              totalIncome={totalIncome}
            />
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
            <Select value={selectedView} onValueChange={(value: "category" | "plant" | "efficiency") => setSelectedView(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category">Por Categoría</SelectItem>
                <SelectItem value="plant">Por Planta</SelectItem>
                <SelectItem value="efficiency">Eficiencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Costos Totales</p>
                  <p className="text-2xl font-bold text-foreground">{formatCompactCurrency(totalCosts)}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                      {totalIncome > 0 ? `${((totalCosts / totalIncome) * 100).toFixed(1)}% de ingresos` : 'N/A'}
                    </p>
                </div>
                <Calculator className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Eficiencia General</p>
                    <EfficiencyTooltip />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {totalIncome > 0 ? `${(((totalIncome - totalCosts) / totalIncome) * 100).toFixed(1)}%` : 'N/A'}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Meta: {targets.eficienciaGeneral}%</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Categorías Analizadas</p>
                  <p className="text-2xl font-bold text-foreground">{costCategories.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Categor. de gastos</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plantas Activas</p>
                  <p className="text-2xl font-bold text-foreground">{plantCostBreakdown.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Con actividad</p>
                </div>
                <Factory className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Analysis */}
        {selectedView === "category" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cost Categories Breakdown */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Análisis de Costos por Categoría
                </CardTitle>
                <CardDescription>
                  Distribución porcentual de costos por categoría principal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="amount"
                      >
                        {costCategories.map((entry, index) => (
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
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {costCategories.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-semibold text-foreground">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">{formatCompactCurrency(item.amount)}</div>
                        <div className="text-xs text-muted-foreground font-medium">{item.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cost Categories Table */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Análisis de Eficiencia por Categoría
                </CardTitle>
                <CardDescription>
                  Estado vs objetivos de cada categoría
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costCategories.slice(0, 8).map((category, index) => {
                    const IconComponent = COST_ICONS[category.name as keyof typeof COST_ICONS] || Package
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: category.color + '20' }}>
                            <IconComponent className="h-5 w-5" style={{ color: category.color }} />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{category.name}</div>
                            <div className="text-sm text-muted-foreground">{formatCompactCurrency(category.amount)}</div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className={getStatusColor(category.status)}>
                            {category.status === "excellent" && "Excelente"}
                            {category.status === "good" && "Bueno"}
                            {category.status === "warning" && "Atención"}
                            {category.status === "critical" && "Crítico"}
                          </Badge>
                          <div className="text-sm text-muted-foreground">{category.percentage.toFixed(1)}% del total</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedView === "plant" && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Análisis de Costos por Planta
              </CardTitle>
              <CardDescription>
                Desglose detallado de costos por unidad productiva
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={plantCostBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="planta" fontSize={12} />
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
                    <Bar dataKey="materiaPrima" stackId="1" fill="#dc2626" name="Materia Prima" />
                    <Bar dataKey="costoOperativo" stackId="1" fill="#ea580c" name="Costo Operativo" />
                    <Bar dataKey="costoFijo" stackId="1" fill="#d97706" name="Costo Fijo" />
                    <Bar dataKey="nomina" stackId="1" fill="#ca8a04" name="Nómina" />
                    <Bar dataKey="otros" stackId="1" fill="#9ca3af" name="Otros" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedView === "efficiency" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Efficiency Metrics */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Métricas de Eficiencia
                  <EfficiencyTooltip />
                </CardTitle>
                <CardDescription>
                  Comparación actual vs objetivos configurables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {costEfficiencyMetrics.map((metric, index) => {
                    const TrendIcon = getTrendIcon(metric.trend)
                    const efficiencyPercent = metric.efficiency
                    const isPositive = efficiencyPercent >= 0
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{metric.category}</span>
                            <TrendIcon className={`h-4 w-4 ${getTrendColor(metric.trend)}`} />
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {efficiencyPercent > 0 ? '+' : ''}{efficiencyPercent.toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">eficiencia</div>
                          </div>
                        </div>
                        <Progress 
                          value={Math.min(100, Math.max(0, efficiencyPercent + 50))} 
                          className="h-2" 
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Actual: {formatCompactCurrency(metric.currentCost)}</span>
                          <span>Meta: {formatCompactCurrency(metric.targetCost)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className={`font-medium ${Math.abs(metric.variance) < metric.targetCost * 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                            Varianza: {metric.variance > 0 ? '+' : ''}{formatCompactCurrency(metric.variance)}
                          </span>
                          <VarianceTooltip />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Cost Trends */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Tendencias de Costos
                </CardTitle>
                <CardDescription>
                  Evolución de categorías principales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={costTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={formatAxisNumber} />
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
                      <Legend />
                      <Line type="monotone" dataKey="materiaPrima" stroke="#dc2626" strokeWidth={2} name="Materia Prima" />
                      <Line type="monotone" dataKey="operativos" stroke="#ea580c" strokeWidth={2} name="Operativos" />
                      <Line type="monotone" dataKey="personal" stroke="#ca8a04" strokeWidth={2} name="Personal" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cost Efficiency Summary */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Resumen de Eficiencia General
            </CardTitle>
            <CardDescription>
              Indicadores clave de eficiencia operativa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {costCategories.filter(c => c.status === "excellent").length}
                </div>
                <div className="text-sm text-green-600">Categorías Excelentes</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">
                  {costCategories.filter(c => c.status === "good").length}
                </div>
                <div className="text-sm text-blue-600">Categorías Buenas</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700">
                  {costCategories.filter(c => c.status === "warning").length}
                </div>
                <div className="text-sm text-yellow-600">Requieren Atención</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">
                  {costCategories.filter(c => c.status === "critical").length}
                </div>
                <div className="text-sm text-red-600">Situación Crítica</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información y Ayuda */}
        <Card className="shadow-lg border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              Guía de Interpretación de Métricas
            </CardTitle>
            <CardDescription>
              Cómo entender y usar las métricas de análisis de costos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <EfficiencyTooltip />
                  Eficiencia de Costos
                </h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Fórmula:</strong> (Objetivo - Costo Real) / Objetivo × 100</p>
                  <p>• <span className="text-green-600 font-medium">Positivo (+):</span> Estás por debajo del objetivo (excelente)</p>
                  <p>• <span className="text-red-600 font-medium">Negativo (-):</span> Estás por encima del objetivo (requiere acción)</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <TargetTooltip />
                  Objetivos Configurables
                </h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>• Los objetivos se expresan como porcentaje del ingreso total</p>
                  <p>• Usa "Configurar Objetivos" para personalizarlos</p>
                  <p>• Basarlos en datos históricos y metas del negocio</p>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-2">Estados de Categorías</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span><strong>Excelente:</strong> +10% o más bajo que objetivo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span><strong>Bueno:</strong> En objetivo o por debajo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span><strong>Atención:</strong> Hasta 10% sobre objetivo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span><strong>Crítico:</strong> Más de 10% sobre objetivo</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 