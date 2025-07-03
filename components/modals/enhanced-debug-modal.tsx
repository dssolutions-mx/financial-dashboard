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
  Check
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
  SORT: 'debug_modal_sort'
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
    return { status: 'partial', message: 'Parcialmente clasificado', color: 'yellow' }
  } else if (!hasValidTipo) {
    return { status: 'untyped', message: 'Sin tipo definido', color: 'red' }
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

// Simple inline editor component - much more streamlined
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
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-gray-900 dark:text-gray-100">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Validación de Totales Jerárquicos</span>
              <Badge variant={stats.validationStatus === 'valid' ? "default" : "destructive"}>
                {stats.validationStatus === 'valid' ? 'Totales Coinciden' : 'Verificar Totales'}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Revisa y ajusta las clasificaciones para que los totales clasificados coincidan con las metas jerárquicas. 
            No todos los elementos necesitan clasificación.
          </DialogDescription>
        </DialogHeader>

        {/* Hierarchy Validation Summary */}
        {validationSummary && (
          <Alert className={validationSummary.isValid ? "border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20" : "border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20"}>
            <Target className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            <AlertDescription className="text-gray-700 dark:text-gray-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <strong>Ingresos:</strong>
                  </span>
                  <div className="text-right">
                    <div className="text-sm">Meta: {formatCurrency(validationSummary.hierarchyTotals.ingresos)}</div>
                    <div className="text-sm">Clasificado: {formatCurrency(validationSummary.classifiedTotals.ingresos)}</div>
                    <div className={`text-sm font-medium ${Math.abs(validationSummary.variance.ingresos) <= 0.01 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      Diferencia: {formatCurrency(validationSummary.variance.ingresos)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <strong>Egresos:</strong>
                  </span>
                  <div className="text-right">
                    <div className="text-sm">Meta: {formatCurrency(validationSummary.hierarchyTotals.egresos)}</div>
                    <div className="text-sm">Clasificado: {formatCurrency(validationSummary.classifiedTotals.egresos)}</div>
                    <div className={`text-sm font-medium ${Math.abs(validationSummary.variance.egresos) <= 0.01 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      Diferencia: {formatCurrency(validationSummary.variance.egresos)}
                    </div>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.totalDetail}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Registros Detalle</div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.classified}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Clasificados</div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.partial}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Parciales</div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{stats.unclassified}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Sin Clasificar</div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-3">
              <div className="text-sm font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.unclassifiedAmount)}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Monto Pendiente</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="Buscar por concepto, código o planta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-64 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
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
            <Button onClick={handleBulkClassify} variant="outline" className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Auto-clasificar ({selectedRows.size})
            </Button>
          )}
        </div>

        {/* Info about allowing unclassified items */}
        {selectedFilter === "unclassified" && (
          <Alert className="mb-4 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-gray-700 dark:text-gray-300">
              <strong>Nota:</strong> No todos los elementos necesitan clasificación. Algunos registros pueden permanecer 
              sin clasificar si no forman parte del sistema de clasificación principal. El objetivo es que los totales 
              clasificados coincidan con las metas jerárquicas.
            </AlertDescription>
          </Alert>
        )}

        {/* Data Table */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[400px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <TableHead className="w-12 text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === processedData.length && processedData.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(new Set(processedData.filter(row => !isHierarchyRow(row.Codigo)).map(row => row.id || row.Codigo)))
                        } else {
                          setSelectedRows(new Set())
                        }
                      }}
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
        </div>

        <DialogFooter className="flex justify-between border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {processedData.length} de {data.length} registros
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cerrar
            </Button>
            {onReturnToValidation && (
              <Button onClick={onReturnToValidation} className="bg-green-600 hover:bg-green-700 text-white">
                <Save className="h-4 w-4 mr-2" />
                Volver a Validación
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 