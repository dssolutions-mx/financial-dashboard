"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Calculator, Upload, Eye, Download, Database, Calendar, DollarSign, Layers } from "lucide-react"
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

const getMonthName = (month: number): string => {
  return new Date(2024, month - 1, 1).toLocaleDateString('es-MX', { month: 'long' })
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
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([])
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [accumulatedReports, setAccumulatedReports] = useState<FinancialReport[]>([])
  const [isDebugFromValidation, setIsDebugFromValidation] = useState(false)
  
  // Volume persistence state
  const [currentMonth, setCurrentMonth] = useState<number | null>(null)
  const [currentYear, setCurrentYear] = useState<number | null>(null)
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false)
  const [isLoadingVolumes, setIsLoadingVolumes] = useState(false)
  
  // Cash sales state
  const [cashSalesData, setCashSalesData] = useState<Record<string, Record<string, { volume: number; amount: number }>>>({})
  const [isCashSalesModalOpen, setIsCashSalesModalOpen] = useState(false)
  const [isLoadingCashSales, setIsLoadingCashSales] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const storageService = new SupabaseStorageService()
  const { toast } = useToast()

  // Update local data when initialData changes
  useEffect(() => {
    setData(initialData)
  }, [initialData])

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
   
   // Calculate cash sales revenue inline
   let ingresosCash = 0
   Object.entries(cashSalesData).forEach(([category, plants]) => {
     visiblePlants.forEach(plant => {
       if (plants[plant]) {
         ingresosCash += plants[plant].amount
       }
     })
   })
   const ingresos = ingresosFiscales + ingresosCash
   const utilidadBruta = ingresos + egresos
   const porcentajeUtilidad = ingresos !== 0 ? (utilidadBruta / ingresos) * 100 : 0

   setSummaryData({
     ingresos,
     egresos,
     utilidadBruta,
     porcentajeUtilidad,
   })
 }, [selectedUnits, selectedCategory, cashSalesData])

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

     // Add cash sales data to hierarchy as additional income rows
     if (Object.keys(cashSalesData).length > 0) {
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
  }, [selectedUnits, selectedCategory, cashSalesData])

  // Main useEffect for data processing
  useEffect(() => {
     const validData = data.filter(row => row.Tipo !== 'Indefinido')

    calculateSummary(validData)
    processMatrixData(validData)

    if (validData.length > 0) {
       const uniqueCategories = Array.from(new Set(validData.map((item) => item["Categoria 1"]).filter(Boolean))) as string[]
       setCategories(["ALL", ...uniqueCategories.sort()])
    } else {
      setCategories(["ALL"])
    }
  }, [data, selectedUnits, selectedCategory, calculateSummary, processMatrixData, cashSalesData])

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

  // Function to accumulate data from multiple reports
  const accumulateReportsData = async (reports: FinancialReport[]) => {
    try {
      setIsLoading(true)
      const allData: DebugDataRow[] = []
      const accumulatedVolumes: Record<string, Record<string, number>> = {}
      const accumulatedCashSales: Record<string, Record<string, { volume: number; amount: number }>> = {}
      
      // Load and accumulate data from all selected reports
      for (const report of reports) {
        try {
          console.log(`Loading data for report: ${report.name} (${report.id})`)
          
          // Load financial data
          const reportData = await storageService.getFinancialData(report.id)
          
          if (!reportData || reportData.length === 0) {
            console.warn(`No data found for report ${report.name}`)
            continue
          }
          
          const convertedData: DebugDataRow[] = reportData.map(row => ({
            Codigo: row.codigo || '',
            Concepto: row.concepto || '',
            Abonos: parseFloat(row.abonos?.toString() || '0') || 0,
            Cargos: parseFloat(row.cargos?.toString() || '0') || 0,
            Tipo: row.tipo || '',
            'Categoria 1': row.categoria_1 || '',
            'Sub categoria': row.sub_categoria || '',
            Clasificacion: row.clasificacion || '',
            Monto: parseFloat(row.monto?.toString() || '0') || 0,
            Planta: row.planta || 'SIN CLASIFICACION',
          }))
          allData.push(...convertedData)
          
          // Load and accumulate volume data for this report
          try {
            const volumeData = await storageService.getPlantVolumesGrouped(report.month, report.year)
            Object.entries(volumeData).forEach(([category, plants]) => {
              if (!accumulatedVolumes[category]) {
                accumulatedVolumes[category] = {}
              }
              Object.entries(plants).forEach(([plant, volume]) => {
                if (!accumulatedVolumes[category][plant]) {
                  accumulatedVolumes[category][plant] = 0
                }
                accumulatedVolumes[category][plant] += volume
              })
            })
          } catch (volumeError) {
            console.warn(`No volume data for report ${report.name}:`, volumeError)
          }
          
          // Load and accumulate cash sales data for this report
          try {
            const cashSalesData = await storageService.getCashSalesGrouped(report.month, report.year)
            Object.entries(cashSalesData).forEach(([category, plants]) => {
              if (!accumulatedCashSales[category]) {
                accumulatedCashSales[category] = {}
              }
              Object.entries(plants).forEach(([plant, data]) => {
                if (!accumulatedCashSales[category][plant]) {
                  accumulatedCashSales[category][plant] = { volume: 0, amount: 0 }
                }
                accumulatedCashSales[category][plant].volume += data.volume
                accumulatedCashSales[category][plant].amount += data.amount
              })
            })
          } catch (cashError) {
            console.warn(`No cash sales data for report ${report.name}:`, cashError)
          }
          
        } catch (reportError) {
          console.error(`Error loading report ${report.name}:`, reportError)
          throw new Error(`Error al cargar el reporte ${report.name}`)
        }
      }
      
      if (allData.length === 0) {
        throw new Error("No se encontraron datos en los reportes seleccionados")
      }
      
      // Group and sum the data by unique keys
      const accumulatedData = accumulateData(allData)
      
      // Set all accumulated data
      setData(accumulatedData)
      onDataUpdate(accumulatedData)
      setAccumulatedReports(reports)
      setSelectedReportIds(reports.map(r => r.id))
      
      // Set accumulated volumes and cash sales
      setVolumenes(accumulatedVolumes)
      setCashSalesData(accumulatedCashSales)
      
      // Set current month/year to the latest report for UI display
      if (reports.length > 0) {
        const latestReport = reports.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year
          return b.month - a.month
        })[0]
        
        setCurrentMonth(latestReport.month)
        setCurrentYear(latestReport.year)
      }
      
      // Calculate total volumes and cash sales for the toast message
      const totalVolume = Object.values(accumulatedVolumes).reduce((total, plants) => {
        return total + Object.values(plants).reduce((sum, vol) => sum + vol, 0)
      }, 0)
      
      const totalCashAmount = Object.values(accumulatedCashSales).reduce((total, plants) => {
        return total + Object.values(plants).reduce((sum, data) => sum + data.amount, 0)
      }, 0)
      
      toast({
        title: "Reportes Acumulados",
        description: `${reports.length} reportes acumulados exitosamente: ${accumulatedData.length} registros, ${formatVolumen(totalVolume)} m³ total, ${formatMoney(totalCashAmount)} en ventas efectivo`,
        duration: 5000,
      })
    } catch (error) {
      console.error("Error accumulating reports:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al acumular los reportes"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Function to accumulate data by grouping and summing
  const accumulateData = (data: DebugDataRow[]): DebugDataRow[] => {
    const groupedData = new Map<string, DebugDataRow>()
    
    data.forEach(row => {
      // Create a unique key based on codigo, concepto, tipo, categoria, subcategoria, clasificacion, and planta
      const codigo = row.Codigo || ''
      const concepto = row.Concepto || ''
      const tipo = row.Tipo || ''
      const categoria1 = row['Categoria 1'] || ''
      const subCategoria = row['Sub categoria'] || ''
      const clasificacion = row.Clasificacion || ''
      const planta = row.Planta || 'SIN CLASIFICACION'
      
      const key = `${codigo}|${concepto}|${tipo}|${categoria1}|${subCategoria}|${clasificacion}|${planta}`
      
      if (groupedData.has(key)) {
        const existing = groupedData.get(key)!
        groupedData.set(key, {
          ...existing,
          Abonos: (existing.Abonos || 0) + (row.Abonos || 0),
          Cargos: (existing.Cargos || 0) + (row.Cargos || 0),
          Monto: (existing.Monto || 0) + (row.Monto || 0),
        })
      } else {
        groupedData.set(key, { ...row })
      }
    })
    
    return Array.from(groupedData.values())
  }

  return (
    <div className="w-full space-y-6">
      {/* Dashboard Header */}
      <Card className="p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard Financiero</h1>
              <p className="text-muted-foreground mt-1">
                {isMultiSelectMode && accumulatedReports.length > 0
                  ? `Vista Acumulada: ${accumulatedReports.length} períodos (${accumulatedReports[accumulatedReports.length - 1] ? `${getMonthName(accumulatedReports[accumulatedReports.length - 1].month)} ${accumulatedReports[accumulatedReports.length - 1].year}` : ''} - ${accumulatedReports[0] ? `${getMonthName(accumulatedReports[0].month)} ${accumulatedReports[0].year}` : ''})`
                  : currentMonth && currentYear 
                    ? `Período: ${new Date(2024, currentMonth - 1).toLocaleDateString('es-MX', { month: 'long' })} ${currentYear}` 
                    : "Análisis y visualización de datos financieros"
                }
              </p>
            </div>
            <div className="flex gap-2">
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
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer border ${
                  isProcessing
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                    : "bg-background hover:bg-accent hover:text-accent-foreground border-input"
                }`}
              >
                <Upload className="h-4 w-4" />
                {isProcessing ? "Procesando..." : "Subir Balanza"}
              </label>
              
              <Button
                variant={isMultiSelectMode ? "default" : "outline"}
                onClick={() => {
                  setIsMultiSelectMode(!isMultiSelectMode)
                  if (!isMultiSelectMode) {
                    setSelectedReportId(null)
                    setSelectedReportIds([])
                    setAccumulatedReports([])
                  }
                }}
                className="flex items-center gap-2"
              >
                <Layers className="h-4 w-4" />
                {isMultiSelectMode ? "Modo Acumulativo" : "Modo Individual"}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowReportSelector(!showReportSelector)}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                {showReportSelector ? "Ocultar Reportes" : "Ver Reportes"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Volume Data Button */}
      {currentMonth && currentYear && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Datos de Volumen - {isMultiSelectMode && accumulatedReports.length > 0 ? "Acumulado" : `${currentMonth}/${currentYear}`}
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {isMultiSelectMode && accumulatedReports.length > 0
                    ? "Mostrando volúmenes acumulados de múltiples períodos"
                    : isLoadingVolumes 
                      ? "Cargando datos..." 
                      : "Configure los metros cúbicos para cada planta"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsVolumeModalOpen(true)}
                disabled={isLoadingVolumes || (isMultiSelectMode && accumulatedReports.length > 0)}
                size="sm"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                <Database size={14} />
                {isMultiSelectMode && accumulatedReports.length > 0 ? "Vista Acumulada" : "Configurar Volúmenes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Sales Data Button */}
      {currentMonth && currentYear && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <DollarSign size={20} className="text-green-600 dark:text-green-400" />
              <div>
                <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
                  Ventas en Efectivo - {isMultiSelectMode && accumulatedReports.length > 0 ? "Acumulado" : `${currentMonth}/${currentYear}`}
                </h3>
                <p className="text-xs text-green-700 dark:text-green-300">
                  {isMultiSelectMode && accumulatedReports.length > 0
                    ? "Mostrando ventas en efectivo acumuladas de múltiples períodos"
                    : isLoadingCashSales 
                      ? "Cargando datos..." 
                      : "Configure las ventas en efectivo (no fiscales)"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsCashSalesModalOpen(true)}
                disabled={isLoadingCashSales || (isMultiSelectMode && accumulatedReports.length > 0)}
                size="sm"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              >
                <DollarSign size={14} />
                {isMultiSelectMode && accumulatedReports.length > 0 ? "Vista Acumulada" : "Configurar Ventas en Efectivo"}
              </Button>
            </div>
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
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <div>Fiscal: {formatMoney(summaryData.ingresos - getTotalCashSalesRevenue(getVisiblePlants()), true)}</div>
            <div>Efectivo: {formatMoney(getTotalCashSalesRevenue(getVisiblePlants()), true)}</div>
          </div>
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
          <h3 className="text-xs text-gray-600 dark:text-gray-400">VOLUMEN TOTAL</h3>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatVolumen(getTotalCombinedVolume(getVisiblePlants()))} m³</p>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <div>Concreto: {formatVolumen(getTotalVolume("Ventas Concreto", getVisiblePlants()))} m³</div>
            <div>Bombeo: {formatVolumen(getTotalVolume("Ventas Bombeo", getVisiblePlants()))} m³</div>
          </div>
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
            multiSelect={isMultiSelectMode}
            selectedReportIds={selectedReportIds}
            onAccumulateReports={accumulateReportsData}
            onSelectReport={async (report: FinancialReport) => {
              if (!isMultiSelectMode) {
                const reportData = await storageService.getFinancialData(report.id)
                const convertedData: DebugDataRow[] = reportData.map(row => ({
                  Codigo: row.codigo || '',
                  Concepto: row.concepto || '',
                  Abonos: parseFloat(row.abonos?.toString() || '0') || 0,
                  Cargos: parseFloat(row.cargos?.toString() || '0') || 0,
                  Tipo: row.tipo || '',
                  'Categoria 1': row.categoria_1 || '',
                  'Sub categoria': row.sub_categoria || '',
                  Clasificacion: row.clasificacion || '',
                  Monto: parseFloat(row.monto?.toString() || '0') || 0,
                  Planta: row.planta || 'SIN CLASIFICACION',
                }))
                setData(convertedData)
                onDataUpdate(convertedData)
                setSelectedReportId(report.id)
                setAccumulatedReports([])
                setSelectedReportIds([])
                
                // Set current month/year and load volume data
                setCurrentMonth(report.month)
                setCurrentYear(report.year)
                await loadVolumeData(report.month, report.year)
                await loadCashSalesData(report.month, report.year)
              }
            }}
                         onDeleteReport={async (reportId: string) => {
               await storageService.deleteReport(reportId)
               if (selectedReportId === reportId) {
                 setSelectedReportId(null)
               }
             }}
            selectedReportId={selectedReportId || undefined}
          />
        </div>
      )}
      
      {/* Loading Indicator */}
      {isLoading && (
        <Card className="p-4 mb-6 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-gray-100"></div>
            <span className="text-gray-700 dark:text-gray-300">Cargando reportes...</span>
          </div>
        </Card>
      )}
      
      {/* Accumulated Reports Info */}
      {isMultiSelectMode && accumulatedReports.length > 0 && !isLoading && (
        <Card className="p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Reportes Acumulados ({accumulatedReports.length})
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {accumulatedReports.map(r => `${getMonthName(r.month)} ${r.year}`).join(' + ')}
                </p>
                <div className="flex gap-4 mt-1 text-xs text-blue-600 dark:text-blue-400">
                  <span className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    Incluye volúmenes acumulados
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Incluye ventas en efectivo
                  </span>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setData([])
                onDataUpdate([])
                setAccumulatedReports([])
                setSelectedReportIds([])
                setVolumenes({})
                setCashSalesData({})
              }}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Limpiar
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
} 