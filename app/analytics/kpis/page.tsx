"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { SupabaseStorageService, FinancialReport } from "@/lib/supabase/storage"
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
  Minus,
  Calculator
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { MetricsInfoTooltip, KPIsInfoSection } from "@/components/analytics/kpis/metrics-info-tooltip"
import { KPITargetsConfigModal, useKPITargets } from "@/components/analytics/kpis/targets-config-modal"

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
  const [volumeData, setVolumeData] = useState<any[]>([])
  const [cashSalesData, setCashSalesData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"unit" | "participation">("participation") // Toggle between unit costs and participation
  const [hasVolumeData, setHasVolumeData] = useState(false)
  
  const storageService = new SupabaseStorageService()
  const { toast } = useToast()
  const { targets, updateTargets } = useKPITargets()

  useEffect(() => {
    loadKPIData()
  }, [selectedPeriod])

  useEffect(() => {
    // Recalculate KPIs when view mode changes (only if data is already loaded)
    if (kpiMetrics.length > 0 && reports.length > 0) {
      loadKPIData()
    }
  }, [viewMode])

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

      // Load and aggregate volume data from ALL selected reports (same as financial data)
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

      // Aggregate volume data by category and plant (similar to financial data aggregation)
      const aggregatedVolumeData = aggregateVolumeData(allVolumeData)
      const aggregatedCashSalesData = aggregateCashSalesData(allCashSalesData)

      // Debug logging to verify volume aggregation
      console.log(`KPIs: Analyzing ${reportsToAnalyze.length} months of data`)
      console.log(`KPIs: Raw volume data points: ${allVolumeData.length}`)
      console.log(`KPIs: Aggregated volume data points: ${aggregatedVolumeData.length}`)
      
      // Calculate total volumes for verification
      const totalConcretoFromAggregated = aggregatedVolumeData
        .filter(vol => vol.category === "Ventas Concreto")
        .reduce((sum, vol) => sum + vol.volume_m3, 0)
      const totalAlternativosFromAggregated = aggregatedVolumeData
        .filter(vol => vol.category === "Productos Alternativos")
        .reduce((sum, vol) => sum + vol.volume_m3, 0)
      const totalMaterialConsumingFromAggregated = totalConcretoFromAggregated + totalAlternativosFromAggregated
      
      console.log(`KPIs: Total aggregated concrete volume: ${totalConcretoFromAggregated.toFixed(2)} m³`)
      console.log(`KPIs: Total aggregated alternatives volume: ${totalAlternativosFromAggregated.toFixed(2)} m³`)
      console.log(`KPIs: Total material-consuming volume: ${totalMaterialConsumingFromAggregated.toFixed(2)} m³`)

      setVolumeData(aggregatedVolumeData)
      setCashSalesData(aggregatedCashSalesData)
      setHasVolumeData(foundVolumeData)

      // Aggregate data from all selected reports
      const aggregatedData = aggregateReportsData(allData)

      // Calculate KPIs from aggregated data with volume integration
      const latestReportData = allData[0]
      const currentViewMode = foundVolumeData ? viewMode : "participation"
      const metrics = calculateKPIMetrics(aggregatedData, latestReportData.report, allData, aggregatedVolumeData, aggregatedCashSalesData, currentViewMode, targets)
      setKpiMetrics(metrics)

      // Calculate plant performance using aggregated data
      const plantPerf = calculatePlantPerformance(aggregatedData)
      setPlantPerformance(plantPerf)

      // Calculate business unit performance using aggregated data
      const businessUnitPerf = calculateBusinessUnitPerformance(aggregatedData)
      setBusinessUnitPerformance(businessUnitPerf)

      // Calculate category breakdowns using aggregated data
      const { income, expense } = calculateCategoryBreakdowns(aggregatedData)
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

  // CRITICAL FIX: Volume data must be aggregated from ALL periods, not just first period found
  // Previous bug: Financial data was aggregated from multiple months, but volume data was only
  // taken from the first month that had data, causing inflated unit costs.
  // Fix: Aggregate volume data the same way as financial data across all selected periods.
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

  // Function to aggregate cash sales data from multiple periods
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

  const calculateKPIMetrics = (data: any[], report: FinancialReport, allData: any[], volumeData: any[] = [], cashSalesData: any[] = [], viewMode: "unit" | "participation" = "participation", kpiTargets: any): KPIMetric[] => {
    // Helper function to determine status based on configurable targets
    const getMetricStatus = (value: number, type: 'margen' | 'crecimiento' | 'eficiencia' | 'participacion' | 'egresos') => {
      switch (type) {
        case 'margen':
          if (value >= kpiTargets.margenUtilidadExcelente) return "excellent"
          if (value >= kpiTargets.margenUtilidadObjetivo) return "good"
          if (value >= kpiTargets.margenUtilidadMinimo) return "warning"
          return "critical"
        case 'crecimiento':
          if (value >= kpiTargets.crecimientoExcelente) return "excellent"
          if (value >= kpiTargets.crecimientoObjetivo) return "good"
          if (value >= kpiTargets.crecimientoMinimo) return "warning"
          return "critical"
        case 'eficiencia':
          if (value >= kpiTargets.eficienciaExcelente) return "excellent"
          if (value >= kpiTargets.eficienciaObjetivo) return "good"
          if (value >= kpiTargets.eficienciaMinima) return "warning"
          return "critical"
        case 'participacion':
          if (value >= kpiTargets.participacionExcelente) return "excellent"
          if (value >= kpiTargets.participacionObjetivo) return "good"
          if (value >= kpiTargets.participacionMinima) return "warning"
          return "critical"
        case 'egresos':
          if (value <= kpiTargets.egresosExcelente) return "excellent"
          if (value <= kpiTargets.egresosObjetivo) return "good"
          if (value <= kpiTargets.egresosMaximo) return "warning"
          return "critical"
        default:
          return "warning"
      }
    }

    // Calculate growth rates using the same methodology as business-units
    const calculateGrowthRates = (allData: any[]): { ingresos: number; egresos: number; utilidad: number; margen: number } => {
      if (allData.length < 4) {
        // Fallback: compare last period with previous one
        if (allData.length >= 2) {
          const currentData = allData[0].data
          const previousData = allData[1].data
          
          const currentIngresos = currentData
            .filter((row: any) => row.tipo === "Ingresos")
            .reduce((sum: number, row: any) => sum + (row.monto || 0), 0)
          
          const currentEgresos = Math.abs(currentData
            .filter((row: any) => row.tipo === "Egresos")
            .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0))
          
          const currentUtilidad = currentIngresos - currentEgresos
          const currentMargen = currentIngresos > 0 ? (currentUtilidad / currentIngresos) * 100 : 0
          
          const prevIngresos = previousData
            .filter((row: any) => row.tipo === "Ingresos")
            .reduce((sum: number, row: any) => sum + (row.monto || 0), 0)
          
          const prevEgresos = Math.abs(previousData
            .filter((row: any) => row.tipo === "Egresos")
            .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0))
          
          const prevUtilidad = prevIngresos - prevEgresos
          const prevMargen = prevIngresos > 0 ? (prevUtilidad / prevIngresos) * 100 : 0
          
          return {
            ingresos: prevIngresos > 0 ? ((currentIngresos - prevIngresos) / prevIngresos) * 100 : 0,
            egresos: prevEgresos > 0 ? ((currentEgresos - prevEgresos) / prevEgresos) * 100 : 0,
            utilidad: prevUtilidad !== 0 ? ((currentUtilidad - prevUtilidad) / Math.abs(prevUtilidad)) * 100 : 0,
            margen: currentMargen - prevMargen
          }
        }
        return { ingresos: 0, egresos: 0, utilidad: 0, margen: 0 }
      }
      
      // Calculate metrics for each period
      const periodMetrics = allData.map(({ data }) => {
        const ingresos = data
          .filter((row: any) => row.tipo === "Ingresos")
          .reduce((sum: number, row: any) => sum + (row.monto || 0), 0)
        
        const egresos = Math.abs(data
          .filter((row: any) => row.tipo === "Egresos")
          .reduce((sum: number, row: any) => sum + Math.abs(row.monto || 0), 0))
        
        const utilidad = ingresos - egresos
        const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0
        
        return { ingresos, egresos, utilidad, margen }
      })
      
      // Divide into two halves for comparison
      const halfLength = Math.floor(periodMetrics.length / 2)
      const recentPeriods = periodMetrics.slice(0, halfLength) // More recent
      const previousPeriods = periodMetrics.slice(halfLength) // Earlier
      
      // Calculate averages for each half
      const recentAvg = {
        ingresos: recentPeriods.reduce((sum, p) => sum + p.ingresos, 0) / recentPeriods.length,
        egresos: recentPeriods.reduce((sum, p) => sum + p.egresos, 0) / recentPeriods.length,
        utilidad: recentPeriods.reduce((sum, p) => sum + p.utilidad, 0) / recentPeriods.length,
        margen: recentPeriods.reduce((sum, p) => sum + p.margen, 0) / recentPeriods.length
      }
      
      const previousAvg = {
        ingresos: previousPeriods.reduce((sum, p) => sum + p.ingresos, 0) / previousPeriods.length,
        egresos: previousPeriods.reduce((sum, p) => sum + p.egresos, 0) / previousPeriods.length,
        utilidad: previousPeriods.reduce((sum, p) => sum + p.utilidad, 0) / previousPeriods.length,
        margen: previousPeriods.reduce((sum, p) => sum + p.margen, 0) / previousPeriods.length
      }
      
      // Calculate growth rates
      return {
        ingresos: previousAvg.ingresos > 0 ? ((recentAvg.ingresos - previousAvg.ingresos) / previousAvg.ingresos) * 100 : 0,
        egresos: previousAvg.egresos > 0 ? ((recentAvg.egresos - previousAvg.egresos) / previousAvg.egresos) * 100 : 0,
        utilidad: previousAvg.utilidad !== 0 ? ((recentAvg.utilidad - previousAvg.utilidad) / Math.abs(previousAvg.utilidad)) * 100 : 0,
        margen: recentAvg.margen - previousAvg.margen
      }
    }
    const ingresos = data
      .filter(row => row.tipo === "Ingresos")
      .reduce((sum, row) => sum + (row.monto || 0), 0)
    
    const egresos = Math.abs(data
      .filter(row => row.tipo === "Egresos")
      .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0))

    // Calculate total volume from both sources - following raw materials page logic
    const totalVolumeConcreto = volumeData
      .filter(vol => vol.category === "Ventas Concreto")
      .reduce((sum, vol) => sum + vol.volume_m3, 0)
    
    const totalVolumeBombeo = volumeData
      .filter(vol => vol.category === "Ventas Bombeo")
      .reduce((sum, vol) => sum + vol.volume_m3, 0)

    const totalVolumeProductosAlternativos = volumeData
      .filter(vol => vol.category === "Productos Alternativos")
      .reduce((sum, vol) => sum + vol.volume_m3, 0)

    const totalCashVolumeConcreto = cashSalesData
      .filter(sale => sale.category === "Ventas Concreto Cash")
      .reduce((sum, sale) => sum + sale.volume_m3, 0)

    const totalCashVolumeBombeo = cashSalesData
      .filter(sale => sale.category === "Ventas Bombeo Cash")
      .reduce((sum, sale) => sum + sale.volume_m3, 0)

    // CRITICAL FIX: Match raw materials page volume logic exactly for consistent unit costs
    // Raw materials page uses: vol.category !== "Ventas Bombeo" (includes concrete + alternatives)
    // This was the source of the $2,076 vs $2,062.47 discrepancy - missing "Productos Alternativos"
    
    // Material costs: Concrete + Alternative Products (both consume materials, excluding pumping)
    const totalMaterialConsumingVolume = totalVolumeConcreto + totalVolumeProductosAlternativos + totalCashVolumeConcreto // No cash alternative products category yet
    // Operational costs: All volumes combined (concrete + pumping + alternatives)
    const totalVolume = totalVolumeConcreto + totalVolumeBombeo + totalVolumeProductosAlternativos + totalCashVolumeConcreto + totalCashVolumeBombeo
    
    // Calculate cash sales revenue
    const cashSalesRevenue = cashSalesData.reduce((sum, sale) => sum + sale.amount_mxn, 0)
    const totalIngresos = ingresos + cashSalesRevenue

    const utilidad = totalIngresos - egresos
    const margenUtilidad = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0
    
    // Para vista de participación, también calcular utilidad basada solo en ingresos fiscales
    const utilidadFiscal = ingresos - egresos
    const margenUtilidadFiscal = ingresos > 0 ? (utilidadFiscal / ingresos) * 100 : 0

    // Calculate growth rates using the improved methodology
    const growthRates = calculateGrowthRates(allData)
    const ingresosChange = growthRates.ingresos
    const egresoChange = growthRates.egresos
    const utilidadChange = growthRates.utilidad
    const margenChange = growthRates.margen

    // Calculate costs by managerial categories (respecting structure)
    const costoTransporte = data
      .filter(row => row.tipo === "Egresos" && row.clasificacion === "Costo transporte concreto")
      .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)

    const costoPersonalFijo = data
      .filter(row => row.tipo === "Egresos" && 
        (row.categoria_1 === "Nómina Producción" || 
         row.categoria_1 === "Nómina Administrativos"))
      .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)

    const costoMateriasPrimas = data
      .filter(row => row.tipo === "Egresos" && row.sub_categoria === "Costo Materias Primas")
      .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)

    const costoCemento = data
      .filter(row => row.tipo === "Egresos" && row.categoria_1 === "Cemento")
      .reduce((sum, row) => sum + Math.abs(row.monto || 0), 0)

    // Calculate participation as percentage of total costs
    const participacionTransporte = egresos > 0 ? (costoTransporte / egresos) * 100 : 0
    const participacionPersonalFijo = egresos > 0 ? (costoPersonalFijo / egresos) * 100 : 0
    const participacionMateriasPrimas = egresos > 0 ? (costoMateriasPrimas / egresos) * 100 : 0
    const participacionCemento = costoMateriasPrimas > 0 ? (costoCemento / costoMateriasPrimas) * 100 : 0

    // Calculate derived volumes for display and calculations
    const totalConcretoVolume = totalVolumeConcreto + totalCashVolumeConcreto // For display purposes  
    const totalBombeoVolume = totalVolumeBombeo + totalCashVolumeBombeo // For display purposes

    // Calculate unit costs using appropriate volume denominators
    // Materials and concrete transport should use material-consuming volume (concrete + alternatives, excluding pumping)
    const costoUnitarioTransporte = totalMaterialConsumingVolume > 0 ? costoTransporte / totalMaterialConsumingVolume : 0
    const costoUnitarioMateriasPrimas = totalMaterialConsumingVolume > 0 ? costoMateriasPrimas / totalMaterialConsumingVolume : 0
    // Total operational costs use combined volume since all volumes have operational costs
    const costoUnitarioTotal = totalVolume > 0 ? egresos / totalVolume : 0
    // Revenue efficiency uses total volume since all categories generate revenue
    const eficienciaVentas = totalVolume > 0 ? totalIngresos / totalVolume : 0

    // Return different metrics based on view mode
    if (viewMode === "unit" && totalVolume > 0) {
      return [
        {
          id: "ingresos",
          title: "Ingresos Totales",
          value: formatCompactCurrency(totalIngresos),
          unit: "",
          change: `${ingresosChange >= 0 ? '+' : ''}${ingresosChange.toFixed(1)}%`,
          trend: ingresosChange > 0 ? "up" : ingresosChange < 0 ? "down" : "neutral",
          status: getMetricStatus(ingresosChange, 'crecimiento'),
          description: `Ingresos fiscales + ventas en efectivo`,
          icon: DollarSign,
          target: kpiTargets.crecimientoObjetivo
        },
        {
          id: "volumen_materiales",
          title: "Volumen de Materiales",
          value: totalMaterialConsumingVolume.toFixed(1),
          unit: "m³",
          change: `+${totalBombeoVolume.toFixed(1)} m³ bombeo`,
          trend: "neutral",
          status: totalMaterialConsumingVolume > 0 ? "excellent" : "critical",
          description: `Concreto + alt. (base costos unitarios)`,
          icon: Activity
        },
        {
          id: "eficiencia_ventas",
          title: "Eficiencia de Ventas",
          value: formatUnitCurrency(eficienciaVentas),
          unit: "/m³",
          change: "N/A",
          trend: "neutral",
          status: eficienciaVentas > 2000 ? "excellent" : eficienciaVentas > 1800 ? "good" : eficienciaVentas > 1600 ? "warning" : "critical",
          description: `Ingresos por m³ (todas las categorías)`,
          icon: TrendingUp
        },
        {
          id: "costo_unitario_total",
          title: "Costo Unitario Total",
          value: formatUnitCurrency(costoUnitarioTotal),
          unit: "/m³",
          change: "N/A",
          trend: "neutral",
          status: costoUnitarioTotal < 1400 ? "excellent" : costoUnitarioTotal < 1600 ? "good" : costoUnitarioTotal < 1800 ? "warning" : "critical",
          description: `Costo total por m³ (todas las categorías)`,
          icon: DollarSign
        },
        {
          id: "margen",
          title: "Margen de Utilidad",
          value: margenUtilidad.toFixed(1),
          unit: "%",
          change: `${margenChange >= 0 ? '+' : ''}${margenChange.toFixed(1)}pp`,
          trend: margenChange > 0 ? "up" : margenChange < 0 ? "down" : "neutral",
          status: getMetricStatus(margenUtilidad, 'margen'),
          description: `Eficiencia en generación de utilidades`,
          icon: Percent,
          target: kpiTargets.margenUtilidadObjetivo
        },
        {
          id: "costo_unitario_transporte",
          title: "Costo Unitario Transporte",
          value: formatUnitCurrency(costoUnitarioTransporte),
          unit: "/m³",
          change: "N/A",
          trend: "neutral",
          status: costoUnitarioTransporte < 300 ? "excellent" : costoUnitarioTransporte < 400 ? "good" : costoUnitarioTransporte < 500 ? "warning" : "critical",
          description: `Costo transporte por m³ (concreto + alt.)`,
          icon: Activity
        },
        {
          id: "costo_unitario_materias_primas",
          title: "Costo Unitario Mat. Primas",
          value: formatUnitCurrency(costoUnitarioMateriasPrimas),
          unit: "/m³",
          change: "N/A",
          trend: "neutral",
          status: costoUnitarioMateriasPrimas < 800 ? "excellent" : costoUnitarioMateriasPrimas < 900 ? "good" : costoUnitarioMateriasPrimas < 1000 ? "warning" : "critical",
          description: `Costo materias primas por m³ (concreto + alt.)`,
          icon: Factory
        },
        {
          id: "participacion_cemento",
          title: "Participación Cemento",
          value: participacionCemento.toFixed(1),
          unit: "%",
          change: "N/A", 
          trend: "neutral",
          status: participacionCemento < 80 ? "excellent" : participacionCemento < 85 ? "good" : participacionCemento < 90 ? "warning" : "critical",
          description: `En materias primas`,
          icon: Building2
        }
      ]
    } else {
      // Participation mode (default when no volume data)
      return [
        {
          id: "ingresos",
          title: "Ingresos Totales",
          value: formatCompactCurrency(totalIngresos),
          unit: "",
          change: `${ingresosChange >= 0 ? '+' : ''}${ingresosChange.toFixed(1)}%`,
          trend: ingresosChange > 0 ? "up" : ingresosChange < 0 ? "down" : "neutral",
          status: getMetricStatus(ingresosChange, 'crecimiento'),
          description: `Ingresos fiscales + ventas en efectivo`,
          icon: DollarSign,
          target: kpiTargets.crecimientoObjetivo
        },
        {
          id: "egresos",
          title: "Egresos Totales", 
          value: formatCompactCurrency(egresos),
          unit: "",
          change: `${egresoChange >= 0 ? '+' : ''}${egresoChange.toFixed(1)}%`,
          trend: egresoChange < 0 ? "up" : egresoChange > 0 ? "down" : "neutral",
          status: getMetricStatus(egresoChange, 'egresos'),
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
          description: `Rentabilidad neta total (fiscal + efectivo)`,
          icon: TrendingUp
        },
        {
          id: "margen",
          title: "Margen de Utilidad",
          value: margenUtilidad.toFixed(1),
          unit: "%",
          change: `${margenChange >= 0 ? '+' : ''}${margenChange.toFixed(1)}pp`,
          trend: margenChange > 0 ? "up" : margenChange < 0 ? "down" : "neutral",
          status: getMetricStatus(margenUtilidad, 'margen'),
          description: `Eficiencia sobre ingresos totales`,
          icon: Percent,
          target: kpiTargets.margenUtilidadObjetivo
        },
        {
          id: "costo_transporte",
          title: "Costo de Transporte",
          value: participacionTransporte.toFixed(1),
          unit: "%", 
          change: "N/A",
          trend: "neutral",
          status: participacionTransporte < 20 ? "excellent" : participacionTransporte < 25 ? "good" : participacionTransporte < 30 ? "warning" : "critical",
          description: `Participación en egresos totales`,
          icon: Activity
        },
        {
          id: "costo_personal",
          title: "Costo Personal Fijo",
          value: participacionPersonalFijo.toFixed(1),
          unit: "%",
          change: "N/A", 
          trend: "neutral",
          status: participacionPersonalFijo < 15 ? "excellent" : participacionPersonalFijo < 20 ? "good" : participacionPersonalFijo < 25 ? "warning" : "critical",
          description: `Participación en egresos totales`,
          icon: Target
        },
        {
          id: "costo_materias_primas",
          title: "Costo Materias Primas",
          value: participacionMateriasPrimas.toFixed(1),
          unit: "%",
          change: "N/A", 
          trend: "neutral",
          status: participacionMateriasPrimas < 50 ? "excellent" : participacionMateriasPrimas < 55 ? "good" : participacionMateriasPrimas < 60 ? "warning" : "critical",
          description: `Participación en egresos totales`,
          icon: Factory
        },
        {
          id: "participacion_cemento",
          title: "Participación Cemento",
          value: participacionCemento.toFixed(1),
          unit: "%",
          change: "N/A", 
          trend: "neutral",
          status: participacionCemento < 80 ? "excellent" : participacionCemento < 85 ? "good" : participacionCemento < 90 ? "warning" : "critical",
          description: `En materias primas`,
          icon: Building2
        }
      ]
    }
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

    // Expense breakdown respecting managerial structure
    const expenseData = data.filter((row: any) => row.tipo === "Egresos")
    
    // Level 1: By Sub categoria (as management sees it)
    const expenseBySubCategory = expenseData.reduce((acc: Record<string, number>, row: any) => {
      const subCategory = row.sub_categoria || "Sin Sub Categoría"
      acc[subCategory] = (acc[subCategory] || 0) + Math.abs(row.monto || 0)
      return acc
    }, {} as Record<string, number>)

    // Level 2: For "Costo operativo", break down by Clasificacion
    const costoOperativoData = expenseData.filter((row: any) => row.sub_categoria === "Costo operativo")
    const costoOperativoByClasificacion = costoOperativoData.reduce((acc: Record<string, number>, row: any) => {
      const clasificacion = row.clasificacion || "Sin Clasificación"
      acc[clasificacion] = (acc[clasificacion] || 0) + Math.abs(row.monto || 0)
      return acc
    }, {} as Record<string, number>)

    // Create enhanced expense breakdown following managerial structure
    const enhancedExpenseData = []
    const totalExpense = Object.values(expenseBySubCategory).reduce((sum: number, val: number) => sum + val, 0)

    // Add "Costo Materias Primas" as main category
    if (expenseBySubCategory["Costo Materias Primas"]) {
      enhancedExpenseData.push({
        name: "Costo Materias Primas",
        value: expenseBySubCategory["Costo Materias Primas"],
        percentage: totalExpense > 0 ? (expenseBySubCategory["Costo Materias Primas"] / totalExpense) * 100 : 0,
        color: "#ef4444"
      })
    }

    // Add "Costo operativo" sub-categories
    if (costoOperativoByClasificacion["Costo transporte concreto"]) {
      enhancedExpenseData.push({
        name: "Costo Transporte Concreto",
        value: costoOperativoByClasificacion["Costo transporte concreto"],
        percentage: totalExpense > 0 ? (costoOperativoByClasificacion["Costo transporte concreto"] / totalExpense) * 100 : 0,
        color: "#dc2626"
      })
    }

    if (costoOperativoByClasificacion["Costo Fijo"]) {
      enhancedExpenseData.push({
        name: "Costo Fijo",
        value: costoOperativoByClasificacion["Costo Fijo"],
        percentage: totalExpense > 0 ? (costoOperativoByClasificacion["Costo Fijo"] / totalExpense) * 100 : 0,
        color: "#b91c1c"
      })
    }

    // Add any remaining sub-categories
    Object.entries(expenseBySubCategory).forEach(([subCat, value]) => {
      if (subCat !== "Costo Materias Primas" && subCat !== "Costo operativo") {
        enhancedExpenseData.push({
          name: subCat,
          value: value,
          percentage: totalExpense > 0 ? (value / totalExpense) * 100 : 0,
          color: "#991b1b"
        })
      }
    })

    const expense = enhancedExpenseData.sort((a, b) => b.value - a.value)

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

  const formatUnitCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
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
            <p className="text-muted-foreground">Cargando KPIs...</p>
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
            <h1 className="text-3xl font-bold text-foreground">KPIs y Métricas</h1>
            <p className="text-muted-foreground mt-1">Indicadores clave de rendimiento y análisis financiero</p>
          </div>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <KPITargetsConfigModal
              currentTargets={targets}
              onTargetsChange={updateTargets}
              totalIncome={kpiMetrics.find(m => m.id === 'ingresos')?.value ? 
                parseFloat(kpiMetrics.find(m => m.id === 'ingresos')?.value.toString().replace(/[^0-9.-]/g, '') || '0') : 0}
              availablePlants={plantPerformance.map(p => p.planta)}
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

        {/* KPIs Info Section */}
        <KPIsInfoSection />

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
                      <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
                      <MetricsInfoTooltip 
                        type={metric.id as any} 
                        className="ml-1"
                      />
                    </div>
                    <StatusIcon className={`h-4 w-4 ${getStatusColor(metric.status).replace('bg-', 'text-')}`} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {metric.value}
                        <span className="text-sm font-normal text-muted-foreground ml-1">{metric.unit}</span>
                      </div>
                      <div className={`flex items-center mt-1 ${getTrendColor(metric.trend)}`}>
                        <TrendIcon className="h-3 w-3 mr-1" />
                        <span className="text-xs font-medium">{metric.change}</span>
                      </div>
                    </div>
                    {metric.target && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Meta: {metric.target}{metric.unit}</div>
                        <Progress 
                          value={Math.min(100, (parseFloat(metric.value.toString()) / metric.target) * 100)} 
                          className="w-16 h-2 mt-1"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{metric.description}</p>
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
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px',
                        color: 'hsl(var(--foreground))'
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
                  <div key={plant.planta} className="p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                    {/* Header row with plant info */}
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-green-800 dark:text-green-200">
                          {plant.planta.includes('SIN') ? 'SC' : plant.planta}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground text-lg truncate">
                          {plant.planta === 'SIN CLASIFICACION' ? 'SIN CLASIFICACIÓN' : plant.planta}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">{plant.businessUnit}</div>
                      </div>
                    </div>
                    
                    {/* Metrics grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="font-bold text-foreground text-lg">{formatCompactCurrency(plant.ingresos)}</div>
                        <div className="text-xs text-muted-foreground font-medium">{plant.participacion.toFixed(1)}% participación</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-bold text-lg ${plant.margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {plant.margen.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">margen</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-foreground text-lg">{plant.eficiencia.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground font-medium">eficiencia</div>
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
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-3">
                {incomeBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-semibold text-foreground">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">{formatCompactCurrency(item.value)}</div>
                      <div className="text-xs text-muted-foreground font-medium">{item.percentage.toFixed(1)}%</div>
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
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-3">
                {expenseBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-semibold text-foreground">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">{formatCompactCurrency(item.value)}</div>
                      <div className="text-xs text-muted-foreground font-medium">{item.percentage.toFixed(1)}%</div>
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