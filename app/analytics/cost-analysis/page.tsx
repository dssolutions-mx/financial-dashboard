"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SupabaseStorageService, FinancialReport } from "@/lib/supabase-storage"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, TreemapChart, Treemap, LineChart, Line, RadialBarChart, RadialBar } from "recharts"
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
  Minus
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

  useEffect(() => {
    loadCostAnalysis()
  }, [selectedReport, selectedPeriod])

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

      // Calculate cost analysis from latest report
      const latestReportData = allData[0]
      await calculateCostAnalysis(latestReportData.data, allData)

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
    
    // Define targets and efficiency benchmarks
    const targets = {
      "Cemento": 35, // % of income
      "Agregado Grueso": 8,
      "Agregado Fino": 5,
      "Aditivos": 3,
      "Nómina Producción": 12,
      "Diesel CR": 4,
      "Agua": 1
    }

    const colors = [
      "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#a3a3a3",
      "#ef4444", "#f97316", "#eab308", "#84cc16", "#6b7280"
    ]

    return Array.from(categoryMap.entries())
      .map(([name, data], index) => {
        const percentage = totalCosts > 0 ? (data.amount / totalCosts) * 100 : 0
        const incomePercentage = income > 0 ? (data.amount / income) * 100 : 0
        const target = targets[name as keyof typeof targets] || incomePercentage
        const efficiency = target > 0 ? Math.max(0, 100 - (incomePercentage / target) * 100) : 0
        
        let status: "excellent" | "good" | "warning" | "critical" = "good"
        if (incomePercentage <= target * 0.9) status = "excellent"
        else if (incomePercentage <= target) status = "good"
        else if (incomePercentage <= target * 1.1) status = "warning"
        else status = "critical"

        return {
          name,
          amount: data.amount,
          percentage,
          trend: Math.random() * 10 - 5, // TODO: Calculate from historical data
          efficiency,
          target,
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
        } else if (clasificacion === "Costo Operativo") {
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
        target: income * 0.45, // 45% target
        current: Math.abs(data
          .filter(row => row.tipo === "Egresos" && row.clasificacion === "Materia prima")
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))
      },
      {
        category: "Costos Operativos", 
        target: income * 0.15, // 15% target
        current: Math.abs(data
          .filter(row => row.tipo === "Egresos" && row.clasificacion === "Costo Operativo")
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))
      },
      {
        category: "Nómina",
        target: income * 0.18, // 18% target
        current: Math.abs(data
          .filter(row => row.tipo === "Egresos" && row.categoria_1?.includes("Nómina"))
          .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))
      }
    ]

    return metrics.map(metric => {
      const efficiency = metric.target > 0 ? (1 - metric.current / metric.target) * 100 : 0
      const variance = metric.current - metric.target
      const trend = variance < 0 ? "up" : variance > 0 ? "down" : "neutral"
      
      return {
        category: metric.category,
        currentCost: metric.current,
        targetCost: metric.target,
        efficiency: Math.max(0, efficiency),
        variance,
        trend: trend as "up" | "down" | "neutral"
      }
    })
  }

  const calculateCostTrends = async (allData: any[]): Promise<CostTrend[]> => {
    return allData.map(({ report, data }) => {
      const income = data
        .filter(row => row.tipo === "Ingresos")
        .reduce((sum, row) => sum + (row.monto || 0), 0)

      const materiaPrima = Math.abs(data
        .filter(row => row.tipo === "Egresos" && row.clasificacion === "Materia prima")
        .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

      const operativos = Math.abs(data
        .filter(row => row.tipo === "Egresos" && row.clasificacion === "Costo Operativo")
        .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

      const fijos = Math.abs(data
        .filter(row => row.tipo === "Egresos" && row.clasificacion === "Costo Fijo")
        .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

      const personal = Math.abs(data
        .filter(row => row.tipo === "Egresos" && row.categoria_1?.includes("Nómina"))
        .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

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
            <p className="text-gray-600">Cargando análisis de costos...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Análisis de Costos</h1>
            <p className="text-gray-600 mt-1">Análisis detallado de estructura de costos y eficiencia</p>
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
                  <p className="text-sm font-medium text-gray-600">Costos Totales</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCompactCurrency(totalCosts)}</p>
                  <p className="text-xs text-gray-500 mt-1">
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
                  <p className="text-sm font-medium text-gray-600">Eficiencia General</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalIncome > 0 ? `${(((totalIncome - totalCosts) / totalIncome) * 100).toFixed(1)}%` : 'N/A'}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Meta: 85%</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Categorías Analizadas</p>
                  <p className="text-2xl font-bold text-gray-900">{costCategories.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Categor. de gastos</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Plantas Activas</p>
                  <p className="text-2xl font-bold text-gray-900">{plantCostBreakdown.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Con actividad</p>
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
                  <Package className="h-5 w-5" />
                  Distribución de Costos por Categoría
                </CardTitle>
                <CardDescription>
                  Análisis detallado de estructura de costos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
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
                      <Tooltip formatter={(value: number) => [formatCompactCurrency(value), '']} />
                    </PieChart>
                  </ResponsiveContainer>
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
                            <div className="font-medium text-gray-900">{category.name}</div>
                            <div className="text-sm text-gray-500">{formatCompactCurrency(category.amount)}</div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className={getStatusColor(category.status)}>
                            {category.status === "excellent" && "Excelente"}
                            {category.status === "good" && "Bueno"}
                            {category.status === "warning" && "Atención"}
                            {category.status === "critical" && "Crítico"}
                          </Badge>
                          <div className="text-sm text-gray-500">{category.percentage.toFixed(1)}% del total</div>
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
                  <BarChart data={plantCostBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="planta" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCompactCurrency(value), '']} />
                    <Legend />
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
                </CardTitle>
                <CardDescription>
                  Comparación actual vs objetivos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {costEfficiencyMetrics.map((metric, index) => {
                    const TrendIcon = getTrendIcon(metric.trend)
                    const efficiencyPercent = Math.min(100, metric.efficiency)
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{metric.category}</span>
                            <TrendIcon className={`h-4 w-4 ${getTrendColor(metric.trend)}`} />
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900">{efficiencyPercent.toFixed(1)}%</div>
                            <div className="text-xs text-gray-500">eficiencia</div>
                          </div>
                        </div>
                        <Progress value={efficiencyPercent} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Actual: {formatCompactCurrency(metric.currentCost)}</span>
                          <span>Meta: {formatCompactCurrency(metric.targetCost)}</span>
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
                      <YAxis />
                      <Tooltip formatter={(value: number) => [formatCompactCurrency(value), '']} />
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
      </div>
    </DashboardLayout>
  )
} 