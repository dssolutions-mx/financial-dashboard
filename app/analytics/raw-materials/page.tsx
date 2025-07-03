"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SupabaseStorageService, FinancialReport } from "@/lib/supabase/storage"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Factory,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MaterialMetrics {
  material: string
  totalCost: number
  percentage: number
  trend: number
  color: string
  count: number
  costPerM3: number
  efficiency: number
}

interface MaterialTrend {
  period: string
  cemento: number
  agregadoGrueso: number
  agregadoFino: number
  aditivos: number
  agua: number
  otros: number
}

interface PlantMaterialComparison {
  planta: string
  businessUnit: string
  cemento: number
  agregadoGrueso: number
  agregadoFino: number
  aditivos: number
  agua: number
  otros: number
  totalCost: number
  totalVolume: number
  costPerM3: number
  efficiency: number
}

interface MaterialKPI {
  title: string
  value: string
  change: string
  trend: "up" | "down" | "neutral"
  description: string
  icon: React.ComponentType<{ className?: string }>
}

// Material colors for visualization
const MATERIAL_COLORS = {
  "Cemento": "#dc2626",
  "Agregado Grueso": "#ea580c",
  "Agregado Fino": "#d97706",
  "Aditivos": "#ca8a04",
  "Agua": "#0ea5e9",
  "Adiciones especiales": "#8b5cf6"
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

export default function RawMaterialsPage() {
  const [materialMetrics, setMaterialMetrics] = useState<MaterialMetrics[]>([])
  const [materialTrends, setMaterialTrends] = useState<MaterialTrend[]>([])
  const [plantComparison, setPlantComparison] = useState<PlantMaterialComparison[]>([])
  const [materialKPIs, setMaterialKPIs] = useState<MaterialKPI[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("6")
  const [selectedView, setSelectedView] = useState<"overview" | "trends" | "plants">("overview")
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalIncome, setTotalIncome] = useState(0)
  
  const storageService = new SupabaseStorageService()
  const { toast } = useToast()

  useEffect(() => {
    loadRawMaterialsAnalysis()
  }, [selectedPeriod])

  const loadRawMaterialsAnalysis = async () => {
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

      // Load data for all selected reports including volume data
      const allData = []
      const allVolumeData = []
      const allCashData = []

      for (const report of reportsToAnalyze) {
        const reportData = await storageService.getFinancialData(report.id)
        allData.push({ report, data: reportData })
        
        // Get volume data for this report
        const [volumeData, cashData] = await Promise.all([
          storageService.getPlantVolumes(report.month, report.year),
          storageService.getCashSales(report.month, report.year)
        ])
        
        allVolumeData.push(...volumeData)
        allCashData.push(...cashData)
      }

      // Calculate total volume
      const totalVolume = allVolumeData.reduce((sum, vol) => sum + vol.volume_m3, 0) +
                         allCashData.reduce((sum, sale) => sum + sale.volume_m3, 0)

      // Calculate material analysis
      await calculateMaterialAnalysis(allData, totalVolume, allVolumeData, allCashData)

    } catch (error) {
      console.error("Error loading raw materials analysis:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el análisis de materias primas",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateMaterialAnalysis = async (allData: any[], totalVolume: number, allVolumeData: any[], allCashData: any[]) => {
    if (allData.length === 0) return

    // Aggregate data from all reports
    const aggregatedData = aggregateReportsData(allData)

    // Calculate total income
    const income = aggregatedData
      .filter(row => row.tipo === "Ingresos")
      .reduce((sum, row) => sum + (row.monto || 0), 0)
    setTotalIncome(income)

    // Calculate material metrics
    const metrics = calculateMaterialMetrics(aggregatedData, totalVolume)
    setMaterialMetrics(metrics)

    // Calculate KPIs
    const kpis = calculateMaterialKPIs(metrics, income, totalVolume)
    setMaterialKPIs(kpis)

    // Calculate trends
    const trends = await calculateMaterialTrends(allData)
    setMaterialTrends(trends)

    // Calculate plant comparison
    const plantComp = calculatePlantMaterialComparison(aggregatedData, allVolumeData, allCashData)
    setPlantComparison(plantComp)
  }

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

  const calculateMaterialMetrics = (data: any[], totalVolume: number): MaterialMetrics[] => {
    const materialData = data.filter(row => 
      row.tipo === "Egresos" && 
      row.clasificacion === "Materia prima"
    )

    const totalMaterialCost = materialData.reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)
    const materialMap = new Map<string, { cost: number; count: number }>()
    
    materialData.forEach(row => {
      const material = row.categoria_1 || "Otros"
      const cost = Math.abs(row.monto || 0)
      
      if (!materialMap.has(material)) {
        materialMap.set(material, { cost: 0, count: 0 })
      }
      
      const current = materialMap.get(material)!
      current.cost += cost
      current.count += 1
    })

    const colors = Object.keys(MATERIAL_COLORS)
    
    return Array.from(materialMap.entries())
      .map(([material, data]) => {
        const costPerM3 = totalVolume > 0 ? data.cost / totalVolume : 0
        // Calculate efficiency compared to average (higher than average = lower efficiency)
        const avgCostPerM3 = totalVolume > 0 ? totalMaterialCost / totalVolume : 0
        const efficiency = avgCostPerM3 > 0 ? ((avgCostPerM3 - costPerM3) / avgCostPerM3) * 100 : 0
        
        return {
          material,
          totalCost: data.cost,
          percentage: totalMaterialCost > 0 ? (data.cost / totalMaterialCost) * 100 : 0,
          trend: 0, // TODO: Calculate from historical data
          color: MATERIAL_COLORS[material as keyof typeof MATERIAL_COLORS] || "#9ca3af",
          count: data.count,
          costPerM3,
          efficiency
        }
      })
      .sort((a, b) => b.totalCost - a.totalCost)
  }

  const calculateMaterialKPIs = (metrics: MaterialMetrics[], totalIncome: number, totalVolume: number): MaterialKPI[] => {
    const totalMaterialCost = metrics.reduce((sum, m) => sum + m.totalCost, 0)
    const materialPercentageOfIncome = totalIncome > 0 ? (totalMaterialCost / totalIncome) * 100 : 0
    const avgCostPerM3 = totalVolume > 0 ? totalMaterialCost / totalVolume : 0
    const topMaterial = metrics[0]
    const materialCount = metrics.length

    return [
      {
        title: "Costo Total Mat. Primas",
        value: formatCompactCurrency(totalMaterialCost),
        change: "0.0%",
        trend: "neutral",
        description: `${materialPercentageOfIncome.toFixed(1)}% de ingresos totales`,
        icon: Package
      },
      {
        title: "Costo por m³",
        value: formatCurrency(avgCostPerM3),
        change: "0.0%",
        trend: "neutral",
        description: `Costo promedio de materiales por metro cúbico`,
        icon: DollarSign
      },
      {
        title: "Material Principal",
        value: topMaterial?.material || "N/A",
        change: topMaterial ? `${topMaterial.percentage.toFixed(1)}%` : "0%",
        trend: "neutral",
        description: `${formatCompactCurrency(topMaterial?.costPerM3 || 0)}/m³`,
        icon: Building2
      },
      {
        title: "Tipos de Material",
        value: materialCount.toString(),
        change: "0",
        trend: "neutral",
        description: `Categorías activas de materias primas`,
        icon: Activity
      }
    ]
  }

  const calculateMaterialTrends = async (allData: any[]): Promise<MaterialTrend[]> => {
    const trends: MaterialTrend[] = []
    
    for (const { report, data } of allData) {
      const period = `${String(report.month).padStart(2, '0')}/${report.year}`
      const materialData = data.filter((row: any) => 
        row.tipo === "Egresos" && 
        row.clasificacion === "Materia prima"
      )

      const cemento = materialData
        .filter((row: any) => row.categoria_1 === "Cemento")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const agregadoGrueso = materialData
        .filter((row: any) => row.categoria_1 === "Agregado Grueso")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const agregadoFino = materialData
        .filter((row: any) => row.categoria_1 === "Agregado Fino")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const aditivos = materialData
        .filter((row: any) => row.categoria_1 === "Aditivos")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const agua = materialData
        .filter((row: any) => row.categoria_1 === "Agua")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const otros = materialData
        .filter((row: any) => !["Cemento", "Agregado Grueso", "Agregado Fino", "Aditivos", "Agua"].includes(row.categoria_1))
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      trends.push({
        period,
        cemento,
        agregadoGrueso,
        agregadoFino,
        aditivos,
        agua,
        otros
      })
    }

    return trends.reverse()
  }

  const calculatePlantMaterialComparison = (data: any[], allVolumeData: any[], allCashData: any[]): PlantMaterialComparison[] => {
    const plantas = [...new Set(data.map((row: any) => row.planta).filter(Boolean))]
    
    // Calculate volume per plant (combining fiscal and cash)
    const volumeByPlant = new Map<string, number>()
    allVolumeData.forEach(vol => {
      const currentVol = volumeByPlant.get(vol.plant_code) || 0
      volumeByPlant.set(vol.plant_code, currentVol + vol.volume_m3)
    })
    allCashData.forEach(cash => {
      const currentVol = volumeByPlant.get(cash.plant_code) || 0
      volumeByPlant.set(cash.plant_code, currentVol + cash.volume_m3)
    })

    const results = plantas.map(planta => {
      const plantData = data.filter((row: any) => 
        row.planta === planta && 
        row.tipo === "Egresos" && 
        row.clasificacion === "Materia prima"
      )
      
      const cemento = plantData
        .filter((row: any) => row.categoria_1 === "Cemento")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const agregadoGrueso = plantData
        .filter((row: any) => row.categoria_1 === "Agregado Grueso")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const agregadoFino = plantData
        .filter((row: any) => row.categoria_1 === "Agregado Fino")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const aditivos = plantData
        .filter((row: any) => row.categoria_1 === "Aditivos")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const agua = plantData
        .filter((row: any) => row.categoria_1 === "Agua")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const otros = plantData
        .filter((row: any) => !["Cemento", "Agregado Grueso", "Agregado Fino", "Aditivos", "Agua"].includes(row.categoria_1))
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const totalCost = cemento + agregadoGrueso + agregadoFino + aditivos + agua + otros
      const totalVolume = volumeByPlant.get(planta) || 0
      const costPerM3 = totalVolume > 0 ? totalCost / totalVolume : 0

      return {
        planta,
        businessUnit: PLANT_TO_UNIT[planta] || "OTROS",
        cemento,
        agregadoGrueso,
        agregadoFino,
        aditivos,
        agua,
        otros,
        totalCost,
        totalVolume,
        costPerM3,
        efficiency: 0 // Will be calculated after we have all plants
      }
    })

    // Calculate efficiency compared to average
    const avgCostPerM3 = results.reduce((sum, plant) => sum + plant.costPerM3, 0) / results.length
    
    return results.map(plant => ({
      ...plant,
      efficiency: avgCostPerM3 > 0 ? ((avgCostPerM3 - plant.costPerM3) / avgCostPerM3) * 100 : 0
    })).sort((a, b) => a.costPerM3 - b.costPerM3) // Sort by efficiency (lower cost per m3 = better)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up": return ArrowUpRight
      case "down": return ArrowDownRight
      case "neutral": return Minus
      default: return Minus
    }
  }

  const getTrendColor = (trend: "up" | "down" | "neutral") => {
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
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Cargando análisis de materias primas...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Análisis de Materias Primas</h1>
            <p className="text-muted-foreground">Costos y distribución por tipo de material</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPIs Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {materialKPIs.map((kpi, index) => {
            const IconComponent = kpi.icon
            const TrendIcon = getTrendIcon(kpi.trend)
            
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <div className={`flex items-center mt-1 ${getTrendColor(kpi.trend)}`}>
                    <TrendIcon className="h-3 w-3 mr-1" />
                    <span className="text-xs font-medium">{kpi.change}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{kpi.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Analysis Tabs */}
        <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)}>
          <TabsList>
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="trends">Tendencias</TabsTrigger>
            <TabsTrigger value="plants">Por Planta</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Material Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Materias Primas</CardTitle>
                  <CardDescription>
                    Participación por material en el total de costos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={materialMetrics}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ material, percentage }) => `${material}: ${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="totalCost"
                      >
                        {materialMetrics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [formatCompactCurrency(value), "Costo"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Material Cost per m³ Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Costo por m³ por Material</CardTitle>
                  <CardDescription>
                    Eficiencia de costo por metro cúbico producido
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={materialMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="material" 
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tickFormatter={(value) => formatCompactCurrency(value)} />
                      <Tooltip 
                        formatter={(value: number) => [formatCompactCurrency(value), "Costo/m³"]}
                      />
                      <Bar dataKey="costPerM3" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Material Details Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detalle por Material</CardTitle>
                <CardDescription>
                  Desglose completo de costos por tipo de materia prima
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materialMetrics.map((material, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: material.color }}
                        />
                                              <div>
                        <h4 className="font-medium">{material.material}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCompactCurrency(material.costPerM3)}/m³ • {material.count} movimientos
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCompactCurrency(material.totalCost)}</p>
                      <p className="text-sm text-muted-foreground">
                        {material.percentage.toFixed(1)}% del total
                      </p>
                      <p className={`text-xs font-medium ${material.efficiency > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {material.efficiency > 0 ? '+' : ''}{material.efficiency.toFixed(1)}% eficiencia
                      </p>
                    </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tendencias Históricas</CardTitle>
                <CardDescription>
                  Evolución del costo por material en el tiempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={materialTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(value) => formatCompactCurrency(value)} />
                    <Tooltip 
                      formatter={(value: number) => [formatCompactCurrency(value), "Costo"]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cemento" 
                      stroke="#dc2626" 
                      name="Cemento"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="agregadoGrueso" 
                      stroke="#ea580c" 
                      name="Agregado Grueso"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="agregadoFino" 
                      stroke="#d97706" 
                      name="Agregado Fino"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="aditivos" 
                      stroke="#ca8a04" 
                      name="Aditivos"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="agua" 
                      stroke="#0ea5e9" 
                      name="Agua"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="otros" 
                      stroke="#8b5cf6" 
                      name="Otros"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plants" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Comparación por Planta</CardTitle>
                  <CardDescription>
                    Costos de materias primas por unidad productiva
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={plantComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="planta" />
                      <YAxis tickFormatter={(value) => formatCompactCurrency(value)} />
                      <Tooltip 
                        formatter={(value: number) => [formatCompactCurrency(value), "Costo"]}
                      />
                      <Legend />
                      <Bar dataKey="cemento" stackId="a" fill="#dc2626" name="Cemento" />
                      <Bar dataKey="agregadoGrueso" stackId="a" fill="#ea580c" name="Agregado Grueso" />
                      <Bar dataKey="agregadoFino" stackId="a" fill="#d97706" name="Agregado Fino" />
                      <Bar dataKey="aditivos" stackId="a" fill="#ca8a04" name="Aditivos" />
                      <Bar dataKey="agua" stackId="a" fill="#0ea5e9" name="Agua" />
                      <Bar dataKey="otros" stackId="a" fill="#8b5cf6" name="Otros" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Eficiencia por Planta</CardTitle>
                  <CardDescription>
                    Costo total de materias primas por m³
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={plantComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="planta" />
                      <YAxis tickFormatter={(value) => formatCompactCurrency(value)} />
                      <Tooltip 
                        formatter={(value: number) => [formatCompactCurrency(value), "Costo/m³"]}
                      />
                      <Bar 
                        dataKey="costPerM3" 
                        fill="#3b82f6" 
                        name="Costo por m³"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Plant Details */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen por Planta</CardTitle>
                <CardDescription>
                  Costos totales de materias primas por planta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plantComparison.map((plant, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Factory className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium">{plant.planta}</h4>
                          <p className="text-sm text-muted-foreground">
                            {plant.businessUnit} • {plant.totalVolume.toFixed(0)} m³
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCompactCurrency(plant.totalCost)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCompactCurrency(plant.costPerM3)}/m³
                        </p>
                        <p className={`text-xs font-medium ${plant.efficiency > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {plant.efficiency > 0 ? '+' : ''}{plant.efficiency.toFixed(1)}% eficiencia
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
} 