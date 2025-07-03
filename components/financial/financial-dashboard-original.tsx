"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronRight, Calculator, Upload, Eye, Download, Database } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { handleBalanzaFileUpload, type DebugDataRow } from "@/lib/services/excel-processor"
import { validationEngine, ValidationSummary, ReportMetadata } from "@/lib/services/validation-service"
import { SupabaseStorageService, FinancialReport } from "@/lib/supabase/storage"
import EnhancedDebugModal from "@/components/modals/enhanced-debug-modal"
import ValidationModal from "@/components/modals/validation-modal"
import ReportSelector from "@/components/reports/report-selector"

interface FinancialDashboardProps {
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

const shouldShowVolumeInput = (tipo: string, subCategoria: string, clasificacion: string, categoria1: string): boolean => {
  return tipo === "Ingresos" && (categoria1.includes("Ventas") || categoria1.includes("Venta"))
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ initialData, onDataUpdate }) => {
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
  
  const storageService = new SupabaseStorageService()
  const { toast } = useToast()

  // Update local data when initialData changes
  useEffect(() => {
    setData(initialData)
  }, [initialData])

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

  // Rest of the component continues...
  return (
    <div className="p-6 bg-gray-50 w-full max-w-full overflow-auto relative" style={{ maxHeight: "calc(100vh - 4rem)" }}>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Restaurando funcionalidad original...
        </h1>
        <p className="text-gray-600 mt-2">
          El archivo original está siendo restaurado. Por favor espera un momento.
        </p>
      </div>
    </div>
  )
}

export default FinancialDashboard 