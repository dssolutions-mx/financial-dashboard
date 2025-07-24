"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SupabaseStorageService, FinancialReport } from "@/lib/supabase/storage"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend,
  ComposedChart,
  Area,
  AreaChart
} from "recharts"
import { 
  Truck, 
  Building2, 
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calculator,
  Factory,
  Settings,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Fuel,
  Users,
  Package,
  HelpCircle,
  Percent
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { OperationalTargetsConfigModal, useOperationalTargets, OperationalTargets } from "@/components/analytics/operational-costs/targets-config-modal"
import { OperationalCostsInfoSection } from "@/components/analytics/operational-costs/metrics-info-tooltip"

interface OperationalCostMetrics {
  category: string
  subcategory: string
  totalCost: number
  targetPercentage: number
  actualPercentage: number
  unitCost: number
  efficiency: number
  trend: number
  status: "excellent" | "good" | "warning" | "critical"
  color: string
  plantBreakdown: { planta: string; amount: number; percentage: number }[]
}

interface OperationalKPI {
  id: string
  title: string
  value: string | number
  unit: string
  change: string
  trend: "up" | "down" | "neutral"
  status: "excellent" | "good" | "warning" | "critical"
  target?: number
  description: string
  icon: React.ComponentType<{ className?: string }>
}

interface PlantOperationalMetrics {
  planta: string
  businessUnit: string
  costoTransporte: number
  costoFijo: number
  totalOperacional: number
  volumenM3: number
  costoUnitarioOperacional: number
  eficienciaOperacional: number
  participacion: number
  // New fields for concrete and pumping breakdown
  costoUnitarioConcreto: number
  costoUnitarioBombeo: number
  costoBombeo: number
  costoFijoConcreto: number
  costoFijoBombeo: number
  // Real volume proportions for verification
  volumenConcreto: number
  volumenBombeo: number
  proporcionConcreto: number
  proporcionBombeo: number
}

interface OperationalTrend {
  period: string
  costoTransporte: number
  costoFijo: number
  eficienciaOperacional: number
  costoUnitarioPromedio: number
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

// Operational cost structure as per the proper classification hierarchy
const OPERATIONAL_COST_STRUCTURE = {
  "Costo transporte concreto": {
    name: "Costo Transporte Concreto",
    target: 18,
    color: "#f97316",
    icon: Truck
  },
  "Costo Fijo": {
    name: "Costos Fijos Operativos", 
    target: 15,
    color: "#3b82f6",
    icon: Building2
  }
}

export default function OperationalCostsPage() {
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalCostMetrics[]>([])
  const [operationalKPIs, setOperationalKPIs] = useState<OperationalKPI[]>([])
  const [plantMetrics, setPlantMetrics] = useState<PlantOperationalMetrics[]>([])
  const [operationalTrends, setOperationalTrends] = useState<OperationalTrend[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("3")
  const [viewMode, setViewMode] = useState<"participation" | "unit">("participation")
  const [selectedView, setSelectedView] = useState<"overview" | "plants" | "trends">("overview")
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [volumeData, setVolumeData] = useState<any[]>([])
  const [cashSalesData, setCashSalesData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasVolumeData, setHasVolumeData] = useState(false)
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalOperationalCosts, setTotalOperationalCosts] = useState(0)
  const [currentOperationalData, setCurrentOperationalData] = useState<any[]>([])

  const storageService = new SupabaseStorageService()
  const { toast } = useToast()
  const { targets, updateTargets } = useOperationalTargets()

  useEffect(() => {
    loadOperationalData()
  }, [selectedPeriod])

  useEffect(() => {
    if (operationalKPIs.length > 0 && reports.length > 0) {
      loadOperationalData()
    }
  }, [viewMode])

  const loadOperationalData = async () => {
    try {
      setIsLoading(true)
      const allReports = await storageService.getFinancialReports()
      setReports(allReports)

      if (allReports.length === 0) {
        setIsLoading(false)
        return
      }

      const periodsToAnalyze = parseInt(selectedPeriod)
      const reportsToAnalyze = allReports.slice(0, periodsToAnalyze)

      if (reportsToAnalyze.length === 0) {
        setIsLoading(false)
        return
      }

      // Load financial data for all selected reports
      const allData = []
      for (const report of reportsToAnalyze) {
        const reportData = await storageService.getFinancialData(report.id)
        allData.push({ report, data: reportData })
      }

      // Load and aggregate volume data from all selected reports
      let allVolumeData: any[] = []
      let allCashSalesData: any[] = []
      let foundVolumeData = false

      for (const report of reportsToAnalyze) {
        const [volData, cashData] = await Promise.all([
          storageService.getPlantVolumes(report.month, report.year),
          storageService.getCashSales(report.month, report.year)
        ])
        
        if (volData.length > 0 || cashData.length > 0) {
          allVolumeData.push(...volData)
          allCashSalesData.push(...cashData)
          foundVolumeData = true
        }
      }

      // Aggregate volume data by category and plant
      const aggregatedVolumeData = aggregateVolumeData(allVolumeData)
      const aggregatedCashSalesData = aggregateCashSalesData(allCashSalesData)

      setVolumeData(aggregatedVolumeData)
      setCashSalesData(aggregatedCashSalesData)
      setHasVolumeData(foundVolumeData)

      // Aggregate financial data from all selected reports
      const aggregatedData = aggregateReportsData(allData)

      // Calculate operational costs analysis
      await calculateOperationalAnalysis(aggregatedData, aggregatedVolumeData, aggregatedCashSalesData, allData)

    } catch (error) {
      console.error("Error loading operational data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los costos operativos",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
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

  const aggregateVolumeData = (allVolumeData: any[]) => {
    const aggregated: Record<string, any> = {}
    
    allVolumeData.forEach((vol: any) => {
      const key = `${vol.plant_code}-${vol.category}`
      
      if (aggregated[key]) {
        aggregated[key].volume_m3 += (vol.volume_m3 || 0)
      } else {
        aggregated[key] = {
          ...vol,
          volume_m3: vol.volume_m3 || 0
        }
      }
    })
    
    return Object.values(aggregated)
  }

  const aggregateCashSalesData = (allCashSalesData: any[]) => {
    const aggregated: Record<string, any> = {}
    
    allCashSalesData.forEach((sale: any) => {
      const key = `${sale.plant_code}-${sale.category}`
      
      if (aggregated[key]) {
        aggregated[key].volume_m3 += (sale.volume_m3 || 0)
        aggregated[key].amount_mxn += (sale.amount_mxn || 0)
      } else {
        aggregated[key] = {
          ...sale,
          volume_m3: sale.volume_m3 || 0,
          amount_mxn: sale.amount_mxn || 0
        }
      }
    })
    
    return Object.values(aggregated)
  }

  const calculateOperationalAnalysis = async (
    currentData: any[], 
    volumeData: any[], 
    cashSalesData: any[], 
    allData: any[]
  ) => {
    // Calculate total income including cash sales
    const fiscalIncome = currentData
      .filter(row => row.tipo === "Ingresos")
      .reduce((sum, row) => sum + (row.monto || 0), 0)
    
    const cashIncome = cashSalesData.reduce((sum, sale) => sum + sale.amount_mxn, 0)
    const totalIncome = fiscalIncome + cashIncome
    setTotalIncome(totalIncome)

    // Calculate volume breakdown for proper cost allocation
    const volumeBreakdown = calculateVolumeBreakdown(volumeData, cashSalesData)

    // Calculate operational cost metrics with proper volume allocation
    const metrics = calculateOperationalMetrics(currentData, totalIncome, volumeBreakdown)
    setOperationalMetrics(metrics)

    // Calculate total operational costs
    const totalOp = metrics.reduce((sum, m) => sum + m.totalCost, 0)
    setTotalOperationalCosts(totalOp)

    // Calculate operational KPIs
    const kpis = calculateOperationalKPIs(currentData, totalIncome, volumeBreakdown, allData)
    setOperationalKPIs(kpis)

    // Calculate plant operational metrics
    const plantMetrics = calculatePlantOperationalMetrics(currentData, volumeData, cashSalesData, totalIncome)
    setPlantMetrics(plantMetrics)

    // Calculate operational trends
    const trends = await calculateOperationalTrends(allData)
    setOperationalTrends(trends)

    // Store the aggregated data for composition analysis
    setCurrentOperationalData(currentData)
  }

  const calculateVolumeBreakdown = (volumeData: any[], cashSalesData: any[]) => {
    // Concrete volume (concrete + alternatives - materials consuming)
    const volumeConcreto = volumeData
      .filter(vol => vol.category === "Ventas Concreto")
      .reduce((sum, vol) => sum + vol.volume_m3, 0)
    
    const volumeAlternativos = volumeData
      .filter(vol => vol.category === "Productos Alternativos")
      .reduce((sum, vol) => sum + vol.volume_m3, 0)

    const cashVolumeConcreto = cashSalesData
      .filter(sale => sale.category === "Ventas Concreto Cash")
      .reduce((sum, sale) => sum + sale.volume_m3, 0)

    // Pumping volume (service only - no materials)
    const volumePumping = volumeData
      .filter(vol => vol.category === "Ventas Bombeo")
      .reduce((sum, vol) => sum + vol.volume_m3, 0)

    const concreteVolume = volumeConcreto + volumeAlternativos + cashVolumeConcreto
    const pumpingVolume = volumePumping
    const totalVolume = concreteVolume + pumpingVolume

    return {
      concreteVolume,
      pumpingVolume, 
      totalVolume
    }
  }

  const calculateOperationalMetrics = (
    data: any[], 
    totalIncome: number, 
    volumeBreakdown: { concreteVolume: number; pumpingVolume: number; totalVolume: number }
  ): OperationalCostMetrics[] => {
    const metrics: OperationalCostMetrics[] = []

    // Separate costs by type for proper allocation
    
    // Pumping-specific costs (only "Costo servicio de bomba")
    const pumpingServiceCosts = data
      .filter(row => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo" && 
                     row.clasificacion === "Costo transporte concreto" && 
                     row.categoria_1 === "Costo servicio de bomba")
      .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)

    // Concrete transport costs (all transport costs EXCEPT pumping service)
    const concreteTransportCosts = data
      .filter(row => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo" && 
                     row.clasificacion === "Costo transporte concreto" && 
                     row.categoria_1 !== "Costo servicio de bomba")
      .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)

    // Fixed costs (distributed proportionally between concrete and pumping)
    const totalFixedCosts = data
      .filter(row => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo" && row.clasificacion === "Costo Fijo")
      .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)

    // Allocate fixed costs proportionally based on volume
    const { concreteVolume, pumpingVolume, totalVolume } = volumeBreakdown
    const concreteFixedCosts = totalVolume > 0 ? totalFixedCosts * (concreteVolume / totalVolume) : 0
    const pumpingFixedCosts = totalVolume > 0 ? totalFixedCosts * (pumpingVolume / totalVolume) : 0

    // Total costs by service type
    const totalConcreteCosts = concreteTransportCosts + concreteFixedCosts
    const totalPumpingCosts = pumpingServiceCosts + pumpingFixedCosts

    // Calculate plant breakdown for each category
    const calculatePlantBreakdown = (filterCondition: (row: any) => boolean) => {
      const plantTotals: Record<string, number> = {}
      const categoryTotal = data
        .filter(row => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo" && filterCondition(row))
        .reduce((sum, row) => {
          const planta = row.planta || "SIN CLASIFICACION"
          plantTotals[planta] = (plantTotals[planta] || 0) + Math.abs(row.monto || 0)
          return sum + Math.abs(row.monto || 0)
        }, 0)

      return Object.entries(plantTotals).map(([planta, amount]) => ({
        planta,
        amount,
        percentage: categoryTotal > 0 ? (amount / categoryTotal) * 100 : 0
      }))
    }

    // Concrete operations metric (transport + allocated fixed costs)
    if (totalConcreteCosts > 0) {
      const concreteBreakdown = calculatePlantBreakdown(
        row => (row.clasificacion === "Costo transporte concreto" && row.categoria_1 !== "Costo servicio de bomba") ||
               row.clasificacion === "Costo Fijo"
      )
      
      const actualPercentage = totalIncome > 0 ? (totalConcreteCosts / totalIncome) * 100 : 0
      const targetPercentage = targets.costoTransporte + (targets.costoFijo * (concreteVolume / totalVolume))
      const efficiency = targetPercentage > 0 ? ((targetPercentage - actualPercentage) / targetPercentage) * 100 : 0
      
      metrics.push({
        category: "Operación Concreto",
        subcategory: "Transporte + Fijos Asignados",
        totalCost: totalConcreteCosts,
        targetPercentage,
        actualPercentage,
        unitCost: concreteVolume > 0 ? totalConcreteCosts / concreteVolume : 0,
        efficiency,
        trend: 0,
        status: getEfficiencyStatus(efficiency),
        color: "#f97316",
        plantBreakdown: concreteBreakdown
      })
    }

    // Pumping service metric (pumping service + allocated fixed costs)
    if (totalPumpingCosts > 0) {
      const pumpingBreakdown = calculatePlantBreakdown(
        row => (row.clasificacion === "Costo transporte concreto" && row.categoria_1 === "Costo servicio de bomba") ||
               row.clasificacion === "Costo Fijo"
      )
      
      const actualPercentage = totalIncome > 0 ? (totalPumpingCosts / totalIncome) * 100 : 0
      const targetPercentage = targets.costoFijo * (pumpingVolume / totalVolume) // Pumping should only have allocated fixed costs
      const efficiency = targetPercentage > 0 ? ((targetPercentage - actualPercentage) / targetPercentage) * 100 : 0
      
      metrics.push({
        category: "Servicio Bombeo",
        subcategory: "Servicio + Fijos Asignados",
        totalCost: totalPumpingCosts,
        targetPercentage,
        actualPercentage,
        unitCost: pumpingVolume > 0 ? totalPumpingCosts / pumpingVolume : 0,
        efficiency,
        trend: 0,
        status: getEfficiencyStatus(efficiency),
        color: "#8b5cf6",
        plantBreakdown: pumpingBreakdown
      })
    }

    return metrics.sort((a, b) => b.totalCost - a.totalCost)
  }

  const getEfficiencyStatus = (efficiency: number): "excellent" | "good" | "warning" | "critical" => {
    if (efficiency >= 10) return "excellent"      // 10% or more under target
    if (efficiency >= 0) return "good"            // At or under target  
    if (efficiency >= -10) return "warning"       // Up to 10% over target
    return "critical"                             // More than 10% over target
  }

  const calculateOperationalKPIs = (
    data: any[], 
    totalIncome: number, 
    volumeBreakdown: { concreteVolume: number; pumpingVolume: number; totalVolume: number }, 
    allData: any[]
  ): OperationalKPI[] => {
    // Calculate total operational costs
    const totalOperationalCosts = data
      .filter(row => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo")
      .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)

    // Calculate transport and fixed costs separately for analysis
    const transportCosts = data
      .filter(row => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo" && row.clasificacion === "Costo transporte concreto")
      .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)

    const fixedCosts = data
      .filter(row => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo" && row.clasificacion === "Costo Fijo")
      .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)

    const operationalEfficiency = totalIncome > 0 ? 
      ((totalIncome - totalOperationalCosts) / totalIncome) * 100 : 0

    const unitOperationalCost = volumeBreakdown.totalVolume > 0 ? totalOperationalCosts / volumeBreakdown.totalVolume : 0

    // Calculate growth from previous period for trend analysis
    const growthRate = calculateGrowthRate(allData)

    // Calculate operational cost as percentage of income
    const operationalParticipation = totalIncome > 0 ? 
      (totalOperationalCosts / totalIncome) * 100 : 0

    // Calculate target compliance
    const transportTargetCompliance = totalIncome > 0 ? 
      ((targets.costoTransporte - ((transportCosts / totalIncome) * 100)) / targets.costoTransporte) * 100 : 0

    const fixedTargetCompliance = totalIncome > 0 ? 
      ((targets.costoFijo - ((fixedCosts / totalIncome) * 100)) / targets.costoFijo) * 100 : 0

    const overallTargetCompliance = (transportTargetCompliance + fixedTargetCompliance) / 2

    const kpis: OperationalKPI[] = []

    if (viewMode === "unit" && volumeBreakdown.totalVolume > 0) {
      // Unit cost focused KPIs for operational management
      kpis.push(
        {
          id: "total_operational",
          title: "Costos Operativos Totales",
          value: formatCompactCurrency(totalOperationalCosts),
          unit: "",
          change: `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`,
          trend: growthRate < 0 ? "up" : growthRate > 0 ? "down" : "neutral", // Lower costs = better
          status: operationalParticipation <= 40 ? "excellent" : 
                  operationalParticipation <= 45 ? "good" : 
                  operationalParticipation <= 50 ? "warning" : "critical",
          description: "Total de costos operativos agregados",
          icon: DollarSign
        },
        {
          id: "unit_operational_cost",
          title: "Costo Operativo Unitario",
          value: formatUnitCurrency(unitOperationalCost),
          unit: "/m³",
          change: "promedio",
          trend: unitOperationalCost <= ((targets.costoUnitarioConcreto + targets.costoUnitarioBombeo) / 2) ? "up" : "down",
          status: unitOperationalCost <= ((targets.costoUnitarioConcreto + targets.costoUnitarioBombeo) / 2) * 0.9 ? "excellent" :
                  unitOperationalCost <= ((targets.costoUnitarioConcreto + targets.costoUnitarioBombeo) / 2) ? "good" :
                  unitOperationalCost <= ((targets.costoUnitarioConcreto + targets.costoUnitarioBombeo) / 2) * 1.1 ? "warning" : "critical",
          target: (targets.costoUnitarioConcreto + targets.costoUnitarioBombeo) / 2,
          description: "Costo operativo por metro cúbico",
          icon: Calculator
        },
        {
          id: "operational_efficiency",
          title: "Eficiencia Operativa",
          value: operationalEfficiency.toFixed(1),
          unit: "%",
          change: "vs objetivo",
          trend: operationalEfficiency >= targets.eficienciaMinima ? "up" : "down",
          status: operationalEfficiency >= targets.eficienciaMinima + 10 ? "excellent" :
                  operationalEfficiency >= targets.eficienciaMinima ? "good" :
                  operationalEfficiency >= targets.eficienciaMinima - 5 ? "warning" : "critical",
          target: targets.eficienciaMinima,
          description: "Eficiencia en gestión de costos operativos",
          icon: Target
        },
        {
          id: "target_compliance",
          title: "Cumplimiento de Objetivos",
          value: overallTargetCompliance.toFixed(1),
          unit: "%",
          change: "vs metas",
          trend: overallTargetCompliance >= 0 ? "up" : "down",
          status: overallTargetCompliance >= 10 ? "excellent" :
                  overallTargetCompliance >= 0 ? "good" :
                  overallTargetCompliance >= -10 ? "warning" : "critical",
          description: "Cumplimiento promedio de objetivos operativos",
          icon: Target
        }
      )
    } else {
      // Participation mode (default when no volume data) - Management decision KPIs
      kpis.push(
        {
          id: "total_operational",
          title: "Costos Operativos Totales",
          value: formatCompactCurrency(totalOperationalCosts),
          unit: "",
          change: `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`,
          trend: growthRate < 0 ? "up" : growthRate > 0 ? "down" : "neutral",
          status: operationalParticipation <= 40 ? "excellent" : 
                  operationalParticipation <= 45 ? "good" : 
                  operationalParticipation <= 50 ? "warning" : "critical",
          description: "Total de costos operativos agregados",
          icon: DollarSign
        },
        {
          id: "operational_participation",
          title: "Participación Operativa",
          value: operationalParticipation.toFixed(1),
          unit: "%",
          change: "de ingresos",
          trend: operationalParticipation <= 40 ? "up" : "down",
          status: operationalParticipation <= 35 ? "excellent" :
                  operationalParticipation <= 40 ? "good" :
                  operationalParticipation <= 45 ? "warning" : "critical",
          description: "Porcentaje de ingresos destinado a operación",
          icon: Percent
        },
        {
          id: "operational_efficiency",
          title: "Margen Operativo",
          value: operationalEfficiency.toFixed(1),
          unit: "%",
          change: "rentabilidad",
          trend: operationalEfficiency >= targets.eficienciaMinima ? "up" : "down",
          status: operationalEfficiency >= 65 ? "excellent" :
                  operationalEfficiency >= 55 ? "good" :
                  operationalEfficiency >= 45 ? "warning" : "critical",
          target: targets.eficienciaMinima,
          description: "Margen después de costos operativos",
          icon: TrendingUp
        },
        {
          id: "cost_control_index",
          title: "Índice Control de Costos",
          value: Math.max(0, 100 - Math.abs(overallTargetCompliance)).toFixed(1),
          unit: "/100",
          change: "control",
          trend: overallTargetCompliance >= 0 ? "up" : "down",
          status: Math.abs(overallTargetCompliance) <= 5 ? "excellent" :
                  Math.abs(overallTargetCompliance) <= 10 ? "good" :
                  Math.abs(overallTargetCompliance) <= 20 ? "warning" : "critical",
          description: "Índice de control y disciplina de costos",
          icon: Activity
        }
      )
    }

    return kpis
  }

  const calculateGrowthRate = (allData: any[]): number => {
    if (allData.length < 2) return 0

    const currentData = allData[0].data
    const previousData = allData[1].data

    const currentOperational = currentData
      .filter((row: any) => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo")
      .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

    const previousOperational = previousData
      .filter((row: any) => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo")
      .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

    return previousOperational > 0 ? 
      ((currentOperational - previousOperational) / previousOperational) * 100 : 0
  }

  const calculatePlantOperationalMetrics = (
    data: any[], 
    volumeData: any[], 
    cashSalesData: any[], 
    totalIncome: number
  ): PlantOperationalMetrics[] => {
    const plantas = [...new Set(data.map((row: any) => row.planta).filter(Boolean))]
    
    return plantas.map(planta => {
      const plantaData = data.filter((row: any) => row.planta === planta)
      
      const costoTransporte = plantaData
        .filter((row: any) => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo" && row.clasificacion === "Costo transporte concreto")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const costoFijo = plantaData
        .filter((row: any) => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo" && row.clasificacion === "Costo Fijo")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const totalOperacional = costoTransporte + costoFijo

      // Calculate plant volume
      const plantVolume = volumeData
        .filter(vol => vol.plant_code === planta)
        .reduce((sum, vol) => sum + vol.volume_m3, 0) +
        cashSalesData
        .filter(sale => sale.plant_code === planta)
        .reduce((sum, sale) => sum + sale.volume_m3, 0)

      const costoUnitarioOperacional = plantVolume > 0 ? totalOperacional / plantVolume : 0

      // Calculate plant income for efficiency calculation
      const plantIncome = plantaData
        .filter((row: any) => row.tipo === "Ingresos")
        .reduce((sum: number, row: any) => sum + (row.monto || 0), 0)

      const eficienciaOperacional = plantIncome > 0 ? 
        ((plantIncome - totalOperacional) / plantIncome) * 100 : 0

      const participacion = totalIncome > 0 ? (totalOperacional / totalIncome) * 100 : 0

      // Calculate REAL volumes for this plant by category
      const plantConcreteVolume = volumeData
        .filter(vol => vol.plant_code === planta && 
                      (vol.category === "Ventas Concreto" || vol.category === "Productos Alternativos"))
        .reduce((sum, vol) => sum + vol.volume_m3, 0) +
        cashSalesData
        .filter(sale => sale.plant_code === planta && sale.category === "Ventas Concreto Cash")
        .reduce((sum, sale) => sum + sale.volume_m3, 0)

      const plantPumpingVolume = volumeData
        .filter(vol => vol.plant_code === planta && vol.category === "Ventas Bombeo")
        .reduce((sum, vol) => sum + vol.volume_m3, 0)

      const plantTotalVolume = plantConcreteVolume + plantPumpingVolume

      // Calculate separate costs for concrete and pumping operations
      const costoBombeo = plantaData
        .filter((row: any) => row.tipo === "Egresos" && 
                             row.sub_categoria === "Costo operativo" && 
                             row.clasificacion === "Costo transporte concreto" &&
                             row.categoria_1 === "Costo servicio de bomba")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const costoTransporteConcreto = costoTransporte - costoBombeo

      // Distribute fixed costs PROPORTIONALLY based on REAL volumes
      const costoFijoConcreto = plantTotalVolume > 0 ? 
        costoFijo * (plantConcreteVolume / plantTotalVolume) : costoFijo * 0.5
      const costoFijoBombeo = plantTotalVolume > 0 ? 
        costoFijo * (plantPumpingVolume / plantTotalVolume) : costoFijo * 0.5

      // Use REAL volumes for unit cost calculation
      const concreteVolume = plantConcreteVolume
      const pumpingVolume = plantPumpingVolume

      const costoUnitarioConcreto = concreteVolume > 0 ? 
        (costoTransporteConcreto + costoFijoConcreto) / concreteVolume : 0
      
      const costoUnitarioBombeo = pumpingVolume > 0 ? 
        (costoBombeo + costoFijoBombeo) / pumpingVolume : 0

      return {
        planta,
        businessUnit: PLANT_TO_UNIT[planta] || "OTROS",
        costoTransporte,
        costoFijo,
        totalOperacional,
        volumenM3: plantVolume,
        costoUnitarioOperacional,
        eficienciaOperacional,
        participacion,
        // New breakdown fields
        costoUnitarioConcreto,
        costoUnitarioBombeo,
        costoBombeo,
        costoFijoConcreto,
        costoFijoBombeo,
        // Add real volume proportions for verification
        volumenConcreto: plantConcreteVolume,
        volumenBombeo: plantPumpingVolume,
        proporcionConcreto: plantTotalVolume > 0 ? (plantConcreteVolume / plantTotalVolume) * 100 : 50,
        proporcionBombeo: plantTotalVolume > 0 ? (plantPumpingVolume / plantTotalVolume) * 100 : 50
      }
    }).sort((a, b) => b.totalOperacional - a.totalOperacional)
  }

  const calculateOperationalTrends = async (allData: any[]): Promise<OperationalTrend[]> => {
    return allData.map(({ report, data }) => {
      const costoTransporte = data
        .filter((row: any) => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo" && row.clasificacion === "Costo transporte concreto")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const costoFijo = data
        .filter((row: any) => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo" && row.clasificacion === "Costo Fijo")
        .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0)

      const totalOperacional = costoTransporte + costoFijo

      const income = data
        .filter((row: any) => row.tipo === "Ingresos")
        .reduce((sum: number, row: any) => sum + (row.monto || 0), 0)

      const eficienciaOperacional = income > 0 ? 
        ((income - totalOperacional) / income) * 100 : 0

      // This would need volume data per period for accurate unit costs
      const costoUnitarioPromedio = totalOperacional > 0 ? totalOperacional / 1000 : 0 // Placeholder

      return {
        period: `${String(report.month).padStart(2, '0')}/${report.year}`,
        costoTransporte,
        costoFijo,
        eficienciaOperacional,
        costoUnitarioPromedio
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

  const formatUnitCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
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
            <p className="text-muted-foreground">Cargando costos operativos...</p>
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
            <h1 className="text-3xl font-bold text-foreground">Costos Operativos</h1>
            <p className="text-muted-foreground mt-1">
              Análisis detallado de eficiencia operativa y estructura de costos
            </p>
          </div>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <OperationalTargetsConfigModal
              currentTargets={targets}
              onTargetsChange={updateTargets}
              totalIncome={totalIncome}
            />
            {hasVolumeData && (
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "participation" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("participation")}
                >
                  <Percent className="h-4 w-4 mr-1" />
                  Participación
                </Button>
                <Button
                  variant={viewMode === "unit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("unit")}
                >
                  <Calculator className="h-4 w-4 mr-1" />
                  Unitarios
                </Button>
              </div>
            )}
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

        {/* Operational Costs Info Section */}


        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {operationalKPIs.map((kpi) => {
            const StatusIcon = kpi.icon
            const TrendIcon = getTrendIcon(kpi.trend)

            return (
              <Card key={kpi.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <StatusIcon className="h-5 w-5 text-gray-600" />
                      <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                    </div>
                    <Badge className={getStatusColor(kpi.status)}>
                      {kpi.status === "excellent" && "Excelente"}
                      {kpi.status === "good" && "Bueno"}
                      {kpi.status === "warning" && "Atención"}
                      {kpi.status === "critical" && "Crítico"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {kpi.value}
                        <span className="text-sm font-normal text-muted-foreground ml-1">{kpi.unit}</span>
                      </div>
                      <div className={`flex items-center mt-1 ${getTrendColor(kpi.trend)}`}>
                        <TrendIcon className="h-3 w-3 mr-1" />
                        <span className="text-xs font-medium">{kpi.change}</span>
                      </div>
                    </div>
                    {kpi.target && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Meta: {kpi.target}{kpi.unit}</div>
                        <Progress 
                          value={Math.min(100, (parseFloat(kpi.value.toString()) / kpi.target) * 100)} 
                          className="w-16 h-2 mt-1"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{kpi.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Analysis Tabs */}
                 <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as "overview" | "plants" | "trends")}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Resumen General</TabsTrigger>
            <TabsTrigger value="plants">Por Planta</TabsTrigger>
            <TabsTrigger value="trends">Tendencias</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Product Cost Comparison */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="h-5 w-5" />
                    Comparativo por Producto
                  </CardTitle>
                  <CardDescription>
                    Costos operativos concreto vs bombeo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={operationalMetrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="category" 
                          tick={{ fontSize: 12 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => formatAxisNumber(value)}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatCompactCurrency(value), 'Costo Total']}
                          labelFormatter={(label) => `${label}`}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            fontSize: '14px',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                        <Bar dataKey="totalCost" fill="#8884d8">
                          {operationalMetrics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-6 space-y-3">
                    {operationalMetrics.map((metric, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: `${metric.color}15` }}>
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: metric.color }}
                          />
                          <span className="text-sm font-semibold text-foreground">{metric.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-foreground">{formatUnitCurrency(metric.unitCost)}/m³</div>
                          <div className="text-xs text-muted-foreground font-medium">
                            {formatCompactCurrency(metric.totalCost)} | {metric.actualPercentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Efficiency and Unit Cost Analysis */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Métricas por Producto
                  </CardTitle>
                  <CardDescription>
                    Costo unitario y eficiencia comparativa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={operationalMetrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="category" 
                          tick={{ fontSize: 12 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          yAxisId="cost"
                          orientation="left"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <YAxis 
                          yAxisId="efficiency"
                          orientation="right"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            if (name === 'Costo Unitario') {
                              return [formatUnitCurrency(value) + '/m³', name]
                            } else {
                              return [`${value.toFixed(1)}%`, name]
                            }
                          }}
                          labelFormatter={(label) => `${label}`}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            fontSize: '14px',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="cost" dataKey="unitCost" fill="#3b82f6" name="Costo Unitario" />
                        <Line yAxisId="efficiency" type="monotone" dataKey="efficiency" stroke="#ef4444" strokeWidth={3} name="Eficiencia" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-6 space-y-4">
                    {operationalMetrics.map((metric, index) => {
                      const isPositive = metric.efficiency >= 0
                      const targetUnitCost = metric.category === "Operación Concreto" ? targets.costoUnitarioConcreto : targets.costoUnitarioBombeo
                      
                      return (
                        <div key={index} className="p-4 rounded-lg border" style={{ borderColor: metric.color, backgroundColor: `${metric.color}08` }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-foreground">{metric.category}</span>
                              <Badge className={getStatusColor(metric.status)} variant="outline">
                                {metric.status === "excellent" && "Excelente"}
                                {metric.status === "good" && "Bueno"}
                                {metric.status === "warning" && "Atención"}
                                {metric.status === "critical" && "Crítico"}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold" style={{ color: metric.color }}>
                                {formatUnitCurrency(metric.unitCost)}/m³
                              </div>
                              <div className="text-xs text-muted-foreground">
                                vs objetivo: ${targetUnitCost}/m³
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Participación: </span>
                              <span className="font-medium">{metric.actualPercentage.toFixed(1)}%</span>
                            </div>
                            <div className={`${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              <span className="text-muted-foreground">Eficiencia: </span>
                              <span className="font-bold">{metric.efficiency > 0 ? '+' : ''}{metric.efficiency.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="plants" className="space-y-8">
            {/* Plants Product Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Concrete Operations by Plant */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-orange-500" />
                    Operación Concreto por Planta
                  </CardTitle>
                  <CardDescription>
                    {viewMode === "unit" ? "Costos unitarios ($/m³)" : "Costos totales por planta"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={plantMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="planta" fontSize={12} />
                        <YAxis 
                          tickFormatter={viewMode === "unit" ? (value) => `$${value}` : formatAxisNumber} 
                          fontSize={12} 
                        />
                        <Tooltip 
                          formatter={(value: number) => [
                            viewMode === "unit" ? `${formatUnitCurrency(value)}/m³` : formatCompactCurrency(value), 
                            ''
                          ]}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            fontSize: '14px',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '14px' }} />
                        <Bar 
                          dataKey={viewMode === "unit" ? "costoUnitarioConcreto" : "costoTransporte"} 
                          fill="#f97316" 
                          name={viewMode === "unit" ? "Costo Unitario Concreto" : "Costo Transporte"} 
                        />
                        {viewMode === "participation" && (
                          <Bar dataKey="costoFijoConcreto" fill="#ff7b00" name="Fijos Asignados Concreto" />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Pumping Operations by Plant */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-purple-500" />
                    Servicio Bombeo por Planta
                  </CardTitle>
                  <CardDescription>
                    {viewMode === "unit" ? "Costos unitarios ($/m³)" : "Costos totales por planta"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={plantMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="planta" fontSize={12} />
                        <YAxis 
                          tickFormatter={viewMode === "unit" ? (value) => `$${value}` : formatAxisNumber} 
                          fontSize={12} 
                        />
                        <Tooltip 
                          formatter={(value: number) => [
                            viewMode === "unit" ? `${formatUnitCurrency(value)}/m³` : formatCompactCurrency(value), 
                            ''
                          ]}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            fontSize: '14px',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '14px' }} />
                        <Bar 
                          dataKey={viewMode === "unit" ? "costoUnitarioBombeo" : "costoBombeo"} 
                          fill="#8b5cf6" 
                          name={viewMode === "unit" ? "Costo Unitario Bombeo" : "Costo Bombeo"} 
                        />
                        {viewMode === "participation" && (
                          <Bar dataKey="costoFijoBombeo" fill="#a855f7" name="Fijos Asignados Bombeo" />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Plant Performance Comparison */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Comparativo Detallado por Planta
                </CardTitle>
                <CardDescription>
                  Análisis separado de costos operativos por producto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {plantMetrics.map((plant, index) => (
                    <div key={plant.planta} className="p-6 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 transition-all border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <span className="text-sm font-bold text-white">
                              {plant.planta.includes('SIN') ? 'SC' : plant.planta}
                            </span>
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-xl">
                              {plant.planta === 'SIN CLASIFICACION' ? 'SIN CLASIFICACIÓN' : plant.planta}
                            </div>
                            <div className="text-sm text-muted-foreground font-medium">{plant.businessUnit}</div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(
                          plant.eficienciaOperacional >= 75 ? "excellent" :
                          plant.eficienciaOperacional >= 65 ? "good" :
                          plant.eficienciaOperacional >= 55 ? "warning" : "critical"
                        )} variant="outline">
                          {plant.eficienciaOperacional >= 75 ? "Excelente" :
                           plant.eficienciaOperacional >= 65 ? "Bueno" :
                           plant.eficienciaOperacional >= 55 ? "Atención" : "Crítico"}
                        </Badge>
                      </div>
                      
                      {/* Volume Proportions Info */}
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-xs font-medium text-blue-800 mb-2">Distribución de Volumen y Costos Fijos:</div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Concreto:</span>
                            <span className="font-bold text-blue-800">
                              {plant.proporcionConcreto.toFixed(1)}% vol → {((plant.costoFijoConcreto / plant.costoFijo) * 100).toFixed(1)}% fijos
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Bombeo:</span>
                            <span className="font-bold text-blue-800">
                              {plant.proporcionBombeo.toFixed(1)}% vol → {((plant.costoFijoBombeo / plant.costoFijo) * 100).toFixed(1)}% fijos
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Product Breakdown */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Concreto Costs */}
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Truck className="h-5 w-5 text-orange-600" />
                            <h4 className="font-semibold text-orange-800">Operación Concreto</h4>
                          </div>
                          <div className="space-y-3">
                            <div className="text-center">
                              <div className="font-bold text-orange-700 text-lg">
                                {viewMode === "unit" ? 
                                  `${formatUnitCurrency(plant.costoUnitarioConcreto)}/m³` : 
                                  formatCompactCurrency(plant.costoTransporte - plant.costoBombeo + plant.costoFijoConcreto)
                                }
                              </div>
                              <div className="text-xs text-orange-600 font-medium">
                                {viewMode === "unit" ? "costo unitario total" : "costo total"}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-center">
                                <div className="font-medium text-orange-700">
                                  {formatCompactCurrency(plant.costoTransporte - plant.costoBombeo)}
                                </div>
                                <div className="text-orange-600">transporte real</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-orange-700">
                                  {formatCompactCurrency(plant.costoFijoConcreto)}
                                </div>
                                <div className="text-orange-600">fijos asignados</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bombeo Costs */}
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Settings className="h-5 w-5 text-purple-600" />
                            <h4 className="font-semibold text-purple-800">Servicio Bombeo</h4>
                          </div>
                          <div className="space-y-3">
                            <div className="text-center">
                              <div className="font-bold text-purple-700 text-lg">
                                {viewMode === "unit" ? 
                                  `${formatUnitCurrency(plant.costoUnitarioBombeo)}/m³` : 
                                  formatCompactCurrency(plant.costoBombeo + plant.costoFijoBombeo)
                                }
                              </div>
                              <div className="text-xs text-purple-600 font-medium">
                                {viewMode === "unit" ? "costo unitario total" : "costo total"}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-center">
                                <div className="font-medium text-purple-700">
                                  {formatCompactCurrency(plant.costoBombeo)}
                                </div>
                                <div className="text-purple-600">servicio bomba</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-purple-700">
                                  {formatCompactCurrency(plant.costoFijoBombeo)}
                                </div>
                                <div className="text-purple-600">fijos asignados</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Summary Metrics */}
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="font-bold text-foreground text-lg">{formatCompactCurrency(plant.totalOperacional)}</div>
                            <div className="text-xs text-muted-foreground font-medium">total operativo</div>
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-lg">{plant.eficienciaOperacional.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground font-medium">eficiencia</div>
                          </div>
                          {plant.volumenM3 > 0 && (
                            <div>
                              <div className="font-bold text-foreground text-lg">{formatAxisNumber(plant.volumenM3)}</div>
                              <div className="text-xs text-muted-foreground font-medium">m³ procesados</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-8">
            {/* Operational Trends */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Tendencias de Costos Operativos
                </CardTitle>
                <CardDescription>
                  Evolución histórica de categorías operativas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={operationalTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="period" fontSize={12} />
                      <YAxis tickFormatter={formatAxisNumber} fontSize={12} />
                      <Tooltip 
                        formatter={(value: number) => [formatCompactCurrency(value), '']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '14px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="costoTransporte" stroke="#f97316" strokeWidth={2} name="Costo Transporte Concreto" />
                      <Line type="monotone" dataKey="costoFijo" stroke="#3b82f6" strokeWidth={2} name="Costos Fijos Operativos" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Efficiency Trends */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Tendencia de Eficiencia Operativa
                </CardTitle>
                <CardDescription>
                  Evolución del rendimiento operativo general
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={operationalTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="period" fontSize={12} />
                      <YAxis yAxisId="left" tickFormatter={formatAxisNumber} fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} fontSize={12} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === "eficienciaOperacional" ? `${value.toFixed(1)}%` : formatCompactCurrency(value), 
                          ''
                        ]}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '14px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Legend />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="costoTransporte" 
                        stackId="1"
                        stroke="#f97316" 
                        fill="#f97316" 
                        fillOpacity={0.6}
                        name="Transporte"
                      />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="costoFijo" 
                        stackId="1"
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.6}
                        name="Costos Fijos"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="eficienciaOperacional" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        name="Eficiencia (%)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Management Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-lg border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Costo Total Operativo</p>
                  <p className="text-2xl font-bold text-orange-700">{formatCompactCurrency(totalOperationalCosts)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalIncome > 0 ? `${((totalOperationalCosts / totalIncome) * 100).toFixed(1)}% de ingresos` : 'N/A'}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Margen Operativo</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {totalIncome > 0 ? `${(((totalIncome - totalOperationalCosts) / totalIncome) * 100).toFixed(1)}%` : '0%'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">después de operación</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plantas con Control</p>
                  <p className="text-2xl font-bold text-green-700">
                    {plantMetrics.filter(p => p.participacion <= 45).length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">de {plantMetrics.length} total</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Análisis Histórico</p>
                  <p className="text-2xl font-bold text-purple-700">{selectedPeriod}</p>
                  <p className="text-xs text-muted-foreground mt-1">meses de tendencia</p>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unit Cost Composition Analysis */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-indigo-600" />
              Composición del Costo Unitario Operativo
            </CardTitle>
            <CardDescription>
              Desglose detallado de la estructura del costo unitario entre costos fijos y transporte
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              if (currentOperationalData.length === 0 || !hasVolumeData) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Se requieren datos de volumen para calcular costos unitarios</p>
                  </div>
                )
              }

                             // Calculate unit cost composition using the same logic as operational metrics
               const getUnitCostComposition = () => {
                 // Get volume breakdown first
                 const volumeConcreto = volumeData
                   .filter(vol => vol.category === "Ventas Concreto")
                   .reduce((sum, vol) => sum + vol.volume_m3, 0)
                 
                 const volumeAlternativos = volumeData
                   .filter(vol => vol.category === "Productos Alternativos")
                   .reduce((sum, vol) => sum + vol.volume_m3, 0)

                 const cashVolumeConcreto = cashSalesData
                   .filter(sale => sale.category === "Ventas Concreto Cash")
                   .reduce((sum, sale) => sum + sale.volume_m3, 0)

                 const volumePumping = volumeData
                   .filter(vol => vol.category === "Ventas Bombeo")
                   .reduce((sum, vol) => sum + vol.volume_m3, 0)

                 const concreteVolume = volumeConcreto + volumeAlternativos + cashVolumeConcreto
                 const pumpingVolume = volumePumping
                 const totalVolume = concreteVolume + pumpingVolume

                 if (totalVolume === 0) return []

                 // Calculate costs using the same logic as the operational metrics
                 // Pumping-specific costs (only "Costo servicio de bomba")
                 const pumpingServiceCosts = currentOperationalData
                   .filter(row => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo" && 
                                  row.clasificacion === "Costo transporte concreto" && 
                                  row.categoria_1 === "Costo servicio de bomba")
                   .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)

                 // Concrete transport costs (all transport costs EXCEPT pumping service)
                 const concreteTransportCosts = currentOperationalData
                   .filter(row => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo" && 
                                  row.clasificacion === "Costo transporte concreto" && 
                                  row.categoria_1 !== "Costo servicio de bomba")
                   .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)

                 // Fixed costs (distributed proportionally between concrete and pumping)
                 const totalFixedCosts = currentOperationalData
                   .filter(row => row.tipo === "Egresos" && row.sub_categoria === "Costo operativo" && 
                                  row.clasificacion === "Costo Fijo")
                   .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)

                 // Allocate fixed costs proportionally based on volume
                 const concreteFixedCosts = totalVolume > 0 ? totalFixedCosts * (concreteVolume / totalVolume) : 0
                 const pumpingFixedCosts = totalVolume > 0 ? totalFixedCosts * (pumpingVolume / totalVolume) : 0

                 // Calculate unit costs using the SAME LOGIC as operational metrics
                 // IMPORTANT: Divide by specific volume for each operation, not total volume
                 const concreteTransportUnit = concreteVolume > 0 ? concreteTransportCosts / concreteVolume : 0
                 const concreteFixedUnit = concreteVolume > 0 ? concreteFixedCosts / concreteVolume : 0
                 const pumpServiceUnit = pumpingVolume > 0 ? pumpingServiceCosts / pumpingVolume : 0
                 const pumpFixedUnit = pumpingVolume > 0 ? pumpingFixedCosts / pumpingVolume : 0

                 // Total concrete operation unit cost - SAME LOGIC as operational metrics
                 const totalConcreteUnit = concreteVolume > 0 ? (concreteTransportCosts + concreteFixedCosts) / concreteVolume : 0
                 // Total pumping operation unit cost - SAME LOGIC as operational metrics
                 const totalPumpingUnit = pumpingVolume > 0 ? (pumpingServiceCosts + pumpingFixedCosts) / pumpingVolume : 0
                 
                 // Calculate total unit cost as weighted average, not simple sum
                 const totalUnitCost = totalVolume > 0 ? 
                   ((concreteTransportCosts + concreteFixedCosts + pumpingServiceCosts + pumpingFixedCosts) / totalVolume) : 0

                 return [
                   {
                     category: "Operación Concreto",
                     subcategory: "Transporte + Fijos Asignados",
                     unitCost: totalConcreteUnit,
                     totalCost: concreteTransportCosts + concreteFixedCosts,
                     percentage: (concreteTransportCosts + concreteFixedCosts + pumpingServiceCosts + pumpingFixedCosts) > 0 ? 
                       (((concreteTransportCosts + concreteFixedCosts) / (concreteTransportCosts + concreteFixedCosts + pumpingServiceCosts + pumpingFixedCosts)) * 100) : 0,
                     color: "#f97316", // Orange - matching operational metrics
                     description: "Costos de transporte real + fijos asignados al concreto",
                     // Debug info
                     debugInfo: {
                       volume: concreteVolume,
                       fixedCosts: concreteFixedCosts,
                       fixedPercent: totalFixedCosts > 0 ? (concreteFixedCosts / totalFixedCosts) * 100 : 0,
                       volumePercent: totalVolume > 0 ? (concreteVolume / totalVolume) * 100 : 0
                     },
                     breakdown: [
                       {
                         name: "Transporte Concreto",
                         unitCost: concreteTransportUnit,
                         totalCost: concreteTransportCosts,
                         color: "#fb923c"
                       },
                       {
                         name: "Fijos Asignados Concreto",
                         unitCost: concreteFixedUnit,
                         totalCost: concreteFixedCosts,
                         color: "#fed7aa"
                       }
                     ]
                   },
                   {
                     category: "Servicio Bombeo",
                     subcategory: "Bomba + Fijos Asignados",
                     unitCost: totalPumpingUnit,
                     totalCost: pumpingServiceCosts + pumpingFixedCosts,
                     percentage: (concreteTransportCosts + concreteFixedCosts + pumpingServiceCosts + pumpingFixedCosts) > 0 ? 
                       (((pumpingServiceCosts + pumpingFixedCosts) / (concreteTransportCosts + concreteFixedCosts + pumpingServiceCosts + pumpingFixedCosts)) * 100) : 0,
                     color: "#8b5cf6", // Purple - matching operational metrics
                     description: "Costos de servicio bomba + fijos asignados al bombeo",
                     // Debug info
                     debugInfo: {
                       volume: pumpingVolume,
                       fixedCosts: pumpingFixedCosts,
                       fixedPercent: totalFixedCosts > 0 ? (pumpingFixedCosts / totalFixedCosts) * 100 : 0,
                       volumePercent: totalVolume > 0 ? (pumpingVolume / totalVolume) * 100 : 0
                     },
                     breakdown: [
                       {
                         name: "Servicio Bomba",
                         unitCost: pumpServiceUnit,
                         totalCost: pumpingServiceCosts,
                         color: "#a78bfa"
                       },
                       {
                         name: "Fijos Asignados Bombeo",
                         unitCost: pumpFixedUnit,
                         totalCost: pumpingFixedCosts,
                         color: "#ddd6fe"
                       }
                     ]
                   }
                 ]
               }

              const unitCostData = getUnitCostComposition()
              const totalUnitCost = unitCostData.reduce((sum, item) => sum + item.unitCost, 0)

              return (
                                 <div className="space-y-8">
                   {/* Unit Cost Breakdown Chart */}
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="h-80">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={unitCostData}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={100}
                             paddingAngle={5}
                             dataKey="unitCost"
                             label={({ value, percentage }) => `${formatUnitCurrency(value)}/m³ (${percentage.toFixed(1)}%)`}
                             labelLine={false}
                           >
                             {unitCostData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                           </Pie>
                           <Tooltip 
                             formatter={(value) => [`${formatUnitCurrency(value as number)}/m³`, 'Costo Unitario']}
                             labelFormatter={(label) => `${label}`}
                           />
                           <Legend />
                         </PieChart>
                       </ResponsiveContainer>
                     </div>

                     <div className="h-80">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={unitCostData} layout="horizontal" margin={{ left: 80 }}>
                           <CartesianGrid strokeDasharray="3 3" />
                           <XAxis 
                             type="number" 
                             tickFormatter={(value) => `$${value}`}
                             domain={[0, 'dataMax']}
                           />
                           <YAxis 
                             type="category" 
                             dataKey="category" 
                             width={150} 
                             tick={{ fontSize: 11 }} 
                           />
                           <Tooltip 
                             formatter={(value) => [`${formatUnitCurrency(value as number)}/m³`, 'Costo Unitario']}
                           />
                           <Bar dataKey="unitCost" radius={[0, 4, 4, 0]}>
                             {unitCostData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                           </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                     </div>
                   </div>

                  {/* Cost Summary Cards */}
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
                                         <div className="text-center mb-6">
                       <h3 className="text-2xl font-bold text-indigo-800">Costo Unitario Total Operativo</h3>
                       <div className="text-4xl font-bold text-indigo-600 mt-2">{formatUnitCurrency(totalUnitCost)}/m³</div>
                       <p className="text-sm text-indigo-600 mt-1">Promedio ponderado por volumen</p>
                       
                       {/* Debug info panel */}
                       <div className="mt-4 p-3 bg-white rounded-lg text-xs border">
                         <div className="font-semibold text-gray-700 mb-2 text-center">🔍 Verificación de Asignación Proporcional</div>
                         <div className="grid grid-cols-2 gap-4">
                           {unitCostData.map((item, index) => (
                             <div key={index} className="text-left">
                               <div className="font-medium mb-1" style={{ color: item.color }}>{item.category}</div>
                               {item.debugInfo && (
                                 <div className="space-y-1">
                                   <div className="text-gray-600">Vol: <span className="font-bold">{item.debugInfo.volume.toLocaleString()}m³</span> ({item.debugInfo.volumePercent.toFixed(1)}%)</div>
                                   <div className="text-gray-600">Fijos: <span className="font-bold">{formatCompactCurrency(item.debugInfo.fixedCosts)}</span> ({item.debugInfo.fixedPercent.toFixed(1)}%)</div>
                                   <div className="text-gray-600">$/m³ fijos: <span className="font-bold">{formatUnitCurrency(item.debugInfo.fixedCosts / item.debugInfo.volume)}</span></div>
                                 </div>
                               )}
                             </div>
                           ))}
                         </div>
                         <div className="mt-2 pt-2 border-t text-center text-gray-500">
                           Si la asignación es proporcional, los porcentajes de volumen y fijos deben coincidir
                         </div>
                       </div>
                     </div>

                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {unitCostData.map((item, index) => (
                         <div key={index} className="bg-white p-6 rounded-lg border-l-4 shadow-sm" style={{ borderColor: item.color }}>
                           <div className="flex items-center justify-between mb-4">
                             <div>
                               <h4 className="font-bold text-gray-800 text-lg">{item.category}</h4>
                               <p className="text-sm text-gray-600">{item.subcategory}</p>
                             </div>
                             <div className="w-6 h-6 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                           </div>
                           
                           <div className="text-center mb-4">
                             <div className="text-3xl font-bold" style={{ color: item.color }}>
                               {formatUnitCurrency(item.unitCost)}/m³
                             </div>
                             <div className="text-sm text-gray-500 mt-1">
                               {formatCompactCurrency(item.totalCost)} total
                             </div>
                           </div>

                           <div className="mb-4">
                             <div className="flex justify-between text-sm mb-2">
                               <span className="text-gray-600">Participación en costo total</span>
                               <span className="font-bold text-gray-800">{item.percentage.toFixed(1)}%</span>
                             </div>
                             <Progress value={item.percentage} className="h-3" />
                           </div>

                           {/* Breakdown details */}
                           {item.breakdown && (
                             <div className="space-y-2 pt-3 border-t border-gray-200">
                               <p className="text-xs font-medium text-gray-700 mb-2">Composición:</p>
                               {item.breakdown.map((breakdownItem, bIndex) => (
                                 <div key={bIndex} className="flex justify-between items-center text-sm">
                                   <div className="flex items-center space-x-2">
                                     <div 
                                       className="w-3 h-3 rounded-full" 
                                       style={{ backgroundColor: breakdownItem.color }}
                                     ></div>
                                     <span className="text-gray-600">{breakdownItem.name}</span>
                                   </div>
                                   <span className="font-medium text-gray-800">
                                     {formatUnitCurrency(breakdownItem.unitCost)}/m³
                                   </span>
                                 </div>
                               ))}
                             </div>
                           )}

                           <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">{item.description}</p>
                         </div>
                       ))}
                     </div>
                  </div>

                                     {/* Segmentation Analysis */}
                   <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                     <h4 className="text-xl font-bold text-gray-800 mb-6 text-center">
                       Análisis de Segmentación por Operación
                     </h4>
                     
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       {/* Concrete Operations */}
                       <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200 shadow-sm">
                         <h5 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                           <Truck className="h-5 w-5" />
                           Operación Concreto
                         </h5>
                         
                         {(() => {
                           const concreteData = unitCostData.find(item => item.category === "Operación Concreto")
                           if (!concreteData) return <p className="text-orange-600">No hay datos disponibles</p>
                           
                           return (
                             <div className="space-y-4">
                               <div className="text-center bg-white p-4 rounded-lg shadow-sm">
                                 <div className="text-2xl font-bold text-orange-700">
                                   {formatUnitCurrency(concreteData.unitCost)}/m³
                                 </div>
                                 <div className="text-sm text-orange-600">Costo Total Operación Concreto</div>
                                 <div className="text-xs text-gray-500 mt-1">
                                   {concreteData.percentage.toFixed(1)}% del costo operativo total
                                 </div>
                               </div>
                               
                               {concreteData.breakdown?.map((item, index) => (
                                 <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                                   <div className="flex items-center justify-between mb-2">
                                     <div className="flex items-center space-x-2">
                                       <div 
                                         className="w-3 h-3 rounded-full" 
                                         style={{ backgroundColor: item.color }}
                                       ></div>
                                       <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                     </div>
                                     <span className="font-bold text-orange-700">
                                       {formatUnitCurrency(item.unitCost)}/m³
                                     </span>
                                   </div>
                                   <div className="text-xs text-gray-500">
                                     Total: {formatCompactCurrency(item.totalCost)}
                                   </div>
                                 </div>
                               ))}
                             </div>
                           )
                         })()}
                       </div>

                       {/* Pumping Operations */}
                       <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200 shadow-sm">
                         <h5 className="font-bold text-purple-800 mb-4 flex items-center gap-2">
                           <Settings className="h-5 w-5" />
                           Servicio Bombeo
                         </h5>
                         
                         {(() => {
                           const pumpingData = unitCostData.find(item => item.category === "Servicio Bombeo")
                           if (!pumpingData) return <p className="text-purple-600">No hay datos disponibles</p>
                           
                           return (
                             <div className="space-y-4">
                               <div className="text-center bg-white p-4 rounded-lg shadow-sm">
                                 <div className="text-2xl font-bold text-purple-700">
                                   {formatUnitCurrency(pumpingData.unitCost)}/m³
                                 </div>
                                 <div className="text-sm text-purple-600">Costo Total Servicio Bombeo</div>
                                 <div className="text-xs text-gray-500 mt-1">
                                   {pumpingData.percentage.toFixed(1)}% del costo operativo total
                                 </div>
                               </div>
                               
                               {pumpingData.breakdown?.map((item, index) => (
                                 <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                                   <div className="flex items-center justify-between mb-2">
                                     <div className="flex items-center space-x-2">
                                       <div 
                                         className="w-3 h-3 rounded-full" 
                                         style={{ backgroundColor: item.color }}
                                       ></div>
                                       <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                     </div>
                                     <span className="font-bold text-purple-700">
                                       {formatUnitCurrency(item.unitCost)}/m³
                                     </span>
                                   </div>
                                   <div className="text-xs text-gray-500">
                                     Total: {formatCompactCurrency(item.totalCost)}
                                   </div>
                                 </div>
                               ))}
                               
                               <div className="text-xs text-purple-600 bg-purple-100 p-2 rounded mt-3">
                                 * El servicio bomba está clasificado como "transporte de concreto" pero es conceptualmente diferente
                               </div>
                             </div>
                           )
                         })()}
                       </div>
                     </div>
                   </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* Cost Composition Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transport Costs Composition */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-orange-500" />
                Composición Costos Transporte Concreto
              </CardTitle>
              <CardDescription>
                Distribución detallada por categoría de transporte
              </CardDescription>
            </CardHeader>
                          <CardContent>
                {(() => {
                  // Calculate real transport cost composition using gerencia categories
                  const getTransportComposition = () => {
                    if (currentOperationalData.length === 0) return []
                    
                    // Filter for transport costs excluding pump service
                    const transportData = currentOperationalData.filter(row => 
                      row.tipo === "Egresos" && 
                      row.sub_categoria === "Costo operativo" && 
                      row.clasificacion === "Costo transporte concreto" &&
                      row.categoria_1 !== "Costo servicio de bomba"
                    )
                    
                    // Group by categoria_1 (real gerencia categories)
                    const transportByCategory = transportData.reduce((acc: Record<string, number>, row: any) => {
                      const category = row.categoria_1 || "Sin categoría"
                      acc[category] = (acc[category] || 0) + Math.abs(row.monto || 0)
                      return acc
                    }, {})

                    const totalTransport = Object.values(transportByCategory).reduce((sum: number, val: number) => sum + val, 0)
                    
                    return Object.entries(transportByCategory).map(([name, value]) => ({
                      name,
                      value: value as number,
                      percentage: totalTransport > 0 ? ((value as number / totalTransport) * 100) : 0
                    }))
                  }
                  
                  const transportChartData = getTransportComposition()

                return transportChartData.length > 0 ? (
                  <div className="space-y-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={transportChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {transportChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${25 + index * 40}, 70%, 60%)`} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-3">
                      {transportChartData.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-orange-50 border-l-4 border-orange-300">
                          <span className="font-medium text-orange-800">{item.name}</span>
                          <div className="text-right">
                            <div className="font-bold text-orange-600">{formatCompactCurrency(item.value)}</div>
                            <div className="text-xs text-orange-500">{item.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Sin datos de costos de transporte</p>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* Fixed Costs Composition */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500" />
                Composición Costos Fijos
              </CardTitle>
              <CardDescription>
                Distribución detallada por categoría de costos fijos
              </CardDescription>
            </CardHeader>
                          <CardContent>
                {(() => {
                  // Calculate real fixed cost composition using gerencia categories
                  const getFixedComposition = () => {
                    if (currentOperationalData.length === 0) return []
                    
                    // Filter for fixed costs
                    const fixedData = currentOperationalData.filter(row => 
                      row.tipo === "Egresos" && 
                      row.sub_categoria === "Costo operativo" && 
                      row.clasificacion === "Costo Fijo"
                    )
                    
                    // Group by categoria_1 (real gerencia categories)
                    const fixedByCategory = fixedData.reduce((acc: Record<string, number>, row: any) => {
                      const category = row.categoria_1 || "Sin categoría"
                      acc[category] = (acc[category] || 0) + Math.abs(row.monto || 0)
                      return acc
                    }, {})

                    const totalFixed = Object.values(fixedByCategory).reduce((sum: number, val: number) => sum + val, 0)
                    
                    return Object.entries(fixedByCategory).map(([name, value]) => ({
                      name,
                      value: value as number,
                      percentage: totalFixed > 0 ? ((value as number / totalFixed) * 100) : 0
                    }))
                  }
                  
                  const fixedChartData = getFixedComposition()

                return fixedChartData.length > 0 ? (
                  <div className="space-y-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={fixedChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {fixedChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${200 + index * 40}, 70%, 60%)`} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-3">
                      {fixedChartData.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-blue-50 border-l-4 border-blue-300">
                          <span className="font-medium text-blue-800">{item.name}</span>
                          <div className="text-right">
                            <div className="font-bold text-blue-600">{formatCompactCurrency(item.value)}</div>
                            <div className="text-xs text-blue-500">{item.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Sin datos de costos fijos</p>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Product Performance Dashboard */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Dashboard Operativo por Producto
            </CardTitle>
            <CardDescription>
              Métricas clave y comparativo de rendimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Concreto Performance */}
              {operationalMetrics.filter(m => m.category === "Operación Concreto").map((metric, index) => (
                <div key={index} className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <Truck className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-orange-800">Operación Concreto</h3>
                        <p className="text-sm text-orange-600">Transporte + Fijos Asignados</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(metric.status)}>
                      {metric.status === "excellent" && "Excelente"}
                      {metric.status === "good" && "Bueno"}
                      {metric.status === "warning" && "Atención"}
                      {metric.status === "critical" && "Crítico"}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-700">{formatUnitCurrency(metric.unitCost)}</div>
                      <div className="text-sm text-orange-600">$/m³</div>
                      <div className="text-xs text-gray-500">Objetivo: ${targets.costoUnitarioConcreto}/m³</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${metric.efficiency >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {metric.efficiency >= 0 ? '+' : ''}{metric.efficiency.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Eficiencia</div>
                      <div className="text-xs text-gray-500">vs objetivo</div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Participación en ingresos</span>
                      <span className="font-semibold">{metric.actualPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metric.actualPercentage} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Costo Total: {formatCompactCurrency(metric.totalCost)}</span>
                      <span>Meta: {metric.targetPercentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Bombeo Performance */}
              {operationalMetrics.filter(m => m.category === "Servicio Bombeo").map((metric, index) => (
                <div key={index} className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <Settings className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-purple-800">Servicio Bombeo</h3>
                        <p className="text-sm text-purple-600">Bomba + Fijos Asignados</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(metric.status)}>
                      {metric.status === "excellent" && "Excelente"}
                      {metric.status === "good" && "Bueno"}
                      {metric.status === "warning" && "Atención"}
                      {metric.status === "critical" && "Crítico"}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-700">{formatUnitCurrency(metric.unitCost)}</div>
                      <div className="text-sm text-purple-600">$/m³</div>
                      <div className="text-xs text-gray-500">Objetivo: ${targets.costoUnitarioBombeo}/m³</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${metric.efficiency >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {metric.efficiency >= 0 ? '+' : ''}{metric.efficiency.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Eficiencia</div>
                      <div className="text-xs text-gray-500">vs objetivo</div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Participación en ingresos</span>
                      <span className="font-semibold">{metric.actualPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metric.actualPercentage} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Costo Total: {formatCompactCurrency(metric.totalCost)}</span>
                      <span>Meta: {metric.targetPercentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 