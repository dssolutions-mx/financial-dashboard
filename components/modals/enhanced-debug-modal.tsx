"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useIsMobile } from "@/components/ui/use-mobile"
import { 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Save, 
  Filter,
  Target,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  RefreshCw,
  Info,
  Edit,
  Check,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Monitor,
  Eye,
  EyeOff
} from "lucide-react"
import { 
  CLASSIFICATION_HIERARCHY,
  getSubCategoriasForTipo,
  getClasificacionesForSubCategoria,
  getCategoria1ForClasificacion,
  suggestClassification
} from "@/lib/services/classification-service"
import { ValidationSummary } from "@/lib/services/validation-service"

export interface DebugDataRow {
  id?: string
  Codigo: string
  Concepto: string
  Abonos: number | null
  Cargos: number | null
  Monto: number
  Planta: string
  Tipo: string
  'Sub categoria': string
  Clasificacion: string
  'Categoria 1': string
}

interface EnhancedDebugModalProps {
  isOpen: boolean
  onClose: () => void
  data: DebugDataRow[]
  onDataChange: (newData: DebugDataRow[]) => void
  validationSummary?: ValidationSummary | null
  onReturnToValidation?: () => void
}

// Cache keys for localStorage
const CACHE_KEYS = {
  FILTER: 'debug_modal_filter',
  SEARCH: 'debug_modal_search',
  SORT: 'debug_modal_sort',
  MOBILE_VIEW: 'debug_modal_mobile_view'
}

// Helper function to format currency with full precision
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Helper function to format currency compactly for mobile
const formatCurrencyCompact = (amount: number) => {
  const absAmount = Math.abs(amount)
  if (absAmount >= 1000000) {
    return `${amount < 0 ? '-' : ''}$${(absAmount / 1000000).toFixed(1)}M`
  } else if (absAmount >= 1000) {
    return `${amount < 0 ? '-' : ''}$${(absAmount / 1000).toFixed(1)}K`
  }
  return formatCurrency(amount)
}

// Helper function to determine correct type from account code
const determineTypeFromCode = (codigo: string): string => {
  if (!codigo) return "Indefinido"
  const prefix = codigo.substring(0, 4)
  if (prefix === "4100" || prefix === "4200") return "Ingresos"
  if (prefix === "5000") return "Egresos"
  return "Indefinido"
}

// Check if this is a hierarchy total row that shouldn't be classified
const isHierarchyRow = (codigo: string): boolean => {
  return codigo === "4100-0000-000-000" || codigo === "5000-0000-000-000"
}

// Classification status checker - allows unclassified items
const getClassificationStatus = (row: DebugDataRow) => {
  // Hierarchy rows should not be classified
  if (isHierarchyRow(row.Codigo)) {
    return { status: 'hierarchy', message: 'Total jerárquico', color: 'blue' }
  }
  
  const hasValidTipo = row.Tipo && row.Tipo !== "Indefinido"
  const hasValidCategoria1 = row['Categoria 1'] && row['Categoria 1'] !== "Sin Categoría"
  
  if (hasValidTipo && hasValidCategoria1) {
    return { status: 'classified', message: 'Clasificado', color: 'green' }
  } else if (hasValidTipo && !hasValidCategoria1) {
    return { status: 'partial', message: 'Parcial', color: 'yellow' }
  } else if (!hasValidTipo) {
    return { status: 'untyped', message: 'Sin tipo', color: 'red' }
  } else {
    return { status: 'unclassified', message: 'Sin clasificar', color: 'gray' }
  }
}

// Optimized filter function - memoized outside component
const filterData = (
  data: DebugDataRow[], 
  filter: string, 
  searchTerm: string
): DebugDataRow[] => {
  const lowerSearch = searchTerm.toLowerCase()
  
  return data.filter(row => {
    // First apply search filter
    if (searchTerm && !row.Concepto.toLowerCase().includes(lowerSearch) && 
        !row.Codigo.toLowerCase().includes(lowerSearch) && 
        !row.Planta.toLowerCase().includes(lowerSearch)) {
      return false
    }
    
    // Then apply category filter
    const status = getClassificationStatus(row)
    
    switch (filter) {
      case 'unclassified':
        return status.status === 'unclassified' || status.status === 'untyped'
      case 'partial':
        return status.status === 'partial'
      case 'classified':
        return status.status === 'classified'
      case 'hierarchy':
        return status.status === 'hierarchy'
      case 'detail':
        return status.status !== 'hierarchy'
      case 'ingresos':
        return row.Tipo === 'Ingresos' && status.status !== 'hierarchy'
      case 'egresos':
        return row.Tipo === 'Egresos' && status.status !== 'hierarchy'
      case 'all':
      default:
        return true
    }
  })
}

// Mobile-optimized card component for individual rows
const MobileRowCard = React.memo(({ 
  row, 
  isSelected, 
  onToggleSelect,
  onEdit,
  isEditing,
  isHierarchy 
}: { 
  row: DebugDataRow
  isSelected: boolean
  onToggleSelect: (selected: boolean) => void
  onEdit: () => void
  isEditing: boolean
  isHierarchy: boolean
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const status = getClassificationStatus(row)
  const rowId = row.id || row.Codigo

  return (
    <Card className={`
      mb-3 border transition-all duration-200 
      ${isHierarchy ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700'}
      ${status.status === 'classified' ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700' : ''}
      ${status.status === 'untyped' ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700' : ''}
      ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
    `}>
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {!isHierarchy && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onToggleSelect(e.target.checked)}
                className="mt-1 w-4 h-4 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge 
                  variant={
                    status.color === 'green' ? 'default' : 
                    status.color === 'blue' ? 'secondary' :
                    status.color === 'yellow' ? 'outline' : 'destructive'
                  }
                  className={`text-xs ${
                    status.color === 'yellow' ? 'border-yellow-500 dark:border-yellow-400 text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' :
                    status.color === 'gray' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : ''
                  }`}
                >
                  {status.message}
                </Badge>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrencyCompact(row.Monto)}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-2">
                {row.Concepto}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                {row.Codigo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {!isHierarchy && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onEdit}
                className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 touch-manipulation"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 touch-manipulation"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Quick Info Row */}
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
          <span>{row.Planta}</span>
          <Badge variant="outline" className="text-xs border-gray-300 dark:border-gray-600">
            {row.Tipo || 'Sin tipo'}
          </Badge>
        </div>

        {/* Classification Info */}
        {(row['Categoria 1'] || isExpanded) && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Categoría:</span> {row['Categoria 1'] || 'Sin categoría'}
          </div>
        )}

        {/* Expanded Details */}
        <Collapsible open={isExpanded}>
          <CollapsibleContent className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Abonos:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {row.Abonos ? formatCurrency(row.Abonos) : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Cargos:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {row.Cargos ? formatCurrency(row.Cargos) : 'N/A'}
                  </div>
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Monto Exacto:</span>
                <div className="text-gray-600 dark:text-gray-400 font-mono">
                  {formatCurrency(row.Monto)}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Sub categoría:</span>
                <div className="text-gray-600 dark:text-gray-400">
                  {row['Sub categoria'] || 'Sin subcategoría'}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Clasificación:</span>
                <div className="text-gray-600 dark:text-gray-400">
                  {row.Clasificacion || 'Sin clasificación'}
                </div>
              </div>
              {isHierarchy && (
                <div className="text-blue-600 dark:text-blue-400 font-medium">
                  Este es un total de control jerárquico
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
})

MobileRowCard.displayName = 'MobileRowCard'

// Enhanced inline editor optimized for mobile
const MobileInlineEditor = React.memo(({ 
  row, 
  onUpdate,
  onCancel
}: { 
  row: DebugDataRow
  onUpdate: (updates: Partial<DebugDataRow>) => void
  onCancel: () => void
}) => {
  const [localRow, setLocalRow] = useState<DebugDataRow>({ ...row })
  const [isExpanded, setIsExpanded] = useState(false)
  
  const correctType = localRow.Tipo && localRow.Tipo !== "Indefinido" 
    ? localRow.Tipo 
    : determineTypeFromCode(localRow.Codigo)

  const subCategorias = useMemo(() => 
    getSubCategoriasForTipo(correctType || ""), [correctType]
  )
  
  const categorias1 = useMemo(() => 
    getCategoria1ForClasificacion(correctType || "", localRow['Sub categoria'] || "", localRow.Clasificacion || ""), 
    [correctType, localRow['Sub categoria'], localRow.Clasificacion]
  )

  const handleQuickSave = useCallback(() => {
    onUpdate({
      Tipo: localRow.Tipo,
      'Sub categoria': localRow['Sub categoria'],
      Clasificacion: localRow.Clasificacion,
      'Categoria 1': localRow['Categoria 1']
    })
  }, [localRow, onUpdate])

  const handleFieldChange = useCallback((field: keyof DebugDataRow, value: string) => {
    const updates: Partial<DebugDataRow> = { [field]: value }
    
    // Reset dependent fields when parent changes
    if (field === 'Tipo') {
      updates['Sub categoria'] = 'Sin Subcategoría'
      updates.Clasificacion = 'Sin Clasificación'
      updates['Categoria 1'] = 'Sin Categoría'
    } else if (field === 'Sub categoria') {
      updates.Clasificacion = 'Sin Clasificación'
      updates['Categoria 1'] = 'Sin Categoría'
    } else if (field === 'Clasificacion') {
      updates['Categoria 1'] = 'Sin Categoría'
    }
    
    setLocalRow(prev => ({ ...prev, ...updates }))
  }, [])

  return (
    <Card className="mb-3 border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Edit className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Editando
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onCancel} 
              className="h-8 px-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 touch-manipulation"
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleQuickSave} 
              className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white touch-manipulation"
            >
              <Check className="h-4 w-4 mr-1" />
              Guardar
            </Button>
          </div>
        </div>

        {/* Item Info */}
        <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-2 line-clamp-2">
            {row.Concepto}
          </h4>
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span className="font-mono">{row.Codigo}</span>
            <span className="font-medium">{formatCurrencyCompact(row.Monto)}</span>
          </div>
        </div>

        {/* Classification Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo
            </label>
            <Select value={localRow.Tipo} onValueChange={(value) => handleFieldChange('Tipo', value)}>
              <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 touch-manipulation">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                <SelectItem value="Ingresos" className="text-gray-900 dark:text-gray-100 py-3 touch-manipulation">Ingresos</SelectItem>
                <SelectItem value="Egresos" className="text-gray-900 dark:text-gray-100 py-3 touch-manipulation">Egresos</SelectItem>
                <SelectItem value="Indefinido" className="text-gray-900 dark:text-gray-100 py-3 touch-manipulation">Sin Tipo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sub categoría
            </label>
            <Select 
              value={localRow['Sub categoria']} 
              onValueChange={(value) => handleFieldChange('Sub categoria', value)}
              disabled={!correctType || correctType === "Indefinido"}
            >
              <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 touch-manipulation">
                <SelectValue placeholder="Seleccionar subcategoría" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                <SelectItem value="Sin Subcategoría" className="text-gray-900 dark:text-gray-100 py-3 touch-manipulation">Sin Subcategoría</SelectItem>
                {subCategorias.map(subcat => (
                  <SelectItem key={subcat} value={subcat} className="text-gray-900 dark:text-gray-100 py-3 touch-manipulation">{subcat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Collapsible open={isExpanded}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full justify-between text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 touch-manipulation"
              >
                Clasificación avanzada
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Clasificación
                </label>
                <Select 
                  value={localRow.Clasificacion} 
                  onValueChange={(value) => handleFieldChange('Clasificacion', value)}
                  disabled={!localRow['Sub categoria'] || localRow['Sub categoria'] === "Sin Subcategoría"}
                >
                  <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 touch-manipulation">
                    <SelectValue placeholder="Seleccionar clasificación" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    <SelectItem value="Sin Clasificación" className="text-gray-900 dark:text-gray-100 py-3 touch-manipulation">Sin Clasificación</SelectItem>
                    {getClasificacionesForSubCategoria(correctType || "", localRow['Sub categoria'] || "").map(clasif => (
                      <SelectItem key={clasif} value={clasif} className="text-gray-900 dark:text-gray-100 py-3 touch-manipulation">{clasif}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Categoría 1
                </label>
                <Select 
                  value={localRow['Categoria 1']} 
                  onValueChange={(value) => handleFieldChange('Categoria 1', value)}
                  disabled={!localRow.Clasificacion || localRow.Clasificacion === "Sin Clasificación"}
                >
                  <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 touch-manipulation">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    <SelectItem value="Sin Categoría" className="text-gray-900 dark:text-gray-100 py-3 touch-manipulation">Sin Categoría</SelectItem>
                    {categorias1.map(cat => (
                      <SelectItem key={cat} value={cat} className="text-gray-900 dark:text-gray-100 py-3 touch-manipulation">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  )
})

MobileInlineEditor.displayName = 'MobileInlineEditor'

export default function EnhancedDebugModal({ 
  isOpen, 
  onClose, 
  data, 
  onDataChange,
  validationSummary,
  onReturnToValidation
}: EnhancedDebugModalProps) {
  
  // State management
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' }>({ field: 'Monto', direction: 'desc' })
  const isMobileDetected = useIsMobile()
  const [forceMobileView, setForceMobileView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CACHE_KEYS.MOBILE_VIEW) === 'true'
    }
    return false
  })
  
  // Use mobile view if detected mobile OR user force-enabled it
  const isMobileView = isMobileDetected || forceMobileView
  
  // Load cached preferences with SSR safety
  const [selectedFilter, setSelectedFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CACHE_KEYS.FILTER) || 'unclassified'
    }
    return 'unclassified'
  })
  
  const [searchTerm, setSearchTerm] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CACHE_KEYS.SEARCH) || ''
    }
    return ''
  })

  // Cache preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEYS.FILTER, selectedFilter)
    }
  }, [selectedFilter])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEYS.SEARCH, searchTerm)
    }
  }, [searchTerm])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEYS.SORT, JSON.stringify(sortConfig))
    }
  }, [sortConfig])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEYS.MOBILE_VIEW, forceMobileView.toString())
    }
  }, [forceMobileView])

  // Memoized event handlers for performance
  const handleSort = useCallback((field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  const handleRowUpdate = useCallback((rowId: string, updates: Partial<DebugDataRow>) => {
    const newData = data.map(row => {
      const currentRowId = row.id || row.Codigo
      if (currentRowId === rowId) {
        const updatedRow = { ...row, ...updates }
        
        // Recalculate Monto when Tipo changes
        if (updates.Tipo) {
          const cargos = updatedRow.Cargos || 0
          const abonos = updatedRow.Abonos || 0
          
          let newMonto = 0
          if (updates.Tipo === "Ingresos") {
            newMonto = abonos - cargos // Net income: Abonos minus any returns/adjustments in Cargos
          } else if (updates.Tipo === "Egresos") {
            newMonto = cargos - abonos // Net expense: Cargos minus any refunds/adjustments in Abonos
          } else {
            newMonto = abonos - cargos // Default logic for indefinido or other types
          }
          
          updatedRow.Monto = newMonto
        }
        
        return updatedRow
      }
      return row
    })
    onDataChange(newData)
    setEditingRowId(null)
  }, [data, onDataChange])

  const handleBulkClassify = useCallback(() => {
    const newData = data.map(row => {
      const rowId = row.id || row.Codigo
      if (selectedRows.has(rowId) && !isHierarchyRow(row.Codigo)) {
        const suggestion = suggestClassification(row.Concepto, row.Codigo)
        return { ...row, ...suggestion }
      }
      return row
    })
    onDataChange(newData)
    setSelectedRows(new Set())
  }, [data, selectedRows, onDataChange])

  const handleCancelEdit = useCallback(() => {
    setEditingRowId(null)
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === processedData.length && processedData.length > 0) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(processedData.filter(row => !isHierarchyRow(row.Codigo)).map(row => row.id || row.Codigo)))
    }
  }, [processedData, selectedRows.size])

  // Optimized data processing with better memoization
  const processedData = useMemo(() => {
    // Apply filtering
    const filtered = filterData(data, selectedFilter, searchTerm)
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const aValue = sortConfig.field === 'Monto' ? a.Monto : (a[sortConfig.field as keyof DebugDataRow] as string)
      const bValue = sortConfig.field === 'Monto' ? b.Monto : (b[sortConfig.field as keyof DebugDataRow] as string)
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
      } else {
        const aStr = String(aValue).toLowerCase()
        const bStr = String(bValue).toLowerCase()
        const comparison = aStr.localeCompare(bStr)
        return sortConfig.direction === 'asc' ? comparison : -comparison
      }
    })

    return sorted
  }, [data, selectedFilter, searchTerm, sortConfig])

  // Categorized data for statistics - optimized calculation
  const categorizedData = useMemo(() => {
    const stats = {
      total: data.length,
      hierarchy: 0,
      totalDetail: 0,
      classified: 0,
      partial: 0,
      unclassified: 0,
      unclassifiedAmount: 0
    }

    data.forEach(row => {
      const status = getClassificationStatus(row)
      
      if (status.status === 'hierarchy') {
        stats.hierarchy++
      } else {
        stats.totalDetail++
        
        switch (status.status) {
          case 'classified':
            stats.classified++
            break
          case 'partial':
            stats.partial++
            break
          case 'unclassified':
          case 'untyped':
            stats.unclassified++
            stats.unclassifiedAmount += row.Monto
            break
        }
      }
    })

    return stats
  }, [data])

  // Calculate statistics with validation status
  const stats = useMemo(() => {
    const validationStatus = validationSummary?.isValid ? 'valid' : 'invalid'
    
    return {
      ...categorizedData,
      validationStatus,
      hierarchyMatch: validationSummary ? {
        ingresosMatch: Math.abs(validationSummary.variance.ingresos) <= 0.01,
        egresosMatch: Math.abs(validationSummary.variance.egresos) <= 0.01
      } : null
    }
  }, [categorizedData, validationSummary])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`
        overflow-hidden flex flex-col bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700
        ${isMobileView ? 'w-full h-full max-w-none max-h-none m-0 rounded-none' : 'max-w-7xl max-h-[95vh]'}
      `}>
        <DialogHeader className={isMobileView ? 'p-4 pb-2' : ''}>
                                           <DialogTitle className="flex items-center justify-between text-gray-900 dark:text-gray-100">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className={`${isMobileView ? 'text-lg' : 'text-xl'} truncate`}>
                {isMobileView ? 'Validación' : 'Validación de Totales Jerárquicos'}
              </span>
              <Badge variant={stats.validationStatus === 'valid' ? "default" : "destructive"} className="flex-shrink-0">
                {stats.validationStatus === 'valid' ? '✓' : '⚠️'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setForceMobileView(!forceMobileView)}
                className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                title={isMobileView ? "Cambiar a vista de escritorio" : "Cambiar a vista móvil"}
              >
                {isMobileView ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300 text-sm">
            {isMobileView 
              ? 'Revisa y ajusta las clasificaciones para que coincidan con las metas.' 
              : 'Revisa y ajusta las clasificaciones para que los totales clasificados coincidan con las metas jerárquicas. No todos los elementos necesitan clasificación.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Hierarchy Validation Summary */}
        {validationSummary && (
          <Alert className={`
            ${isMobileView ? 'mx-4' : 'mx-6'}
            ${validationSummary.isValid ? "border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20" : "border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20"}
          `}>
            <Target className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            <AlertDescription className="text-gray-700 dark:text-gray-300">
              <div className={`grid gap-3 ${isMobileView ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <strong>Ingresos:</strong>
                  </span>
                  <div className="text-right">
                    <div className="text-sm">Meta: {isMobileView ? formatCurrencyCompact(validationSummary.hierarchyTotals.ingresos) : formatCurrency(validationSummary.hierarchyTotals.ingresos)}</div>
                    <div className="text-sm">Clasificado: {isMobileView ? formatCurrencyCompact(validationSummary.classifiedTotals.ingresos) : formatCurrency(validationSummary.classifiedTotals.ingresos)}</div>
                    <div className={`text-sm font-medium ${Math.abs(validationSummary.variance.ingresos) <= 0.01 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      Diferencia: {isMobileView ? formatCurrencyCompact(validationSummary.variance.ingresos) : formatCurrency(validationSummary.variance.ingresos)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <strong>Egresos:</strong>
                  </span>
                  <div className="text-right">
                    <div className="text-sm">Meta: {isMobileView ? formatCurrencyCompact(validationSummary.hierarchyTotals.egresos) : formatCurrency(validationSummary.hierarchyTotals.egresos)}</div>
                    <div className="text-sm">Clasificado: {isMobileView ? formatCurrencyCompact(validationSummary.classifiedTotals.egresos) : formatCurrency(validationSummary.classifiedTotals.egresos)}</div>
                    <div className={`text-sm font-medium ${Math.abs(validationSummary.variance.egresos) <= 0.01 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      Diferencia: {isMobileView ? formatCurrencyCompact(validationSummary.variance.egresos) : formatCurrency(validationSummary.variance.egresos)}
                    </div>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className={`
          grid gap-2 mb-4 
          ${isMobileView ? 'grid-cols-3 mx-4' : 'grid-cols-2 md:grid-cols-5 gap-3 mx-6'}
        `}>
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className={`${isMobileView ? 'p-2' : 'p-3'}`}>
              <div className={`font-bold text-blue-600 dark:text-blue-400 ${isMobileView ? 'text-lg' : 'text-xl'}`}>
                {stats.totalDetail}
              </div>
              <div className={`text-gray-600 dark:text-gray-400 ${isMobileView ? 'text-xs' : 'text-xs'}`}>
                {isMobileView ? 'Detalles' : 'Registros Detalle'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className={`${isMobileView ? 'p-2' : 'p-3'}`}>
              <div className={`font-bold text-green-600 dark:text-green-400 ${isMobileView ? 'text-lg' : 'text-xl'}`}>
                {stats.classified}
              </div>
              <div className={`text-gray-600 dark:text-gray-400 ${isMobileView ? 'text-xs' : 'text-xs'}`}>
                {isMobileView ? 'OK' : 'Clasificados'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className={`${isMobileView ? 'p-2' : 'p-3'}`}>
              <div className={`font-bold text-orange-600 dark:text-orange-400 ${isMobileView ? 'text-lg' : 'text-xl'}`}>
                {stats.unclassified}
              </div>
              <div className={`text-gray-600 dark:text-gray-400 ${isMobileView ? 'text-xs' : 'text-xs'}`}>
                {isMobileView ? 'Pendientes' : 'Sin Clasificar'}
              </div>
            </CardContent>
          </Card>
          {!isMobileView && (
            <>
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-3">
                  <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.partial}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Parciales</div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-3">
                  <div className="text-sm font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.unclassifiedAmount)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Monto Pendiente</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Search and Filter Controls */}
        <div className={`
          flex gap-2 mb-4 
          ${isMobileView ? 'flex-col mx-4' : 'flex-col md:flex-row gap-4 mx-6'}
        `}>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder={isMobileView ? "Buscar..." : "Buscar por concepto, código o planta..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`
                  pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100
                  ${isMobileView ? 'h-12 text-base' : 'h-10'}
                `}
              />
            </div>
          </div>
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className={`
              bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100
              ${isMobileView ? 'w-full h-12' : 'w-64 h-10'}
            `}>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
              <SelectItem value="unclassified" className="text-gray-900 dark:text-gray-100">🔍 Sin Clasificar</SelectItem>
              <SelectItem value="partial" className="text-gray-900 dark:text-gray-100">⚡ Clasificación Parcial</SelectItem>
              <SelectItem value="classified" className="text-gray-900 dark:text-gray-100">✅ Clasificados</SelectItem>
              <SelectItem value="hierarchy" className="text-gray-900 dark:text-gray-100">📊 Totales Jerárquicos</SelectItem>
              <SelectItem value="detail" className="text-gray-900 dark:text-gray-100">📋 Todos los Detalles</SelectItem>
              <SelectItem value="ingresos" className="text-gray-900 dark:text-gray-100">💰 Solo Ingresos</SelectItem>
              <SelectItem value="egresos" className="text-gray-900 dark:text-gray-100">💸 Solo Egresos</SelectItem>
              <SelectItem value="all" className="text-gray-900 dark:text-gray-100">🗂️ Todos los Registros</SelectItem>
            </SelectContent>
          </Select>
          {selectedRows.size > 0 && (
            <Button 
              onClick={handleBulkClassify} 
              variant="outline" 
              className={`
                bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700
                ${isMobileView ? 'h-12 text-base' : 'h-10'}
              `}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Auto-clasificar ({selectedRows.size})
            </Button>
          )}
        </div>

        {/* Bulk Selection Controls for Mobile */}
        {isMobileView && processedData.length > 0 && (
          <div className="flex items-center justify-between mx-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedRows.size === processedData.filter(row => !isHierarchyRow(row.Codigo)).length && processedData.length > 0}
                onChange={handleSelectAll}
                className="w-5 h-5 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedRows.size > 0 ? `${selectedRows.size} seleccionados` : 'Seleccionar todo'}
              </span>
            </div>
            {selectedRows.size > 0 && (
              <Button 
                size="sm" 
                onClick={() => setSelectedRows(new Set())}
                variant="ghost"
                className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Limpiar
              </Button>
            )}
          </div>
        )}

        {/* Info about allowing unclassified items */}
        {selectedFilter === "unclassified" && (
          <Alert className={`
            border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20
            ${isMobileView ? 'mx-4 mb-4' : 'mb-4 mx-6'}
          `}>
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-gray-700 dark:text-gray-300">
              <strong>Nota:</strong> {isMobileView 
                ? 'No todos los elementos necesitan clasificación. El objetivo es que los totales coincidan con las metas.' 
                : 'No todos los elementos necesitan clasificación. Algunos registros pueden permanecer sin clasificar si no forman parte del sistema de clasificación principal. El objetivo es que los totales clasificados coincidan con las metas jerárquicas.'
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Data Display */}
        <div className="flex-1 overflow-hidden">
          {isMobileView ? (
            // Mobile Card View
            <ScrollArea className="h-full px-4">
              <div className="space-y-0">
                {/* Editing Row */}
                {editingRowId && (
                  <MobileInlineEditor
                    row={processedData.find(row => (row.id || row.Codigo) === editingRowId)!}
                    onUpdate={(updates) => handleRowUpdate(editingRowId, updates)}
                    onCancel={handleCancelEdit}
                  />
                )}
                
                {/* Regular Rows */}
                {processedData.map((row) => {
                  const rowId = row.id || row.Codigo
                  const isEditing = editingRowId === rowId
                  const isHierarchy = isHierarchyRow(row.Codigo)
                  
                  if (isEditing) return null

                  return (
                    <MobileRowCard
                      key={rowId}
                      row={row}
                      isSelected={selectedRows.has(rowId)}
                      onToggleSelect={(selected) => {
                        const newSelectedRows = new Set(selectedRows)
                        if (selected) {
                          newSelectedRows.add(rowId)
                        } else {
                          newSelectedRows.delete(rowId)
                        }
                        setSelectedRows(newSelectedRows)
                      }}
                      onEdit={() => setEditingRowId(rowId)}
                      isEditing={isEditing}
                      isHierarchy={isHierarchy}
                    />
                  )
                })}
              </div>
            </ScrollArea>
          ) : (
            // Desktop Table View
            <ScrollArea className="h-[400px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mx-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <TableHead className="w-12 text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === processedData.filter(row => !isHierarchyRow(row.Codigo)).length && processedData.length > 0}
                        onChange={handleSelectAll}
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      />
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Estado</TableHead>
                    <TableHead className="cursor-pointer text-gray-700 dark:text-gray-300" onClick={() => handleSort('Concepto')}>
                      <div className="flex items-center">
                        Concepto <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Código</TableHead>
                    <TableHead className="cursor-pointer text-right text-gray-700 dark:text-gray-300" onClick={() => handleSort('Monto')}>
                      <div className="flex items-center justify-end">
                        Monto <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Tipo</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Categoría 1</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedData.map((row) => {
                    const rowId = row.id || row.Codigo
                    const status = getClassificationStatus(row)
                    const isEditing = editingRowId === rowId
                    const isHierarchy = isHierarchyRow(row.Codigo)
                    
                    if (isEditing) {
                      return (
                        <TableRow key={`edit-${rowId}`}>
                          <TableCell colSpan={8}>
                            <InlineEditor
                              row={row}
                              onUpdate={(updates) => handleRowUpdate(rowId, updates)}
                              onCancel={handleCancelEdit}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    }

                    return (
                      <TableRow 
                        key={rowId} 
                        className={`
                          hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700
                          ${isHierarchy ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 dark:border-l-blue-400' : ''}
                          ${status.status === 'classified' ? 'bg-green-50 dark:bg-green-900/20' : ''}
                          ${status.status === 'untyped' ? 'bg-red-50 dark:bg-red-900/20' : ''}
                        `}
                      >
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          {!isHierarchy && (
                            <input
                              type="checkbox"
                              checked={selectedRows.has(rowId)}
                              onChange={(e) => {
                                const newSelectedRows = new Set(selectedRows)
                                if (e.target.checked) {
                                  newSelectedRows.add(rowId)
                                } else {
                                  newSelectedRows.delete(rowId)
                                }
                                setSelectedRows(newSelectedRows)
                              }}
                              className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          <Badge 
                            variant={
                              status.color === 'green' ? 'default' : 
                              status.color === 'blue' ? 'secondary' :
                              status.color === 'yellow' ? 'outline' : 'destructive'
                            }
                            className={`text-xs ${
                              status.color === 'yellow' ? 'border-yellow-500 dark:border-yellow-400 text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' :
                              status.color === 'gray' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : ''
                            }`}
                          >
                            {status.message}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] text-gray-900 dark:text-gray-100">
                          <div className="truncate" title={row.Concepto}>
                            {row.Concepto}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-gray-900 dark:text-gray-100">{row.Codigo}</TableCell>
                        <TableCell className="text-right font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(row.Monto)}
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          <Badge variant="outline" className="text-xs border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {row.Tipo || 'Sin tipo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] text-gray-900 dark:text-gray-100">
                          <div className="truncate text-sm" title={row['Categoria 1']}>
                            {row['Categoria 1'] || 'Sin categoría'}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          {!isHierarchy && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingRowId(rowId)}
                              className="h-7 px-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {isHierarchy && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              Total de Control
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className={`
          flex justify-between border-t border-gray-200 dark:border-gray-700
          ${isMobileView ? 'p-4 pt-3' : 'p-6 pt-4'}
        `}>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {isMobileView 
              ? `${processedData.length}/${data.length}` 
              : `Mostrando ${processedData.length} de ${data.length} registros`
            }
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className={`
                bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700
                ${isMobileView ? 'h-10 px-4' : 'h-10 px-4'}
              `}
            >
              Cerrar
            </Button>
            {onReturnToValidation && (
              <Button 
                onClick={onReturnToValidation} 
                className={`
                  bg-green-600 hover:bg-green-700 text-white
                  ${isMobileView ? 'h-10 px-4' : 'h-10 px-4'}
                `}
              >
                <Save className="h-4 w-4 mr-2" />
                {isMobileView ? 'Validar' : 'Volver a Validación'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Simple inline editor component for desktop - unchanged for compatibility
const InlineEditor = React.memo(({ 
  row, 
  onUpdate,
  onCancel
}: { 
  row: DebugDataRow
  onUpdate: (updates: Partial<DebugDataRow>) => void
  onCancel: () => void
}) => {
  const [localRow, setLocalRow] = useState<DebugDataRow>({ ...row })
  
  const correctType = localRow.Tipo && localRow.Tipo !== "Indefinido" 
    ? localRow.Tipo 
    : determineTypeFromCode(localRow.Codigo)

  const subCategorias = useMemo(() => 
    getSubCategoriasForTipo(correctType || ""), [correctType]
  )
  
  const categorias1 = useMemo(() => 
    getCategoria1ForClasificacion(correctType || "", localRow['Sub categoria'] || "", localRow.Clasificacion || ""), 
    [correctType, localRow['Sub categoria'], localRow.Clasificacion]
  )

  const handleQuickSave = useCallback(() => {
    onUpdate({
      Tipo: localRow.Tipo,
      'Sub categoria': localRow['Sub categoria'],
      Clasificacion: localRow.Clasificacion,
      'Categoria 1': localRow['Categoria 1']
    })
  }, [localRow, onUpdate])

  const handleFieldChange = useCallback((field: keyof DebugDataRow, value: string) => {
    const updates: Partial<DebugDataRow> = { [field]: value }
    
    // Reset dependent fields when parent changes
    if (field === 'Tipo') {
      updates['Sub categoria'] = 'Sin Subcategoría'
      updates.Clasificacion = 'Sin Clasificación'
      updates['Categoria 1'] = 'Sin Categoría'
    } else if (field === 'Sub categoria') {
      updates.Clasificacion = 'Sin Clasificación'
      updates['Categoria 1'] = 'Sin Categoría'
    } else if (field === 'Clasificacion') {
      updates['Categoria 1'] = 'Sin Categoría'
    }
    
    setLocalRow(prev => ({ ...prev, ...updates }))
  }, [])

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
          Editando: {row.Concepto.substring(0, 50)}...
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 px-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600">
            <X className="h-3 w-3" />
          </Button>
          <Button size="sm" onClick={handleQuickSave} className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white">
            <Check className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <Select value={localRow.Tipo} onValueChange={(value) => handleFieldChange('Tipo', value)}>
            <SelectTrigger className="h-8 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
              <SelectItem value="Ingresos" className="text-gray-900 dark:text-gray-100">Ingresos</SelectItem>
              <SelectItem value="Egresos" className="text-gray-900 dark:text-gray-100">Egresos</SelectItem>
              <SelectItem value="Indefinido" className="text-gray-900 dark:text-gray-100">Sin Tipo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Select 
            value={localRow['Sub categoria']} 
            onValueChange={(value) => handleFieldChange('Sub categoria', value)}
            disabled={!correctType || correctType === "Indefinido"}
          >
            <SelectTrigger className="h-8 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
              <SelectValue placeholder="Sub categoría" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
              <SelectItem value="Sin Subcategoría" className="text-gray-900 dark:text-gray-100">Sin Subcategoría</SelectItem>
              {subCategorias.map(subcat => (
                <SelectItem key={subcat} value={subcat} className="text-gray-900 dark:text-gray-100">{subcat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Select 
            value={localRow.Clasificacion} 
            onValueChange={(value) => handleFieldChange('Clasificacion', value)}
            disabled={!localRow['Sub categoria'] || localRow['Sub categoria'] === "Sin Subcategoría"}
          >
            <SelectTrigger className="h-8 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
              <SelectValue placeholder="Clasificación" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
              <SelectItem value="Sin Clasificación" className="text-gray-900 dark:text-gray-100">Sin Clasificación</SelectItem>
              {getClasificacionesForSubCategoria(correctType || "", localRow['Sub categoria'] || "").map(clasif => (
                <SelectItem key={clasif} value={clasif} className="text-gray-900 dark:text-gray-100">{clasif}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Select 
            value={localRow['Categoria 1']} 
            onValueChange={(value) => handleFieldChange('Categoria 1', value)}
            disabled={!localRow.Clasificacion || localRow.Clasificacion === "Sin Clasificación"}
          >
            <SelectTrigger className="h-8 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
              <SelectValue placeholder="Categoría 1" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
              <SelectItem value="Sin Categoría" className="text-gray-900 dark:text-gray-100">Sin Categoría</SelectItem>
              {categorias1.map(cat => (
                <SelectItem key={cat} value={cat} className="text-gray-900 dark:text-gray-100">{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        {formatCurrency(row.Monto)} • {row.Codigo} • {row.Planta}
      </div>
    </div>
  )
})

InlineEditor.displayName = 'InlineEditor' 