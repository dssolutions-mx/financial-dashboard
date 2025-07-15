"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Calculator, Upload, Eye, Download, Database, Calendar, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { handleBalanzaFileUpload, type DebugDataRow } from "@/lib/services/excel-processor"
import { validationEngine, ValidationSummary, ReportMetadata } from "@/lib/services/validation-service"
import { SupabaseStorageService, FinancialReport, PlantVolume, CashSale } from "@/lib/supabase/storage"
import EnhancedDebugModal from "@/components/modals/enhanced-debug-modal"
import ValidationModal from "@/components/modals/validation-modal"
import VolumeInputModal from "@/components/modals/volume-input-modal"
import CashSalesInputModal from "@/components/modals/cash-sales-input-modal"
import ReportSelector from "@/components/reports/report-selector"

interface FinancialDashboardMainProps {
  initialData: DebugDataRow[]
  onDataUpdate: (data: DebugDataRow[]) => void
}

// Plant to unit mapping
const plantToUnit: Record<string, string> = {
  P1: "BAJIO",
  P2: "VIADUCTO", 
  P3: "ITISA",
  P4: "VIADUCTO",
  P5: "BAJIO",
  "SIN CLASIFICACION": "OTROS"
}

// Unit to plants mapping
const unitToPlants: Record<string, string[]> = {
  "BAJIO": ["P1", "P5"],
  "VIADUCTO": ["P2", "P4"],
  "ITISA": ["P3"],
  "OTROS": ["SIN CLASIFICACION"]
}

const ALL_PLANTS = ["P1", "P2", "P3", "P4", "P5", "SIN CLASIFICACION"]

// Define Egresos categories eligible for volume/cost input
const EGRESOS_CON_VOLUMEN = [
  "Cemento",
  "Agregado Grueso", 
  "Agregado Fino",
  "Aditivos",
  "Agua",
  "Diesel CR",
]

// Utility functions
const formatMoney = (amount: number, showDecimals?: boolean) => {
  const absAmount = Math.abs(amount)
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  }).format(absAmount)
  
  return amount < 0 ? `(${formatted})` : formatted
}

const formatUnitValue = (value: number, isEgreso?: boolean) => {
  const absValue = Math.abs(value)
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(absValue)
  
  return isEgreso ? formatted : formatted
}

const formatVolumen = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const calculateUnitValue = (monto: number, volumen: number) => {
  return volumen > 0 ? monto / volumen : 0
}

const shouldShowVolumeDisplay = (tipo: string, subCategoria: string, clasificacion: string, categoria1: string): boolean => {
  return tipo === "Ingresos" && (
    categoria1.includes("Ventas") || 
    categoria1.includes("Venta") ||
    categoria1.includes("Productos Alternativos") ||
    categoria1.includes("Producto Alternativo")
  )
}

export function FinancialDashboardMain({ initialData, onDataUpdate }: FinancialDashboardMainProps) {
  const [data, setData] = useState<DebugDataRow[]>(initialData)
  const [selectedUnits, setSelectedUnits] = useState<string[]>(["ALL"])
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [categories, setCategories] = useState<string[]>(["ALL"])
  const [expandedRows, setExpandedRows] = useState(new Set(["Ingresos", "Egresos"]))
  const [matrixData, setMatrixData] = useState<Record<string, any>>({})
  const [summaryData, setSummaryData] = useState({
    ingresos: 0,
    egresos: 0,
    utilidadBruta: 0,
    porcentajeUtilidad: 0,
  })
  const [volumenes, setVolumenes] = useState<Record<string, Record<string, number>>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false)
  const [showUnitPriceView, setShowUnitPriceView] = useState(false)
  
  // Validation and persistence state
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false)
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null)
  const [currentFileName, setCurrentFileName] = useState("")
  const [currentProcessedData, setCurrentProcessedData] = useState<DebugDataRow[]>([])
  const [currentRawData, setCurrentRawData] = useState<any[]>([])
  const [showReportSelector, setShowReportSelector] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [isDebugFromValidation, setIsDebugFromValidation] = useState(false)
  
  // Multi-report accumulation state
  const [enableAccumulation, setEnableAccumulation] = useState(false)
  const [selectedReports, setSelectedReports] = useState<FinancialReport[]>([])
  const [accumulatedData, setAccumulatedData] = useState<DebugDataRow[]>([])
  const [isLoadingAccumulation, setIsLoadingAccumulation] = useState(false)
  
  // Volume persistence state
  const [currentMonth, setCurrentMonth] = useState<number | null>(null)
  const [currentYear, setCurrentYear] = useState<number | null>(null)
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false)
  const [isLoadingVolumes, setIsLoadingVolumes] = useState(false)
  
  // Cash sales state
  const [cashSalesData, setCashSalesData] = useState<Record<string, Record<string, { volume: number; amount: number }>>>({})
  const [isCashSalesModalOpen, setIsCashSalesModalOpen] = useState(false)
  const [isLoadingCashSales, setIsLoadingCashSales] = useState(false)
  
  const storageService = new SupabaseStorageService()
  const { toast } = useToast()

  // Update local data when initialData changes
  useEffect(() => {
    setData(initialData)
  }, [initialData])

  // Function to aggregate data from multiple reports
  const aggregateReportsData = useCallback(async (reports: FinancialReport[]) => {
    if (reports.length === 0) {
      setAccumulatedData([])
      return
    }

    setIsLoadingAccumulation(true)
    try {
      const allData: DebugDataRow[] = []
      
      for (const report of reports) {
        const reportData = await storageService.getFinancialData(report.id)
        const convertedData: DebugDataRow[] = reportData.map(row => ({
          Codigo: row.codigo,
          Concepto: row.concepto,
          Abonos: row.abonos,
          Cargos: row.cargos,
          Tipo: row.tipo,
          'Categoria 1': row.categoria_1,
          'Sub categoria': row.sub_categoria,
          Clasificacion: row.clasificacion,
          Monto: row.monto,
          Planta: row.planta,
        }))
        allData.push(...convertedData)
      }
      
      // Aggregate data by grouping similar entries
      const aggregatedMap = new Map<string, DebugDataRow>()
      
      allData.forEach(row => {
        const key = `${row.Codigo}-${row.Tipo}-${row['Categoria 1']}-${row['Sub categoria']}-${row.Clasificacion}-${row.Planta}`
        
        if (aggregatedMap.has(key)) {
          const existing = aggregatedMap.get(key)!
          existing.Monto += row.Monto
          existing.Abonos += row.Abonos
          existing.Cargos += row.Cargos
        } else {
          aggregatedMap.set(key, { ...row })
        }
      })
      
      const aggregatedData = Array.from(aggregatedMap.values())
      setAccumulatedData(aggregatedData)
      
      toast({
        title: "Datos acumulados",
        description: `Se acumularon datos de ${reports.length} reportes (${aggregatedData.length} registros totales)`,
      })
    } catch (error) {
      console.error("Error aggregating reports data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de los reportes seleccionados",
        variant: "destructive"
      })
    } finally {
      setIsLoadingAccumulation(false)
    }
  }, [storageService, toast])

  // Handle multiple report selection
  const handleMultipleReportsSelection = useCallback(async (reports: FinancialReport[]) => {
    setSelectedReports(reports)
    
    if (reports.length > 0) {
      await aggregateReportsData(reports)
    } else {
      setAccumulatedData([])
    }
  }, [aggregateReportsData])

  // Toggle accumulation mode
  const toggleAccumulationMode = useCallback(() => {
    setEnableAccumulation(prev => {
      const newMode = !prev
      if (!newMode) {
        // Reset to normal mode
        setSelectedReports([])
        setAccumulatedData([])
      }
      return newMode
    })
  }, [])

  // Get current data based on mode
  const getCurrentData = useCallback(() => {
    return enableAccumulation ? accumulatedData : data
  }, [enableAccumulation, accumulatedData, data])

  // Calculate summary data
  const calculateSummary = useCallback((filteredData: DebugDataRow[]) => {
    const filteredByUnit = selectedUnits.includes("ALL")
     ? filteredData
     : filteredData.filter((row) => {
         const unit = plantToUnit[row.Planta as keyof typeof plantToUnit]
         return unit ? selectedUnits.includes(unit) : false
       })

   const finalFilteredData = selectedCategory === "ALL"
     ? filteredByUnit
     : filteredByUnit.filter((row) => row["Categoria 1"] === selectedCategory)

   const ingresosFiscales = finalFilteredData.filter((row) => row.Tipo === "Ingresos").reduce((sum, row) => sum + row.Monto, 0)
   const egresosPositive = finalFilteredData.filter((row) => row.Tipo === "Egresos").reduce((sum, row) => sum + row.Monto, 0)
   const egresos = -Math.abs(egresosPositive)
   
   // Get visible plants for cash sales calculation
   const visiblePlants = selectedUnits.includes("ALL") 
     ? ALL_PLANTS 
     : selectedUnits.flatMap(unit => unitToPlants[unit] || [])
   
   // Calculate cash sales revenue inline (only in normal mode)
   let ingresosCash = 0
   if (!enableAccumulation) {
     Object.entries(cashSalesData).forEach(([category, plants]) => {
       visiblePlants.forEach(plant => {
         if (plants[plant]) {
           ingresosCash += plants[plant].amount
         }
       })
     })
   }
   
   const ingresos = ingresosFiscales + ingresosCash
   const utilidadBruta = ingresos + egresos
   const porcentajeUtilidad = ingresos !== 0 ? (utilidadBruta / ingresos) * 100 : 0

   setSummaryData({
     ingresos,
     egresos,
     utilidadBruta,
     porcentajeUtilidad,
   })
 }, [selectedUnits, selectedCategory, cashSalesData, enableAccumulation])

 const processMatrixData = useCallback((filteredData: DebugDataRow[]) => {
   const filteredByUnit = selectedUnits.includes("ALL")
     ? filteredData
     : filteredData.filter((row) => {
         const unit = plantToUnit[row.Planta as keyof typeof plantToUnit]
         return unit ? selectedUnits.includes(unit) : false
       })

    const finalFilteredData = selectedCategory === 'ALL'
           ? filteredByUnit
           : filteredByUnit.filter(row => row['Categoria 1'] === selectedCategory)

   const hierarchy: Record<string, any> = {}
   
   // Get visible plants for cash sales
   const visiblePlants = selectedUnits.includes("ALL") 
     ? ALL_PLANTS 
     : selectedUnits.flatMap(unit => unitToPlants[unit] || [])

   finalFilteredData.forEach((row) => {
     const tipo = row.Tipo
     const subCategoria = row["Sub categoria"] || "Sin Subcategoría"
     const clasificacion = row.Clasificacion || "Sin Clasificación"
     const categoria1 = row["Categoria 1"] || "Sin Categoría"
     const planta = row.Planta
     const monto = tipo === "Egresos" ? -Math.abs(row.Monto) : row.Monto
     const validPlanta = ALL_PLANTS.includes(planta) ? planta : "SIN CLASIFICACION"

      if (!hierarchy[tipo]) {
        hierarchy[tipo] = {
          total: 0,
          subCategorias: {},
          plantas: ALL_PLANTS.reduce((acc, p) => { acc[p] = 0; return acc; }, {} as Record<string, number>),
        }
      }
      if (!hierarchy[tipo].subCategorias[subCategoria]) {
        hierarchy[tipo].subCategorias[subCategoria] = {
          total: 0,
          clasificaciones: {},
          plantas: ALL_PLANTS.reduce((acc, p) => { acc[p] = 0; return acc; }, {} as Record<string, number>),
        }
      }
      if (!hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion]) {
        hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion] = {
          total: 0,
          categorias1: {},
          plantas: ALL_PLANTS.reduce((acc, p) => { acc[p] = 0; return acc; }, {} as Record<string, number>),
        }
      }
      if (!hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].categorias1[categoria1]) {
        hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].categorias1[categoria1] = {
          total: 0,
          plantas: ALL_PLANTS.reduce((acc, p) => { acc[p] = 0; return acc; }, {} as Record<string, number>),
        }
      }

       hierarchy[tipo].total += monto
       if (hierarchy[tipo].plantas[validPlanta] !== undefined) {
         hierarchy[tipo].plantas[validPlanta] += monto
       }

       hierarchy[tipo].subCategorias[subCategoria].total += monto
       if (hierarchy[tipo].subCategorias[subCategoria].plantas[validPlanta] !== undefined) {
         hierarchy[tipo].subCategorias[subCategoria].plantas[validPlanta] += monto
        }

       hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].total += monto
        if (hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].plantas[validPlanta] !== undefined) {
          hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].plantas[validPlanta] += monto
        }

       hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].categorias1[categoria1].total += monto
        if (hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].categorias1[categoria1].plantas[validPlanta] !== undefined) {
          hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].categorias1[categoria1].plantas[validPlanta] += monto
        }
     })

     // Add cash sales data to hierarchy as additional income rows (only in normal mode)
     if (!enableAccumulation && Object.keys(cashSalesData).length > 0) {
       // Ensure Ingresos section exists
       if (!hierarchy["Ingresos"]) {
         hierarchy["Ingresos"] = {
           total: 0,
           subCategorias: {},
           plantas: ALL_PLANTS.reduce((acc, p) => { acc[p] = 0; return acc; }, {} as Record<string, number>),
         }
       }

       // Add cash sales entries
       Object.entries(cashSalesData).forEach(([category, plants]) => {
         const subCategoria = "Ventas en Efectivo"
         const clasificacion = category === "Ventas Concreto Cash" ? "Ventas Concreto (Efectivo)" : "Ventas Bombeo (Efectivo)"
         const categoria1 = category === "Ventas Concreto Cash" ? "Ventas Concreto" : "Ventas Bombeo"

         // Initialize subcategory if it doesn't exist
         if (!hierarchy["Ingresos"].subCategorias[subCategoria]) {
           hierarchy["Ingresos"].subCategorias[subCategoria] = {
             total: 0,
             clasificaciones: {},
             plantas: ALL_PLANTS.reduce((acc, p) => { acc[p] = 0; return acc; }, {} as Record<string, number>),
           }
         }

         // Initialize classification if it doesn't exist
         if (!hierarchy["Ingresos"].subCategorias[subCategoria].clasificaciones[clasificacion]) {
           hierarchy["Ingresos"].subCategorias[subCategoria].clasificaciones[clasificacion] = {
             total: 0,
             categorias1: {},
             plantas: ALL_PLANTS.reduce((acc, p) => { acc[p] = 0; return acc; }, {} as Record<string, number>),
           }
         }

         // Initialize categoria1 if it doesn't exist
         if (!hierarchy["Ingresos"].subCategorias[subCategoria].clasificaciones[clasificacion].categorias1[categoria1]) {
           hierarchy["Ingresos"].subCategorias[subCategoria].clasificaciones[clasificacion].categorias1[categoria1] = {
             total: 0,
             plantas: ALL_PLANTS.reduce((acc, p) => { acc[p] = 0; return acc; }, {} as Record<string, number>),
           }
         }

         // Add cash sales amounts for each plant
         Object.entries(plants).forEach(([plant, data]) => {
           if (data.amount > 0 && visiblePlants.includes(plant)) {
             const monto = data.amount
             
             // Update all levels
             hierarchy["Ingresos"].total += monto
             hierarchy["Ingresos"].plantas[plant] += monto

             hierarchy["Ingresos"].subCategorias[subCategoria].total += monto
             hierarchy["Ingresos"].subCategorias[subCategoria].plantas[plant] += monto

             hierarchy["Ingresos"].subCategorias[subCategoria].clasificaciones[clasificacion].total += monto
             hierarchy["Ingresos"].subCategorias[subCategoria].clasificaciones[clasificacion].plantas[plant] += monto

             hierarchy["Ingresos"].subCategorias[subCategoria].clasificaciones[clasificacion].categorias1[categoria1].total += monto
             hierarchy["Ingresos"].subCategorias[subCategoria].clasificaciones[clasificacion].categorias1[categoria1].plantas[plant] += monto
           }
         })
       })
     }

   setMatrixData(hierarchy)
  }, [selectedUnits, selectedCategory, cashSalesData, enableAccumulation])

  // Main useEffect for data processing
  useEffect(() => {
     const currentData = getCurrentData()
     const validData = currentData.filter(row => row.Tipo !== 'Indefinido')

    calculateSummary(validData)
    processMatrixData(validData)

    if (validData.length > 0) {
       const uniqueCategories = Array.from(new Set(validData.map((item) => item["Categoria 1"]).filter(Boolean))) as string[]
       setCategories(["ALL", ...uniqueCategories.sort()])
    } else {
      setCategories(["ALL"])
    }
  }, [getCurrentData, selectedUnits, selectedCategory, calculateSummary, processMatrixData, cashSalesData])

  // Get visible plants based on selected units
  const getVisiblePlants = useCallback(() => {
    if (selectedUnits.includes("ALL")) {
      return ALL_PLANTS
    }
    
    const plantsForUnits = selectedUnits.flatMap(unit => unitToPlants[unit] || [])
    return [...new Set(plantsForUnits)]
  }, [selectedUnits])

  // Unit toggle function
  const toggleUnit = (unit: string) => {
    if (unit === "ALL") {
      setSelectedUnits(["ALL"])
    } else {
      setSelectedUnits(prev => {
        if (prev.includes("ALL")) {
          return [unit]
        } else {
          return prev.includes(unit) 
            ? prev.filter(u => u !== unit)
            : [...prev, unit]
        }
      })
    }
  }

  // Volume handling - using the improved version below

  // Utility functions
  const shouldUseCombinedVolume = (clasificacion: string) => {
    return clasificacion === "Costo Operativo"
  }

  const getVolumeForUnitCost = (planta: string, clasificacion: string) => {
    if (shouldUseCombinedVolume(clasificacion)) {
      const fiscalConcreteVol = volumenes["Ventas Concreto"]?.[planta] ?? 0
      const fiscalBombeoVol = volumenes["Ventas Bombeo"]?.[planta] ?? 0
      const cashConcreteVol = cashSalesData["Ventas Concreto Cash"]?.[planta]?.volume ?? 0
      const cashBombeoVol = cashSalesData["Ventas Bombeo Cash"]?.[planta]?.volume ?? 0
      return fiscalConcreteVol + fiscalBombeoVol + cashConcreteVol + cashBombeoVol
    } else {
      const fiscalConcreteVol = volumenes["Ventas Concreto"]?.[planta] ?? 0
      const cashConcreteVol = cashSalesData["Ventas Concreto Cash"]?.[planta]?.volume ?? 0
      return fiscalConcreteVol + cashConcreteVol
    }
  }

  const getTotalVolume = (categoria: string, visiblePlants: string[]) => {
    const fiscalVolume = volumenes[categoria]
      ? visiblePlants.reduce((sum, plt) => sum + (volumenes[categoria][plt] ?? 0), 0)
      : 0
    
    // Add cash sales volume for concrete and bombeo
    let cashVolume = 0
    if (categoria === "Ventas Concreto") {
      cashVolume = cashSalesData["Ventas Concreto Cash"]
        ? visiblePlants.reduce((sum, plt) => sum + (cashSalesData["Ventas Concreto Cash"][plt]?.volume ?? 0), 0)
        : 0
    } else if (categoria === "Ventas Bombeo") {
      cashVolume = cashSalesData["Ventas Bombeo Cash"]
        ? visiblePlants.reduce((sum, plt) => sum + (cashSalesData["Ventas Bombeo Cash"][plt]?.volume ?? 0), 0)
        : 0
    }
    
    return fiscalVolume + cashVolume
  }

  const getTotalCombinedVolume = (visiblePlants: string[]) => {
    const totalConcreteVol = getTotalVolume("Ventas Concreto", visiblePlants)
    const totalBombeoVol = getTotalVolume("Ventas Bombeo", visiblePlants)
    return totalConcreteVol + totalBombeoVol
  }

  const getTotalCashSalesRevenue = (visiblePlants: string[]) => {
    let totalRevenue = 0
    
    // Calculate total revenue from cash sales
    Object.entries(cashSalesData).forEach(([category, plants]) => {
      visiblePlants.forEach(plant => {
        if (plants[plant]) {
          totalRevenue += plants[plant].amount
        }
      })
    })
    
    return totalRevenue
  }

  const toggleExpand = useCallback((key: string) => {
    setExpandedRows(prev => {
        const newExpanded = new Set(prev)
        if (newExpanded.has(key)) {
            newExpanded.delete(key)
        } else {
            newExpanded.add(key)
        }
        return newExpanded
    })
  }, [])

  // Load volume data from database
  const loadVolumeData = useCallback(async (month: number, year: number) => {
    setIsLoadingVolumes(true)
    try {
      const volumeData = await storageService.getPlantVolumesGrouped(month, year)
      setVolumenes(volumeData)
      toast({
        title: "Datos de volumen cargados",
        description: `Se cargaron los datos de ${month}/${year}`,
      })
    } catch (error) {
      console.error("Error loading volume data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de volumen",
        variant: "destructive"
      })
    } finally {
      setIsLoadingVolumes(false)
    }
  }, [storageService, toast])

  // Load cash sales data from database
  const loadCashSalesData = useCallback(async (month: number, year: number) => {
    setIsLoadingCashSales(true)
    try {
      const cashSalesData = await storageService.getCashSalesGrouped(month, year)
      setCashSalesData(cashSalesData)
      
      toast({
        title: "Ventas en efectivo cargadas",
        description: `Datos de ventas en efectivo para ${month}/${year} cargados exitosamente`,
      })
    } catch (error) {
      console.error('Error loading cash sales:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las ventas en efectivo",
        variant: "destructive",
      })
    } finally {
      setIsLoadingCashSales(false)
    }
  }, [storageService, toast])

  // Handle volume data save from modal
  const handleVolumeSave = useCallback(async (volumeData: Record<string, Record<string, number>>) => {
    if (!currentMonth || !currentYear) return

    const volumeDataToSave: Array<{
      plantCode: string
      month: number
      year: number
      category: string
      volumeM3: number
    }> = []
    
    // Convert volumenes state to array format for bulk save
    Object.entries(volumeData).forEach(([category, plants]) => {
      Object.entries(plants).forEach(([plant, volume]) => {
        if (volume > 0) { // Only save non-zero volumes
          volumeDataToSave.push({
            plantCode: plant,
            month: currentMonth,
            year: currentYear,
            category,
            volumeM3: volume
          })
        }
      })
    })

    await storageService.bulkSavePlantVolumes(volumeDataToSave)
    setVolumenes(volumeData)
  }, [currentMonth, currentYear, storageService])

  // Handle cash sales data save from modal
  const handleCashSalesSave = useCallback(async (cashSalesData: Record<string, Record<string, { volume: number; amount: number }>>) => {
    if (!currentMonth || !currentYear) return

    const cashSalesDataToSave: Array<{
      plantCode: string
      month: number
      year: number
      category: string
      volumeM3: number
      amountMxn: number
    }> = []
    
    // Convert cash sales state to array format for bulk save
    Object.entries(cashSalesData).forEach(([category, plants]) => {
      Object.entries(plants).forEach(([plant, data]) => {
        if (data.volume > 0 || data.amount > 0) { // Only save non-zero data
          cashSalesDataToSave.push({
            plantCode: plant,
            month: currentMonth,
            year: currentYear,
            category,
            volumeM3: data.volume,
            amountMxn: data.amount
          })
        }
      })
    })

    await storageService.bulkSaveCashSales(cashSalesDataToSave)
    setCashSalesData(cashSalesData)
  }, [currentMonth, currentYear, storageService])



  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    try {
      const result = await handleBalanzaFileUpload(e)
      setCurrentFileName(file.name)
      setCurrentProcessedData(result.data)
      setCurrentRawData(result.rawData)

      const summary = validationEngine.validateData(result.data, result.rawData)
      setValidationSummary(summary)
      setIsValidationModalOpen(true)
    } catch (error) {
      console.error("Error processing file:", error)
      toast({
        title: "Error",
        description: "Error al procesar el archivo",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 w-full max-w-full overflow-auto relative" style={{ maxHeight: "calc(100vh - 4rem)" }}>
      {/* Header Section */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-green-800 rounded-md flex items-center justify-center text-white font-bold">
            DC
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">
            REPORTE DE INGRESOS Y EGRESOS
          </h1>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Category Dropdown */}
          <div className="flex items-center space-x-2 min-w-[180px]">
            <label htmlFor="category-select" className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
              CATEGORÍA 1
            </label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border rounded px-2 py-1 w-full text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Accumulation Mode Toggle */}
          <Button
            variant={enableAccumulation ? "default" : "outline"}
            size="sm"
            onClick={toggleAccumulationMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              enableAccumulation 
                ? "bg-orange-600 text-white hover:bg-orange-700" 
                : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
            }`}
          >
            <Database size={14} /> 
            {enableAccumulation ? "Modo Acumulativo" : "Modo Individual"}
          </Button>

          {/* Unit Price View Toggle */}
          <Button
            variant={showUnitPriceView ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnitPriceView(!showUnitPriceView)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              showUnitPriceView 
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
            }`}
          >
            <Calculator size={14} /> 
            {showUnitPriceView ? "Ver Totales" : "Ver Precio por m³"}
          </Button>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-upload"
              disabled={isProcessing}
            />
            <label
              htmlFor="excel-upload"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
                isProcessing
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-700 text-white hover:bg-green-800"
              }`}
            >
              <Upload size={14} /> 
              {isProcessing ? "Procesando..." : "Cargar Excel"}
            </label>
            <Button
              variant="outline"
              size="sm" 
              onClick={() => setIsDebugModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
              disabled={data.length === 0}
            >
              <Eye size={14} /> 
              Verificar
            </Button>
            <Button
              variant="outline"
              size="sm" 
              onClick={() => setShowReportSelector(!showReportSelector)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            >
              <Database size={14} /> 
              {showReportSelector ? "Ocultar Reportes" : "Ver Reportes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Volume Data Button */}
      {currentMonth && currentYear && !enableAccumulation && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Datos de Volumen - {currentMonth}/{currentYear}
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {isLoadingVolumes ? "Cargando datos..." : "Configure los metros cúbicos para cada planta"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsVolumeModalOpen(true)}
                disabled={isLoadingVolumes}
                size="sm"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Database size={14} />
                Configurar Volúmenes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Sales Data Button */}
      {currentMonth && currentYear && !enableAccumulation && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <DollarSign size={20} className="text-green-600 dark:text-green-400" />
              <div>
                <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
                  Ventas en Efectivo - {currentMonth}/{currentYear}
                </h3>
                <p className="text-xs text-green-700 dark:text-green-300">
                  {isLoadingCashSales ? "Cargando datos..." : "Configure las ventas en efectivo (no fiscales)"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsCashSalesModalOpen(true)}
                disabled={isLoadingCashSales}
                size="sm"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <DollarSign size={14} />
                Configurar Ventas en Efectivo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Accumulation Mode Info Panel */}
      {enableAccumulation && (
        <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-orange-600 dark:text-orange-400" />
              <div>
                <h3 className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Modo Acumulativo Activo
                </h3>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  {isLoadingAccumulation 
                    ? "Cargando y acumulando datos de reportes..." 
                    : selectedReports.length === 0
                      ? "Seleccione múltiples reportes abajo para ver datos acumulados"
                      : `Mostrando datos acumulados de ${selectedReports.length} reporte(s)`
                  }
                </p>
              </div>
            </div>
            
            {selectedReports.length > 0 && !isLoadingAccumulation && (
              <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-orange-200 dark:border-orange-600">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Reportes Seleccionados:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {selectedReports.map(report => (
                    <div key={report.id} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                      <Badge variant="outline" className="text-xs">
                        {new Date(2024, report.month - 1, 1).toLocaleDateString('es-MX', { month: 'short' })} {report.year}
                      </Badge>
                      <span className="truncate text-gray-600 dark:text-gray-300">{report.name}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Total de registros acumulados: </span>
                  <span className="text-orange-600 dark:text-orange-400">{accumulatedData.length.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}



      {/* Unit Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.keys(unitToPlants).map((unit) => (
          <button
            key={unit}
            onClick={() => toggleUnit(unit)}
            className={`p-2 text-center rounded-lg transition-colors flex-1 min-w-[100px] border text-sm ${
              selectedUnits.includes(unit)
                ? "bg-green-800 text-white border-green-900"
                : "bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            }`}
          >
            {unit}
          </button>
        ))}
        <button
          onClick={() => setSelectedUnits(["ALL"])}
          className={`p-2 text-center rounded-lg transition-colors flex-1 min-w-[100px] border text-sm ${
            selectedUnits.includes("ALL")
              ? "bg-green-800 text-white border-green-900"
              : "bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"
          }`}
        >
          TODAS
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-3 bg-white dark:bg-gray-800 shadow-xs hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs text-gray-600 dark:text-gray-400">INGRESOS TOTALES</h3>
          <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatMoney(summaryData.ingresos, true)}</p>
          {!enableAccumulation && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              <div>Fiscal: {formatMoney(summaryData.ingresos - getTotalCashSalesRevenue(getVisiblePlants()), true)}</div>
              <div>Efectivo: {formatMoney(getTotalCashSalesRevenue(getVisiblePlants()), true)}</div>
            </div>
          )}
          {enableAccumulation && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              <div>Datos acumulados de {selectedReports.length} reporte(s)</div>
            </div>
          )}
        </Card>
        <Card className="p-3 bg-white dark:bg-gray-800 shadow-xs hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs text-gray-600 dark:text-gray-400">EGRESOS</h3>
          <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatMoney(summaryData.egresos, true)}</p>
        </Card>
        <Card className="p-3 bg-white dark:bg-gray-800 shadow-xs hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs text-gray-600 dark:text-gray-400">UTILIDAD BRUTA</h3>
          <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatMoney(summaryData.utilidadBruta, true)}</p>
        </Card>
        <Card className="p-3 bg-white dark:bg-gray-800 shadow-xs hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs text-gray-600 dark:text-gray-400">% UTILIDAD BRUTA</h3>
          <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{summaryData.porcentajeUtilidad.toFixed(2)}%</p>
        </Card>
        <Card className="p-3 bg-white dark:bg-gray-800 shadow-xs hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs text-gray-600 dark:text-gray-400">
            {enableAccumulation ? "REGISTROS TOTALES" : "VOLUMEN TOTAL"}
          </h3>
          {enableAccumulation ? (
            <>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{accumulatedData.length.toLocaleString()}</p>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <div>Reportes: {selectedReports.length}</div>
                <div>Períodos: {selectedReports.length > 0 ? `${Math.min(...selectedReports.map(r => r.month))}/${Math.min(...selectedReports.map(r => r.year))} - ${Math.max(...selectedReports.map(r => r.month))}/${Math.max(...selectedReports.map(r => r.year))}` : '-'}</div>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatVolumen(getTotalCombinedVolume(getVisiblePlants()))} m³</p>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <div>Concreto: {formatVolumen(getTotalVolume("Ventas Concreto", getVisiblePlants()))} m³</div>
                <div>Bombeo: {formatVolumen(getTotalVolume("Ventas Bombeo", getVisiblePlants()))} m³</div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto w-full border border-gray-200 dark:border-gray-700">
        <table className="w-full min-w-[1400px] lg:min-w-0 border-collapse text-xs">
          <thead>
            <tr className="bg-green-800 text-white sticky top-0 z-10">
              <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 sticky left-0 bg-green-800 z-20">
                Hierarquía
              </th>
              {getVisiblePlants().map((planta) => (
                <th key={planta} className="px-3 py-2 text-right border-b border-gray-200 dark:border-gray-600 whitespace-nowrap">
                  {planta}
                </th>
              ))}
              <th className="px-3 py-2 text-right border-b border-gray-200 dark:border-gray-600 whitespace-nowrap">
                Total
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-100">
            {Object.entries(matrixData).map(([tipo, tipoData]) => {
              const tipoKey = tipo
              const isTipoExpanded = expandedRows.has(tipoKey)
              return (
                <React.Fragment key={tipoKey}>
                  <tr className="bg-green-800 text-white hover:bg-green-900">
                    <td className="px-3 py-1.5 font-semibold flex items-center sticky left-0 bg-green-800 z-10 whitespace-nowrap">
                      <button onClick={() => toggleExpand(tipoKey)} className="mr-1 text-white hover:bg-green-700 p-0.5 rounded">
                        {isTipoExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      {tipo}
                    </td>
                    {getVisiblePlants().map((planta) => (
                      <td key={planta} className="px-3 py-1.5 text-right border-r border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium">
                        {formatMoney((tipoData as any).plantas[planta] ?? 0)}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium">
                      {formatMoney((tipoData as any).total)}
                    </td>
                  </tr>

                  {isTipoExpanded && Object.entries((tipoData as any).subCategorias).map(([subCategoria, subCategoriaData]) => {
                    const subCatKey = `${tipoKey}-${subCategoria}`
                    const isSubCatExpanded = expandedRows.has(subCatKey)
                    return (
                      <React.Fragment key={subCatKey}>
                        <tr className="bg-green-700 text-white hover:bg-green-800">
                          <td className="px-3 py-1.5 pl-6 flex items-center sticky left-0 bg-green-700 z-10 whitespace-nowrap">
                            <button onClick={() => toggleExpand(subCatKey)} className="mr-1 text-white hover:bg-green-600 p-0.5 rounded">
                              {isSubCatExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            {subCategoria}
                          </td>
                          {getVisiblePlants().map((planta) => (
                            <td key={planta} className="px-3 py-1.5 text-right border-r border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                              {formatMoney((subCategoriaData as any).plantas[planta] ?? 0)}
                            </td>
                          ))}
                          <td className="px-3 py-1.5 text-right bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {formatMoney((subCategoriaData as any).total)}
                          </td>
                        </tr>

                        {isSubCatExpanded && Object.entries((subCategoriaData as any).clasificaciones).map(([clasificacion, clasificacionData]) => {
                          const clasifKey = `${subCatKey}-${clasificacion}`
                          const isClasifExpanded = expandedRows.has(clasifKey)
                          return (
                            <React.Fragment key={clasifKey}>
                              <tr className={`bg-green-600 text-white hover:bg-green-700 ${clasificacion === "Costo Operativo" ? "outline-solid outline-2 outline-blue-500" : ""}`}>
                                <td className={`px-3 py-1.5 pl-10 flex items-center sticky left-0 z-10 whitespace-nowrap ${clasificacion === "Costo Operativo" ? "bg-blue-600" : "bg-green-600"}`}>
                                  <button onClick={() => toggleExpand(clasifKey)} className="mr-1 text-white hover:bg-green-500 p-0.5 rounded">
                                    {isClasifExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>
                                  {clasificacion}
                                </td>
                                {getVisiblePlants().map((planta) => {
                                  const montoPlanta = (clasificacionData as any).plantas[planta] ?? 0
                                  
                                  return (
                                    <td key={planta} className="px-3 py-1.5 text-right border-r border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                      {showUnitPriceView && tipo === "Egresos" ? (
                                        <div className="space-y-0.5">
                                          {(() => {
                                            const refVolume = getVolumeForUnitCost(planta, clasificacion)
                                            const unitCostWithRef = refVolume > 0
                                              ? Math.abs(montoPlanta) / refVolume
                                              : 0
                                            
                                            if (refVolume > 0) {
                                              return (
                                                <>
                                                  {formatUnitValue(unitCostWithRef, true)}
                                                  <div className="text-xxs text-gray-500 dark:text-gray-500">
                                                    {shouldUseCombinedVolume(clasificacion)
                                                      ? "por m³ (concreto + bombeo)"
                                                      : "por m³ de concreto"}
                                                  </div>
                                                </>
                                              )
                                            } else {
                                              return formatMoney(montoPlanta)
                                            }
                                          })()}
                                        </div>
                                      ) : (
                                        formatMoney(montoPlanta)
                                      )}
                                    </td>
                                  )
                                })}
                                <td className="px-3 py-1.5 text-right bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                  {showUnitPriceView && tipo === "Egresos" ? (
                                    <div className="space-y-0.5">
                                      {(() => {
                                        const visiblePlants = getVisiblePlants()
                                        const refVolume = shouldUseCombinedVolume(clasificacion)
                                          ? getTotalCombinedVolume(visiblePlants)
                                          : getTotalVolume("Ventas Concreto", visiblePlants)
                                        
                                        if (refVolume > 0) {
                                          const totalMonto = (clasificacionData as any).total
                                          const unitCost = Math.abs(totalMonto) / refVolume
                                          return (
                                            <>
                                              {formatUnitValue(unitCost, true)}
                                              <div className="text-xxs text-gray-500 dark:text-gray-500">
                                                {shouldUseCombinedVolume(clasificacion)
                                                  ? "por m³ (concreto + bombeo)"
                                                  : "por m³ de concreto"}
                                              </div>
                                              {shouldUseCombinedVolume(clasificacion) && (
                                                <div className="text-xxs text-gray-500 dark:text-gray-500">
                                                  {formatVolumen(refVolume)} m³ Total
                                                </div>
                                              )}
                                            </>
                                          )
                                        }
                                        return formatMoney((clasificacionData as any).total)
                                      })()}
                                    </div>
                                  ) : (
                                    formatMoney((clasificacionData as any).total)
                                  )}
                                </td>
                              </tr>

                              {isClasifExpanded && Object.entries((clasificacionData as any).categorias1).map(([categoria1, categoria1Data]) => {
                                const cat1Key = `${clasifKey}-${categoria1}`
                                const showVolInput = shouldShowVolumeDisplay(tipo, subCategoria, clasificacion, categoria1)
                                
                                                                  return (
                                    <tr key={cat1Key} className="bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30">
                                      <td className="px-3 py-1.5 pl-14 sticky left-0 bg-green-100 dark:bg-green-900/20 z-10 text-gray-700 dark:text-gray-200 whitespace-nowrap">{categoria1}</td>
                                      {getVisiblePlants().map((planta) => {
                                        const montoPlanta = (categoria1Data as any).plantas[planta] ?? 0
                                        const volumenPlanta = showVolInput ? volumenes[categoria1]?.[planta] ?? 0 : 0
                                        const unitValue = calculateUnitValue(montoPlanta, volumenPlanta)

                                        return (
                                          <td key={planta} className="px-3 py-1.5 text-right border-r border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 align-top">
                                            {showVolInput ? (
                                              <div className="space-y-0.5">
                                                <div className="font-medium">{formatMoney(montoPlanta)}</div>
                                                {volumenPlanta > 0 && (
                                                  <>
                                                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                                      {formatVolumen(volumenPlanta)} m³
                                                    </div>
                                                    <div className="text-xxs text-gray-500 dark:text-gray-400">
                                                      {formatUnitValue(unitValue)}
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            ) : (
                                              formatMoney(montoPlanta)
                                            )}
                                          </td>
                                        )
                                      })}
                                      <td className="px-3 py-1.5 text-right bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 align-top">
                                        {showVolInput ? (
                                          <div className="space-y-0.5">
                                            <div className="font-medium">{formatMoney((categoria1Data as any).total)}</div>
                                            {(() => {
                                              const visiblePlants = getVisiblePlants()
                                              const totalVolumenVisible = volumenes[categoria1]
                                                ? visiblePlants.reduce((sum, plt) => sum + (volumenes[categoria1][plt] ?? 0), 0)
                                                : 0

                                              if (totalVolumenVisible > 0) {
                                                const totalMonto = (categoria1Data as any).total
                                                return (
                                                  <>
                                                    <div className="text-xxs text-gray-500 dark:text-gray-400">
                                                      {formatVolumen(totalVolumenVisible)} m³ Total
                                                    </div>
                                                    <div className="text-xxs text-gray-500 dark:text-gray-400">
                                                      {formatUnitValue(calculateUnitValue(totalMonto, totalVolumenVisible))}
                                                    </div>
                                                  </>
                                                )
                                              }
                                              return null
                                            })()}
                                          </div>
                                        ) : (
                                          formatMoney((categoria1Data as any).total)
                                        )}
                                      </td>
                                    </tr>
                                  )
                              })}
                            </React.Fragment>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </React.Fragment>
              )
            })}

            {/* Total general Row */}
            <tr className="bg-green-800 text-white font-bold sticky bottom-0 z-20">
              <td className="px-3 py-2 sticky left-0 bg-green-800 z-10">Total General</td>
              {getVisiblePlants().map((planta) => {
                const totalPlanta = Object.values(matrixData).reduce(
                  (sum, tipoData) => sum + ((tipoData as any).plantas?.[planta] ?? 0),
                  0
                )
                return (
                  <td key={planta} className="px-3 py-2 text-right border-r border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold">
                    {formatMoney(totalPlanta)}
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold">
                {formatMoney(Object.values(matrixData).reduce((sum, tipoData) => sum + (tipoData as any).total, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend for Unit Price View */}
      {showUnitPriceView && (
        <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Información de Precios Unitarios</h3>
          <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Los precios unitarios para <span className="font-medium text-green-700 dark:text-green-400">Ingresos</span> se calculan usando los volúmenes configurados en el modal.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Los costos unitarios para <span className="font-medium text-red-700 dark:text-red-400">Materiales</span> (Cemento, Agregados, etc.) se calculan en relación al volumen total de concreto (fiscal + efectivo).</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Los costos unitarios para <span className="font-medium text-blue-700 dark:text-blue-400">Costo Operativo</span> se calculan en relación al volumen combinado total (concreto + bombeo, fiscal + efectivo).</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Para configurar volúmenes fiscales, haga clic en <span className="font-medium text-blue-600 dark:text-blue-400">"Configurar Volúmenes"</span> en el panel azul.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Para configurar ventas en efectivo, haga clic en <span className="font-medium text-green-600 dark:text-green-400">"Configurar Ventas en Efectivo"</span> en el panel verde.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Todos los valores unitarios se expresan en pesos mexicanos por metro cúbico (MXN/m³).</span>
            </li>
          </ul>
        </div>
      )}

      {/* Modals */}
      <EnhancedDebugModal
        isOpen={isDebugModalOpen}
        onClose={() => {
          setIsDebugModalOpen(false)
          setIsDebugFromValidation(false)
        }}
        data={isDebugFromValidation ? currentProcessedData : data}
        onDataChange={(newData) => {
          if (isDebugFromValidation) {
            setCurrentProcessedData(newData)
            // Update validation summary with new data
            const newValidation = validationEngine.validateData(newData, currentRawData)
            setValidationSummary(newValidation)
          } else {
            setData(newData)
            onDataUpdate(newData)
          }
        }}
        validationSummary={validationSummary}
        onReturnToValidation={() => {
          setIsDebugModalOpen(false)
          setIsValidationModalOpen(true)
        }}
      />

      {/* Volume Input Modal */}
      <VolumeInputModal
        isOpen={isVolumeModalOpen}
        onClose={() => setIsVolumeModalOpen(false)}
        onSave={handleVolumeSave}
        currentMonth={currentMonth}
        currentYear={currentYear}
        initialData={volumenes}
      />

      {/* Cash Sales Input Modal */}
      <CashSalesInputModal
        isOpen={isCashSalesModalOpen}
        onClose={() => setIsCashSalesModalOpen(false)}
        onSave={handleCashSalesSave}
        currentMonth={currentMonth}
        currentYear={currentYear}
        initialData={cashSalesData}
      />

      <ValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        validationSummary={validationSummary}
        fileName={currentFileName}
        onApprove={async (metadata: ReportMetadata) => {
          const report = await storageService.saveFinancialData(
            metadata.name,
            metadata.fileName,
            metadata.month,
            metadata.year,
            currentProcessedData
          )
          setData(currentProcessedData)
          onDataUpdate(currentProcessedData)
          setSelectedReportId(report.id)
          
          // Set current month/year for volume data management
          setCurrentMonth(metadata.month)
          setCurrentYear(metadata.year)
          await loadVolumeData(metadata.month, metadata.year)
          await loadCashSalesData(metadata.month, metadata.year)
          
          setValidationSummary(null)
          setCurrentProcessedData([])
          setCurrentRawData([])
        }}
        onViewUnclassified={() => {
          setIsValidationModalOpen(false)
          setIsDebugFromValidation(true)
          setIsDebugModalOpen(true)
        }}
      />

      {/* Report Selector */}
      {showReportSelector && (
        <div className="mb-6">
          <ReportSelector
            onSelectReport={async (report: FinancialReport) => {
              if (!enableAccumulation) {
                const reportData = await storageService.getFinancialData(report.id)
                const convertedData: DebugDataRow[] = reportData.map(row => ({
                  Codigo: row.codigo,
                  Concepto: row.concepto,
                  Abonos: row.abonos,
                  Cargos: row.cargos,
                  Tipo: row.tipo,
                  'Categoria 1': row.categoria_1,
                  'Sub categoria': row.sub_categoria,
                  Clasificacion: row.clasificacion,
                  Monto: row.monto,
                  Planta: row.planta,
                }))
                setData(convertedData)
                onDataUpdate(convertedData)
                setSelectedReportId(report.id)
                
                // Set current month/year and load volume data
                setCurrentMonth(report.month)
                setCurrentYear(report.year)
                await loadVolumeData(report.month, report.year)
                await loadCashSalesData(report.month, report.year)
              }
            }}
            onSelectMultipleReports={enableAccumulation ? handleMultipleReportsSelection : undefined}
            onDeleteReport={async (reportId: string) => {
              await storageService.deleteReport(reportId)
              if (selectedReportId === reportId) {
                setSelectedReportId(null)
              }
            }}
            selectedReportId={enableAccumulation ? undefined : (selectedReportId || undefined)}
            selectedReportIds={enableAccumulation ? selectedReports.map(r => r.id) : undefined}
            enableMultiSelect={enableAccumulation}
          />
        </div>
      )}
    </div>
  )
} 