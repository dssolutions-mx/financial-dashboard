"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { ChevronDown, ChevronRight, Upload, Eye, Download, Calculator, Database } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { handleBalanzaFileUpload, type DebugDataRow } from "@/lib/excel-processor"
import { validationEngine, ValidationSummary, ReportMetadata } from "@/lib/validation-engine"
import { SupabaseStorageService, FinancialReport } from "@/lib/supabase-storage"
import EnhancedDebugModal from "./enhanced-debug-modal"
import ValidationModal from "./validation-modal"
import ReportSelector from "./report-selector"
import { useToast } from "@/hooks/use-toast"

interface FinancialDashboardProps {
  initialData: DebugDataRow[]
  onDataUpdate: (data: DebugDataRow[]) => void
}

// Define Egresos categories eligible for volume/cost input
const EGRESOS_CON_VOLUMEN = [
  "Cemento",
  "Agregado Grueso",
  "Agregado Fino",
  "Aditivos",
  "Agua",
  "Diesel CR",
  // Add other relevant cost categories if needed
];

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ initialData, onDataUpdate }) => {
  const [data, setData] = useState<DebugDataRow[]>(initialData)
  const [selectedUnits, setSelectedUnits] = useState<string[]>(["ALL"])
  const [expandedRows, setExpandedRows] = useState(new Set(["Ingresos", "Egresos"]))
  const [matrixData, setMatrixData] = useState<Record<string, any>>({})
  const [summaryData, setSummaryData] = useState({
    ingresos: 0,
    egresos: 0,
    utilidadBruta: 0,
    porcentajeUtilidad: 0,
  })
  const [volumenes, setVolumenes] = useState<Record<string, Record<string, number>>>({})
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [categories, setCategories] = useState<string[]>(["ALL"])
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
  const [storageService] = useState(() => new SupabaseStorageService())
  
  const { toast } = useToast()

  // Update local data when initialData changes
  useEffect(() => {
    setData(initialData)
  }, [initialData])

  // Mapeo de plantas a unidades de negocio
  const plantToUnit: Record<string, string> = useMemo(() => ({
    P1: "BAJIO",
    P3: "ITISA",
    P2: "VIADUCTO",
    P4: "VIADUCTO",
    P5: "BAJIO",
  }), []);

  // Mapeo de unidades de negocio a plantas
  const unitToPlants: Record<string, string[]> = useMemo(() => ({
    BAJIO: ["P1", "P5"],
    ITISA: ["P3"],
    VIADUCTO: ["P2", "P4"],
  }), []);

  // Define all possible plants (removed MEXICALI)
  const ALL_PLANTS = useMemo(() => ["P1", "P2", "P3", "P4", "P5", "SIN CLASIFICACION"], []);

  // Initialize volumenes state with all plants for relevant categories
   useEffect(() => {
    const initialVolumenes: Record<string, Record<string, number>> = {};
    const relevantCategories = [
        "Ventas Concreto", // This is a Categoria 1
        "Ventas Bombeo",   // This is a Categoria 1
        ...EGRESOS_CON_VOLUMEN // These are also Categoria 1
    ];

    relevantCategories.forEach(category => {
        initialVolumenes[category] = ALL_PLANTS.reduce((acc, plant) => {
            acc[plant] = 0;
            return acc;
        }, {} as Record<string, number>);
    });
    setVolumenes(initialVolumenes);
}, [ALL_PLANTS]); // Run once when ALL_PLANTS is stable

  // Obtener plantas visibles según el filtro
  const getVisiblePlants = useCallback(() => {
    if (selectedUnits.includes("ALL")) {
      return ALL_PLANTS
    }
     // Ensure units exist in unitToPlants before flattening
     return selectedUnits
        .filter(unit => unitToPlants[unit])
        .flatMap((unit) => unitToPlants[unit]);
  }, [selectedUnits, ALL_PLANTS, unitToPlants])

  const toggleUnit = (unit: string) => {
    setSelectedUnits((prev) => {
      if (unit === "ALL") {
        return ["ALL"]
      }

      const newUnits = prev.filter((u) => u !== "ALL")
      if (prev.includes(unit)) {
        const filtered = newUnits.filter((u) => u !== unit)
        return filtered.length === 0 ? ["ALL"] : filtered
      } else {
        return [...newUnits, unit]
      }
    })
  }

  const handleVolumenChange = (identifier: string, planta: string, valor: string) => {
    setVolumenes((prev) => {
      if (!prev[identifier]) {
        console.warn(`Category ${identifier} not found in volumenes state.`);
        return prev;
      }
      return {
        ...prev,
        [identifier]: {
          ...prev[identifier],
          [planta]: Number.parseFloat(valor) || 0,
        },
      };
    });
  };

  const calculateUnitValue = (monto: number, volumen: number) => {
    if (!volumen || volumen === 0) return 0
    return Math.abs(monto) / volumen
  }

   const formatUnitValue = (value: number, isCost = false) => {
    const formatted = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `${formatted} / m³`;
  };

 const shouldShowVolumeInput = (
    tipo: string,
    subCategoria: string,
    clasificacion: string,
    categoria1: string // Innermost level
  ) => {
    // Only show volume input for concrete and bombeo sales
    if (tipo === "Ingresos") {
      return (
        (categoria1 === "Ventas Concreto" && subCategoria === "Ventas" && clasificacion === "Ventas") ||
        (categoria1 === "Ventas Bombeo" && subCategoria === "Ventas Bombeo" && clasificacion === "Ventas Bombeo")
      );
    }
    return false;
  };

  const formatVolumen = (volumen: number) => {
    return new Intl.NumberFormat("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(volumen)
  }

  const formatMoney = (amount: number | null | undefined, useMillions = false) => {
     if (amount == null) {
       return new Intl.NumberFormat("es-MX", {
         style: "currency",
         currency: "MXN",
         minimumFractionDigits: 2,
         maximumFractionDigits: 2,
       }).format(0);
     }

    if (useMillions) {
      return (
        new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount / 1000000) + "M"
      )
    }
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsProcessing(true)
      
      // Use validation engine to process Excel with validation
      const { processedData, rawData, validation } = await validationEngine.processExcelWithValidation(file)
      
      // Store the results for validation review
      setCurrentProcessedData(processedData)
      setCurrentRawData(rawData)
      setCurrentFileName(file.name)
      setValidationSummary(validation)
      
      // Show validation modal for review
      setIsValidationModalOpen(true)
      
      toast({
        title: "Archivo procesado",
        description: "Revise los resultados de validación antes de guardar.",
        variant: validation.isValid ? "default" : "destructive",
      })
    } catch (error) {
      console.error("Error processing file:", error)
      toast({
        title: "Error",
        description: "Error al procesar el archivo. Por favor, intente de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDataUpdate = useCallback((index: number, updatedRow: DebugDataRow) => {
    setData((currentData) => {
      const newData = [...currentData]
      newData[index] = updatedRow
      return newData
    })
  }, [])

  const handleSaveChanges = useCallback(
    (updatedData: DebugDataRow[]) => {
      setData(updatedData)
      onDataUpdate(updatedData)
      
      // Recalculate validation summary when data changes
      if (currentRawData.length > 0) {
        const validation = validationEngine.validateData(updatedData, currentRawData)
        setValidationSummary(validation)
      }
      
      toast({
        title: "Datos actualizados",
        description: "Los cambios han sido guardados exitosamente.",
      })
    },
    [onDataUpdate, toast, currentRawData],
  )

  // Validation workflow handlers
  const handleApproveData = async (metadata: ReportMetadata) => {
    try {
      const report = await storageService.saveFinancialData(
        metadata.name,
        metadata.fileName,
        metadata.month,
        metadata.year,
        currentProcessedData
      )
      
      // Set the data in the dashboard
      setData(currentProcessedData)
      onDataUpdate(currentProcessedData)
      setSelectedUnits(["ALL"])
      setSelectedCategory("ALL")
      setExpandedRows(new Set(["Ingresos", "Egresos"]))
      setSelectedReportId(report.id)
      
      toast({
        title: "Datos guardados",
        description: `Reporte "${metadata.name}" guardado exitosamente.`,
      })
    } catch (error) {
      console.error("Error saving data:", error)
      throw error
    }
  }

  const handleViewUnclassified = () => {
    setIsValidationModalOpen(false)
    setData(currentProcessedData)
    onDataUpdate(currentProcessedData)
    setIsDebugModalOpen(true)
  }

  const handleReturnToValidation = () => {
    // Close debug modal and reopen validation modal with updated data
    setIsDebugModalOpen(false)
    
    // Recalculate validation summary with current data
    if (currentRawData.length > 0) {
      const validation = validationEngine.validateData(data, currentRawData)
      setValidationSummary(validation)
    }
    
    setIsValidationModalOpen(true)
  }

  const handleSelectReport = async (report: FinancialReport) => {
    try {
      setIsProcessing(true)
      const reportData = await storageService.getFinancialData(report.id)
      
      // Convert FinancialDataRow to DebugDataRow format
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
      setSelectedUnits(["ALL"])
      setSelectedCategory("ALL")
      setExpandedRows(new Set(["Ingresos", "Egresos"]))
      
      toast({
        title: "Reporte cargado",
        description: `Datos de "${report.name}" cargados exitosamente.`,
      })
    } catch (error) {
      console.error("Error loading report:", error)
      toast({
        title: "Error",
        description: "Error al cargar el reporte.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    // Implementation for deleting reports (optional for Stage 1)
    toast({
      title: "Función no disponible",
      description: "La eliminación de reportes estará disponible en la siguiente versión.",
    })
  }

  const exportToJson = () => {
    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "financial_data.json"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Exportación completada",
      description: "Los datos han sido exportados a JSON.",
    })
  }

   const toggleExpand = useCallback((key: string) => {
    setExpandedRows(prev => {
        const newExpanded = new Set(prev);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        return newExpanded;
    });
  }, []);

  // --- Define calculation functions before the main useEffect that uses them ---
  const calculateSummary = useCallback((filteredData: DebugDataRow[]) => {
    const filteredByUnit = selectedUnits.includes("ALL")
     ? filteredData
     : filteredData.filter((row) => {
         const unit = plantToUnit[row.Planta as keyof typeof plantToUnit]
         return unit ? selectedUnits.includes(unit) : false;
       });

   const finalFilteredData =
     selectedCategory === "ALL"
       ? filteredByUnit
       : filteredByUnit.filter((row) => row["Categoria 1"] === selectedCategory);

   const ingresos = finalFilteredData.filter((row) => row.Tipo === "Ingresos").reduce((sum, row) => sum + row.Monto, 0)
   const egresosPositive = finalFilteredData.filter((row) => row.Tipo === "Egresos").reduce((sum, row) => sum + row.Monto, 0)
   // Store egresos as negative for proper display and calculation
   const egresos = -Math.abs(egresosPositive)
   const utilidadBruta = ingresos + egresos // Now works correctly: ingresos + (-egresos) = ingresos - egresos
   const porcentajeUtilidad = ingresos !== 0 ? (utilidadBruta / ingresos) * 100 : 0

   setSummaryData({
     ingresos,
     egresos,
     utilidadBruta,
     porcentajeUtilidad,
   })
 }, [selectedUnits, selectedCategory, plantToUnit]);

 const processMatrixData = useCallback((filteredData: DebugDataRow[]) => {
   const filteredByUnit = selectedUnits.includes("ALL")
     ? filteredData
     : filteredData.filter((row) => {
         const unit = plantToUnit[row.Planta as keyof typeof plantToUnit];
         return unit ? selectedUnits.includes(unit) : false;
       });

    const finalFilteredData = selectedCategory === 'ALL'
           ? filteredByUnit
           : filteredByUnit.filter(row => row['Categoria 1'] === selectedCategory);

   const hierarchy: Record<string, any> = {}

   finalFilteredData.forEach((row) => {
     const tipo = row.Tipo
     const subCategoria = row["Sub categoria"] || "Sin Subcategoría"
     const clasificacion = row.Clasificacion || "Sin Clasificación"
     const categoria1 = row["Categoria 1"] || "Sin Categoría"
     const planta = row.Planta
     // Convert egresos to negative for consistent display throughout the table
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

       hierarchy[tipo].total += monto;
       if (hierarchy[tipo].plantas[validPlanta] !== undefined) {
         hierarchy[tipo].plantas[validPlanta] += monto;
       } else { console.warn(`Plant ${validPlanta} not initialized for Tipo ${tipo}`); }

       hierarchy[tipo].subCategorias[subCategoria].total += monto;
       if (hierarchy[tipo].subCategorias[subCategoria].plantas[validPlanta] !== undefined) {
         hierarchy[tipo].subCategorias[subCategoria].plantas[validPlanta] += monto;
        } else { console.warn(`Plant ${validPlanta} not initialized for SubCat ${subCategoria}`); }

       hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].total += monto;
        if (hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].plantas[validPlanta] !== undefined) {
          hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].plantas[validPlanta] += monto;
        } else { console.warn(`Plant ${validPlanta} not initialized for Clasif ${clasificacion}`); }

       hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].categorias1[categoria1].total += monto;
        if (hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].categorias1[categoria1].plantas[validPlanta] !== undefined) {
          hierarchy[tipo].subCategorias[subCategoria].clasificaciones[clasificacion].categorias1[categoria1].plantas[validPlanta] += monto;
        } else { console.warn(`Plant ${validPlanta} not initialized for Cat1 ${categoria1}`); }
     })

   setMatrixData(hierarchy)
  }, [selectedUnits, selectedCategory, plantToUnit, ALL_PLANTS]);

  // --- Main useEffect for data processing ---
  useEffect(() => {
     const validData = data.filter(row => row.Tipo !== 'Indefinido');

    calculateSummary(validData);
    processMatrixData(validData);

    if (validData.length > 0) {
       const uniqueCategories = Array.from(new Set(validData.map((item) => item["Categoria 1"]).filter(Boolean))) as string[]
       setCategories(["ALL", ...uniqueCategories.sort()]);
    } else {
      setCategories(["ALL"]);
    }
  }, [data, selectedUnits, selectedCategory, ALL_PLANTS, calculateSummary, processMatrixData]);

  // Determine whether a cost category should use combined volume (concrete + bombeo)
  const shouldUseCombinedVolume = (clasificacion: string) => {
    console.log(`Checking classification: "${clasificacion}"`);
    return clasificacion === "Costo Operativo";
  };

  // Calculate volume to use for unit cost calculations
  const getVolumeForUnitCost = (planta: string, clasificacion: string) => {
    if (shouldUseCombinedVolume(clasificacion)) {
      // For operational costs, use combined volume (concrete + bombeo)
      const concreteVol = volumenes["Ventas Concreto"]?.[planta] ?? 0;
      const bombeoVol = volumenes["Ventas Bombeo"]?.[planta] ?? 0;
      return concreteVol + bombeoVol;
    } else {
      // For material costs, use concrete volume only
      return volumenes["Ventas Concreto"]?.[planta] ?? 0;
    }
  };

  // Get total volumes across all visible plants
  const getTotalVolume = (categoria: string, visiblePlants: string[]) => {
    return volumenes[categoria]
      ? visiblePlants.reduce((sum, plt) => sum + (volumenes[categoria][plt] ?? 0), 0)
      : 0;
  };

  // Get combined total volume (concrete + bombeo) across all visible plants
  const getTotalCombinedVolume = (visiblePlants: string[]) => {
    const totalConcreteVol = getTotalVolume("Ventas Concreto", visiblePlants);
    const totalBombeoVol = getTotalVolume("Ventas Bombeo", visiblePlants);
    return totalConcreteVol + totalBombeoVol;
  };

  return (
    <div className="p-6 bg-gray-50 w-full max-w-full overflow-auto relative" style={{ maxHeight: "calc(100vh - 4rem)" }}>
       {/* Header Section */}
       <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-green-800 rounded-md flex items-center justify-center text-white font-bold">
            DC
          </div>
          <h1 className="text-2xl font-bold text-gray-800 whitespace-nowrap">REPORTE DE INGRESOS Y EGRESOS</h1>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
           {/* Category Dropdown */}
          <div className="flex items-center space-x-2 min-w-[180px]">
            <label htmlFor="category-select" className="text-sm text-gray-600 whitespace-nowrap">CATEGORÍA 1</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border rounded px-2 py-1 w-full text-sm"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
           {/* Unit Price View Toggle */}
          <Button
                          variant={showUnitPriceView ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnitPriceView(!showUnitPriceView)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              showUnitPriceView 
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "border-gray-300 hover:bg-gray-100 text-gray-700"
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
               className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-gray-300 hover:bg-gray-100 text-sm"
              disabled={data.length === 0}
            >
              <Eye size={14} /> 
              Verificar
            </Button>
            <Button
              variant="outline"
              size="sm" 
              onClick={exportToJson}
               className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-gray-300 hover:bg-gray-100 text-sm"
              disabled={data.length === 0}
            >
              <Download size={14} /> 
              Exportar
            </Button>
            <Button
              variant="outline"
              size="sm" 
              onClick={() => setShowReportSelector(!showReportSelector)}
               className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-gray-300 hover:bg-gray-100 text-sm"
            >
              <Database size={14} /> 
              {showReportSelector ? "Ocultar Reportes" : "Ver Reportes"}
            </Button>
          </div>
        </div>
      </div>

       {/* Unit Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.keys(unitToPlants).map((unit) => (
          <button
            key={unit}
            onClick={() => toggleUnit(unit)}
            className={`p-2 text-center rounded-lg transition-colors flex-1 min-w-[100px] border text-sm ${ 
                selectedUnits.includes(unit)
                  ? "bg-green-800 text-white border-green-900"
                  : "bg-white hover:bg-green-50 border-gray-200 text-gray-700"
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
                : "bg-white hover:bg-green-50 border-gray-200 text-gray-700"
            }`}
        >
          TODAS
        </button>
      </div>

       {/* Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
         <Card className="p-3 bg-white shadow-xs hover:shadow-md transition-shadow border border-gray-200">
          <h3 className="text-xs text-gray-600">INGRESOS</h3>
           <p className="text-lg font-bold text-gray-800">{formatMoney(summaryData.ingresos, true)}</p>
        </Card>
         <Card className="p-3 bg-white shadow-xs hover:shadow-md transition-shadow border border-gray-200">
          <h3 className="text-xs text-gray-600">EGRESOS</h3>
           <p className="text-lg font-bold text-gray-800">{formatMoney(summaryData.egresos, true)}</p>
        </Card>
         <Card className="p-3 bg-white shadow-xs hover:shadow-md transition-shadow border border-gray-200">
          <h3 className="text-xs text-gray-600">UTILIDAD BRUTA</h3>
           <p className="text-lg font-bold text-gray-800">{formatMoney(summaryData.utilidadBruta, true)}</p>
        </Card>
         <Card className="p-3 bg-white shadow-xs hover:shadow-md transition-shadow border border-gray-200">
          <h3 className="text-xs text-gray-600">% UTILIDAD BRUTA</h3>
           <p className="text-lg font-bold text-gray-800">{summaryData.porcentajeUtilidad.toFixed(2)}%</p>
        </Card>
      </div>

      {/* Report Selector */}
      {showReportSelector && (
        <div className="mb-6">
          <ReportSelector
            onSelectReport={handleSelectReport}
            onDeleteReport={handleDeleteReport}
            selectedReportId={selectedReportId || undefined}
          />
        </div>
      )}

       {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto w-full">
            <table className="w-full min-w-[1400px] lg:min-w-0 border-collapse text-xs">
                <thead>
                     <tr className="bg-green-800 text-white sticky top-0 z-10">
                         <th className="px-3 py-2 text-left border-b border-gray-200 sticky left-0 bg-green-800 z-20">Hierarquía</th> 
                        {getVisiblePlants().map((planta) => (
                            <th key={planta} className="px-3 py-2 text-right border-b border-gray-200 whitespace-nowrap">
                                {planta}
                            </th>
                        ))}
                         <th className="px-3 py-2 text-right border-b border-gray-200 whitespace-nowrap">Total</th>
                    </tr>
                </thead>
                 <tbody className="divide-y divide-gray-100">
                    {Object.entries(matrixData).map(([tipo, tipoData]) => {
                        const tipoKey = tipo;
                        const isTipoExpanded = expandedRows.has(tipoKey);
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
                                         <td key={planta} className="px-3 py-1.5 text-right border-r border-gray-200 bg-white text-gray-700 font-medium">
                                            {formatMoney((tipoData as any).plantas[planta] ?? 0)}
                                        </td>
                                    ))}
                                     <td className="px-3 py-1.5 text-right bg-white text-gray-700 font-medium">
                                        {formatMoney((tipoData as any).total)}
                                    </td>
                                </tr>

                                {isTipoExpanded && Object.entries((tipoData as any).subCategorias).map(([subCategoria, subCategoriaData]) => {
                                    const subCatKey = `${tipoKey}-${subCategoria}`;
                                    const isSubCatExpanded = expandedRows.has(subCatKey);
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
                                                     <td key={planta} className="px-3 py-1.5 text-right border-r border-gray-200 bg-white text-gray-600">
                                                         {formatMoney((subCategoriaData as any).plantas[planta] ?? 0)}
                                                    </td>
                                                ))}
                                                 <td className="px-3 py-1.5 text-right bg-white text-gray-600">
                                                    {formatMoney((subCategoriaData as any).total)}
                                                </td>
                                            </tr>

                                            {isSubCatExpanded && Object.entries((subCategoriaData as any).clasificaciones).map(([clasificacion, clasificacionData]) => {
                                                const clasifKey = `${subCatKey}-${clasificacion}`;
                                                const isClasifExpanded = expandedRows.has(clasifKey);
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
                                                                const montoPlanta = (clasificacionData as any).plantas[planta] ?? 0;
                                                                
                                                                return (
                                                                    <td key={planta} className="px-3 py-1.5 text-right border-r border-gray-200 bg-white text-gray-500">
                                                                        {showUnitPriceView && tipo === "Egresos" ? (
                                                                            <div className="space-y-0.5">
                                                                                {(() => {
                                                                                    const refVolume = getVolumeForUnitCost(planta, clasificacion);
                                                                                    const unitCostWithRef = refVolume > 0 
                                                                                        ? Math.abs(montoPlanta) / refVolume 
                                                                                        : 0;
                                                                                    
                                                                                    if (refVolume > 0) {
                                                                                        return (
                                                                                            <>
                                                                                                {formatUnitValue(unitCostWithRef, true)}
                                                                                                <div className="text-xxs text-gray-500">
                                                                                                    {shouldUseCombinedVolume(clasificacion) 
                                                                                                        ? "por m³ (concreto + bombeo)" 
                                                                                                        : "por m³ de concreto"}
                                                                                                </div>
                                                                                            </>
                                                                                        );
                                                                                    } else {
                                                                                        return formatMoney(montoPlanta);
                                                                                    }
                                                                                })()}
                                                                            </div>
                                                                        ) : (
                                                                            formatMoney(montoPlanta)
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="px-3 py-1.5 text-right bg-white text-gray-500">
                                                                {showUnitPriceView && tipo === "Egresos" ? (
                                                                    <div className="space-y-0.5">
                                                                        {(() => {
                                                                            const visiblePlants = getVisiblePlants();
                                                                            const refVolume = shouldUseCombinedVolume(clasificacion)
                                                                                ? getTotalCombinedVolume(visiblePlants)
                                                                                : getTotalVolume("Ventas Concreto", visiblePlants);
                                                                            
                                                                            if (refVolume > 0) {
                                                                                const totalMonto = (clasificacionData as any).total;
                                                                                const unitCost = Math.abs(totalMonto) / refVolume;
                                                                                return (
                                                                                    <>
                                                                                        {formatUnitValue(unitCost, true)}
                                                                                        <div className="text-xxs text-gray-500">
                                                                                            {shouldUseCombinedVolume(clasificacion)
                                                                                                ? "por m³ (concreto + bombeo)"
                                                                                                : "por m³ de concreto"}
                                                                                        </div>
                                                                                        {shouldUseCombinedVolume(clasificacion) && (
                                                                                            <div className="text-xxs text-gray-500">
                                                                                                {formatVolumen(refVolume)} m³ Total
                                                                                            </div>
                                                                                        )}
                                                                                    </>
                                                                                );
                                                                            }
                                                                            return formatMoney((clasificacionData as any).total);
                                                                        })()}
                                                                    </div>
                                                                ) : (
                                                                    formatMoney((clasificacionData as any).total)
                                                                )}
                                                            </td>
                                                        </tr>

                                                        {isClasifExpanded && Object.entries((clasificacionData as any).categorias1).map(([categoria1, categoria1Data]) => {
                                                            const cat1Key = `${clasifKey}-${categoria1}`;
                                                            const showVolInput = shouldShowVolumeInput(tipo, subCategoria, clasificacion, categoria1);
                                                            const isEgreso = tipo === 'Egresos';
                                                            const isEgresoWithVolume = isEgreso && EGRESOS_CON_VOLUMEN.includes(categoria1);
                                                            
                                                            return (
                                                                <tr key={cat1Key} className="bg-green-100 hover:bg-green-200">
                                                                    <td className="px-3 py-1.5 pl-14 sticky left-0 bg-green-100 z-10 text-gray-700 whitespace-nowrap">{categoria1}</td>
                                                                    {getVisiblePlants().map((planta) => {
                                                                        const montoPlanta = (categoria1Data as any).plantas[planta] ?? 0;
                                                                        const volumenPlanta = showVolInput ? volumenes[categoria1]?.[planta] ?? 0 : 0;
                                                                        const unitValue = calculateUnitValue(montoPlanta, volumenPlanta);
                                                                        
                                                                        // If expense and we need to reference concrete volume
                                                                        const concretePlantVolume = isEgresoWithVolume && showUnitPriceView 
                                                                            ? getVolumeForUnitCost(planta, clasificacion)
                                                                            : 0;
                                                                        
                                                                        const unitCostWithConcreteRef = concretePlantVolume > 0 
                                                                            ? Math.abs(montoPlanta) / concretePlantVolume 
                                                                            : 0;

                                                                        return (
                                                                            <td key={planta} className="px-3 py-1.5 text-right border-r border-gray-200 bg-white text-gray-700 align-top">
                                                                                {showVolInput ? (
                                                                                    <div className="space-y-0.5">
                                                                                        {!showUnitPriceView ? (
                                                                                            <>
                                                                                                <div className="font-medium">{formatMoney(montoPlanta)}</div>
                                                                                                <div className="flex items-center justify-end gap-1">
                                                                                                    <Input
                                                                                                        type="number"
                                                                                                        value={volumenPlanta || ""}
                                                                                                        onChange={(e) => handleVolumenChange(categoria1, planta, e.target.value)}
                                                                                                        className="w-16 h-6 text-right text-xs text-gray-700 bg-white border border-gray-300 rounded-sm px-1 focus:outline-hidden focus:ring-1 focus:ring-green-500"
                                                                                                        placeholder="m³"
                                                                                                        step="any"
                                                                                                    />
                                                                                                </div>
                                                                                                {volumenPlanta > 0 && (
                                                                                                    <div className="text-xxs text-gray-500">
                                                                                                        {formatUnitValue(unitValue)}
                                                                                                    </div>
                                                                                                )}
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                {volumenPlanta > 0 ? formatUnitValue(unitValue) : formatMoney(montoPlanta)}
                                                                                                <div className="text-xxs text-gray-500">
                                                                                                    {shouldUseCombinedVolume(clasificacion)
                                                                                                        ? "por m³ (concreto + bombeo)"
                                                                                                        : "por m³ de concreto"}
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                ) : isEgresoWithVolume ? (
                                                                                    <div className="space-y-0.5">
                                                                                        {!showUnitPriceView ? (
                                                                                            formatMoney(montoPlanta)
                                                                                        ) : (
                                                                                            <>
                                                                                                {concretePlantVolume > 0 ? (
                                                                                                    <>
                                                                                                        {formatUnitValue(unitCostWithConcreteRef, true)}
                                                                                                        <div className="text-xxs text-gray-500">
                                                                                                            {shouldUseCombinedVolume(clasificacion) 
                                                                                                                ? "por m³ (concreto + bombeo)" 
                                                                                                                : "por m³ de concreto"}
                                                                                                        </div>
                                                                                                    </>
                                                                                                ) : (
                                                                                                    formatMoney(montoPlanta)
                                                                                                )}
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    formatMoney(montoPlanta)
                                                                                )}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                    <td className="px-3 py-1.5 text-right bg-white text-gray-700 align-top">
                                                                        {showVolInput ? (
                                                                            <div className="space-y-0.5">
                                                                                {!showUnitPriceView ? (
                                                                                    <>
                                                                                        <div className="font-medium">{formatMoney((categoria1Data as any).total)}</div>
                                                                                        {(() => {
                                                                                            const visiblePlants = getVisiblePlants();
                                                                                            const totalVolumenVisible = volumenes[categoria1]
                                                                                                ? visiblePlants.reduce((sum, plt) => sum + (volumenes[categoria1][plt] ?? 0), 0)
                                                                                                : 0;

                                                                                            if (totalVolumenVisible > 0) {
                                                                                                const totalMonto = (categoria1Data as any).total;
                                                                                                return (
                                                                                                    <>
                                                                                                        <div className="text-xxs text-gray-500">
                                                                                                            {formatVolumen(totalVolumenVisible)} m³ Total
                                                                                                        </div>
                                                                                                        <div className="text-xxs text-gray-500">
                                                                                                            {formatUnitValue(calculateUnitValue(totalMonto, totalVolumenVisible))}
                                                                                                        </div>
                                                                                                    </>
                                                                                                );
                                                                                            }
                                                                                            return null;
                                                                                        })()}
                                                                                    </>
                                                                                ) : (
                                                                                    (() => {
                                                                                        const visiblePlants = getVisiblePlants();
                                                                                        const totalVolumenVisible = volumenes[categoria1]
                                                                                            ? visiblePlants.reduce((sum, plt) => sum + (volumenes[categoria1][plt] ?? 0), 0)
                                                                                            : 0;

                                                                                        if (totalVolumenVisible > 0) {
                                                                                            const totalMonto = (categoria1Data as any).total;
                                                                                            return (
                                                                                                <>
                                                                                                    {formatUnitValue(calculateUnitValue(totalMonto, totalVolumenVisible))}
                                                                                                    <div className="text-xxs text-gray-500">
                                                                                                        {formatVolumen(totalVolumenVisible)} m³ Total
                                                                                                    </div>
                                                                                                </>
                                                                                            );
                                                                                        }
                                                                                        return formatMoney((categoria1Data as any).total);
                                                                                    })()
                                                                                )}
                                                                            </div>
                                                                        ) : isEgresoWithVolume ? (
                                                                            <div className="space-y-0.5">
                                                                                {!showUnitPriceView ? (
                                                                                    formatMoney((categoria1Data as any).total)
                                                                                ) : (
                                                                                    (() => {
                                                                                        const visiblePlants = getVisiblePlants();
                                                                                        const concreteVolumen = shouldUseCombinedVolume(clasificacion)
                                                                                            ? getTotalCombinedVolume(visiblePlants)
                                                                                            : getTotalVolume("Ventas Concreto", visiblePlants);
                                                                                        if (concreteVolumen > 0) {
                                                                                            const totalMonto = (categoria1Data as any).total;
                                                                                            const unitCost = Math.abs(totalMonto) / concreteVolumen;
                                                                                            return (
                                                                                                <>
                                                                                                    {formatUnitValue(unitCost, true)}
                                                                                                    <div className="text-xxs text-gray-500">
                                                                                                        {shouldUseCombinedVolume(clasificacion) 
                                                                                                            ? "por m³ (concreto + bombeo)" 
                                                                                                            : "por m³ de concreto"}
                                                                                                    </div>
                                                                                                </>
                                                                                            );
                                                                                        }
                                                                                        return formatMoney((categoria1Data as any).total);
                                                                                    })()
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            formatMoney((categoria1Data as any).total)
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}

                    {/* Total general Row */}
                     <tr className="bg-green-800 text-white font-bold sticky bottom-0 z-20">
                          <td className="px-3 py-2 sticky left-0 bg-green-800 z-10">Total General</td>
                        {getVisiblePlants().map((planta) => {
                             const totalPlanta = Object.values(matrixData).reduce(
                                (sum, tipoData) => sum + ((tipoData as any).plantas?.[planta] ?? 0),
                                0
                            );
                            return (
                                 <td key={planta} className="px-3 py-2 text-right border-r border-gray-300 bg-white text-gray-800 font-bold">
                                    {formatMoney(totalPlanta)}
                                </td>
                            );
                        })}
                         <td className="px-3 py-2 text-right bg-white text-gray-800 font-bold">
                            {formatMoney(Object.values(matrixData).reduce((sum, tipoData) => sum + (tipoData as any).total, 0))}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* Legend for Unit Price View */}
        {showUnitPriceView && (
            <div className="mt-4 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Información de Precios Unitarios</h3>
                <ul className="text-xs text-gray-600 space-y-1.5">
                    <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Los precios unitarios para <span className="font-medium text-green-700">Ingresos</span> se calculan directamente por el volumen ingresado.</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Los costos unitarios para <span className="font-medium text-red-700">Materiales</span> (Cemento, Agregados, etc.) se calculan en relación al volumen de concreto.</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Los costos unitarios para <span className="font-medium text-blue-700">Costo Operativo</span> se calculan en relación al volumen combinado (concreto + bombeo).</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Todos los valores unitarios se expresan en pesos mexicanos por metro cúbico (MXN/m³).</span>
                    </li>
                </ul>
            </div>
        )}

                <EnhancedDebugModal
          key={`debug-modal-${data.length}-${Date.now()}`}
          isOpen={isDebugModalOpen}
          onClose={() => setIsDebugModalOpen(false)}
          data={data}
          onDataChange={handleSaveChanges}
          validationSummary={validationSummary}
          onReturnToValidation={handleReturnToValidation}
        />

        <ValidationModal
            isOpen={isValidationModalOpen}
            onClose={() => setIsValidationModalOpen(false)}
            validationSummary={validationSummary}
            fileName={currentFileName}
            onApprove={handleApproveData}
            onViewUnclassified={handleViewUnclassified}
        />
    </div>
);

};

export default FinancialDashboard;
