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
  const [searchTerm, setSearchTerm] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CACHE_KEYS.SEARCH) || ""
    }
    return ""
  })
  const [filterType, setFilterType] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CACHE_KEYS.FILTER) || "all"
    }
    return "all"
  })
  const [sortConfig, setSortConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CACHE_KEYS.SORT)
      return saved ? JSON.parse(saved) : { key: null, direction: 'asc' }
    }
    return { key: null, direction: 'asc' }
  })
  
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [localData, setLocalData] = useState(data)
  
  const isMobile = useIsMobile()
  const tableRef = useRef<HTMLTableElement>(null)

  // Save filter state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEYS.SEARCH, searchTerm)
    }
  }, [searchTerm])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEYS.FILTER, filterType)
    }
  }, [filterType])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEYS.SORT, JSON.stringify(sortConfig))
    }
  }, [sortConfig])

  useEffect(() => {
    setLocalData(data)
  }, [data])

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = localData.filter(row => {
      // Search filter
      const matchesSearch = !searchTerm || 
        row.Codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.Concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.Planta.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Type filter
      if (filterType === "all") return matchesSearch
      if (filterType === "unclassified") {
        const status = getClassificationStatus(row)
        return matchesSearch && (status.status === 'error' || status.status === 'warning')
      }
      if (filterType === "hierarchy") {
        return matchesSearch && isHierarchyRow(row.Codigo)
      }
      return matchesSearch && row.Tipo === filterType
    })

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key as keyof DebugDataRow]
        let bValue = b[sortConfig.key as keyof DebugDataRow]
        
        if (typeof aValue === 'string') aValue = aValue.toLowerCase()
        if (typeof bValue === 'string') bValue = bValue.toLowerCase()
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [localData, searchTerm, filterType, sortConfig])

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedData, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage)

  // Handle sorting
  const handleSort = (key: keyof DebugDataRow) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Handle row updates
  const handleRowUpdate = useCallback((rowId: string, field: keyof DebugDataRow, value: any) => {
    setLocalData(prev => prev.map(row => 
      row.Codigo === rowId ? { ...row, [field]: value } : row
    ))
    setHasUnsavedChanges(true)
  }, [])

  // Auto-suggestion system
  const getAutoSuggestion = useCallback((row: DebugDataRow) => {
    const suggestion = suggestClassification(row.Codigo, row.Concepto)
    return suggestion
  }, [])

  // Apply auto-suggestion to row
  const applyAutoSuggestion = useCallback((rowId: string) => {
    const row = localData.find(r => r.Codigo === rowId)
    if (!row) return
    
    const suggestion = getAutoSuggestion(row)
    if (suggestion) {
      setLocalData(prev => prev.map(r => 
        r.Codigo === rowId ? { ...r, ...suggestion } : r
      ))
      setHasUnsavedChanges(true)
    }
  }, [localData, getAutoSuggestion])

  // Save changes
  const handleSaveChanges = useCallback(() => {
    onDataChange(localData)
    setHasUnsavedChanges(false)
    setEditingRow(null)
  }, [localData, onDataChange])

  // Reset changes
  const handleResetChanges = useCallback(() => {
    setLocalData(data)
    setHasUnsavedChanges(false)
    setEditingRow(null)
  }, [data])

  // Statistics
  const stats = useMemo(() => {
    const total = filteredAndSortedData.length
    const classified = filteredAndSortedData.filter(row => {
      const status = getClassificationStatus(row)
      return status.status === 'success'
    }).length
    const unclassified = total - classified
    const hierarchy = filteredAndSortedData.filter(row => isHierarchyRow(row.Codigo)).length
    
    return { total, classified, unclassified, hierarchy }
  }, [filteredAndSortedData])

  // Mobile-specific handlers
  const handleMobileRowSelect = useCallback((rowId: string) => {
    if (isMobile) {
      setEditingRow(editingRow === rowId ? null : rowId)
    }
  }, [isMobile, editingRow])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] p-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[95vh]">
          {/* Header */}
          <div className="p-6 border-b bg-white dark:bg-gray-800 flex-shrink-0">
            <DialogHeader className="space-y-2">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Target className="h-6 w-6 text-blue-600" />
                Debug de Datos Financieros
              </DialogTitle>
              <DialogDescription className="text-base">
                Verificar, editar y clasificar datos del archivo Excel
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Stats Bar */}
          <div className={`${isMobile ? 'p-3' : 'p-4'} bg-gray-50 dark:bg-gray-900 border-b flex-shrink-0`}>
            <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'flex items-center justify-between'}`}>
              <div className={`${isMobile ? 'grid grid-cols-2 gap-2 col-span-2' : 'flex items-center gap-6'}`}>
                <div className={`${isMobile ? 'text-center' : 'text-left'}`}>
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-blue-600`}>{stats.total}</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Total</div>
                </div>
                <div className={`${isMobile ? 'text-center' : 'text-left'}`}>
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-green-600`}>{stats.classified}</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Clasificados</div>
                </div>
                <div className={`${isMobile ? 'text-center' : 'text-left'}`}>
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-orange-600`}>{stats.unclassified}</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Sin Clasificar</div>
                </div>
                <div className={`${isMobile ? 'text-center' : 'text-left'}`}>
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-600`}>{stats.hierarchy}</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Jerárquicos</div>
                </div>
              </div>
              
              {!isMobile && hasUnsavedChanges && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">
                    <Edit className="h-3 w-3 mr-1" />
                    Cambios sin guardar
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className={`${isMobile ? 'p-3' : 'p-4'} bg-white dark:bg-gray-800 border-b flex-shrink-0`}>
            <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between gap-4'}`}>
              {/* Search and Filter */}
              <div className={`${isMobile ? 'space-y-2' : 'flex items-center gap-4'}`}>
                <div className={`${isMobile ? '' : 'flex items-center gap-2'}`}>
                  <Search className={`${isMobile ? 'hidden' : 'h-4 w-4'} text-gray-400`} />
                  <Input
                    placeholder="Buscar por código o concepto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`${isMobile ? 'w-full h-10' : 'w-64'}`}
                  />
                </div>
                
                <div className={`${isMobile ? '' : 'flex items-center gap-2'}`}>
                  <Filter className={`${isMobile ? 'hidden' : 'h-4 w-4'} text-gray-400`} />
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className={`${isMobile ? 'w-full h-10' : 'w-40'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="unclassified">Sin Clasificar</SelectItem>
                      <SelectItem value="Ingresos">Ingresos</SelectItem>
                      <SelectItem value="Egresos">Egresos</SelectItem>
                      <SelectItem value="hierarchy">Jerárquicos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`${isMobile ? 'flex gap-2' : 'flex items-center gap-2'}`}>
                {hasUnsavedChanges && (
                  <Badge variant="destructive" className={`${isMobile ? 'text-xs' : ''}`}>
                    <Edit className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-3 w-3 mr-1'}`} />
                    {isMobile ? 'Cambios' : 'Cambios sin guardar'}
                  </Badge>
                )}
                
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={handleResetChanges}
                  disabled={!hasUnsavedChanges}
                  className={`${isMobile ? 'flex-1' : ''}`}
                >
                  <RefreshCw className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4 mr-2'}`} />
                  {!isMobile && 'Reiniciar'}
                </Button>
                
                <Button
                  onClick={handleSaveChanges}
                  disabled={!hasUnsavedChanges}
                  size={isMobile ? "sm" : "default"}
                  className={`${isMobile ? 'flex-1' : ''}`}
                >
                  <Save className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4 mr-2'}`} />
                  {!isMobile && 'Guardar'}
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <div className={`${isMobile ? 'overflow-x-auto' : 'overflow-auto'}`}>
              <table ref={tableRef} className={`w-full ${isMobile ? 'min-w-[800px]' : 'min-w-0'} border-collapse`}>
                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                  <tr>
                    <th className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} text-left border-b font-medium text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      Estado
                    </th>
                    <th className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} text-left border-b font-medium text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800`}
                        onClick={() => handleSort('Codigo')}>
                      <div className="flex items-center gap-1">
                        Código
                        <ArrowUpDown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                      </div>
                    </th>
                    <th className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} text-left border-b font-medium text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800`}
                        onClick={() => handleSort('Concepto')}>
                      <div className="flex items-center gap-1">
                        Concepto
                        <ArrowUpDown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                      </div>
                    </th>
                    <th className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} text-right border-b font-medium text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800`}
                        onClick={() => handleSort('Monto')}>
                      <div className="flex items-center justify-end gap-1">
                        Monto
                        <ArrowUpDown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                      </div>
                    </th>
                    <th className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} text-left border-b font-medium text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800`}
                        onClick={() => handleSort('Tipo')}>
                      <div className="flex items-center gap-1">
                        Tipo
                        <ArrowUpDown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                      </div>
                    </th>
                    <th className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} text-left border-b font-medium text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      Categoría 1
                    </th>
                    <th className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} text-center border-b font-medium text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, index) => {
                    const status = getClassificationStatus(row)
                    const isEditing = editingRow === row.Codigo
                    const suggestion = getAutoSuggestion(row)
                    
                    return (
                      <tr 
                        key={row.Codigo} 
                        className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${isEditing ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${isMobile ? 'cursor-pointer' : ''}`}
                        onClick={() => isMobile && handleMobileRowSelect(row.Codigo)}
                      >
                        <td className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} align-top`}>
                          <div className="flex items-center gap-2">
                            {status.status === 'success' && <CheckCircle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-green-500`} />}
                            {status.status === 'warning' && <AlertTriangle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-orange-500`} />}
                            {status.status === 'error' && <X className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-red-500`} />}
                            {status.status === 'hierarchy' && <Info className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-blue-500`} />}
                          </div>
                        </td>
                        <td className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} align-top`}>
                          <code className={`${isMobile ? 'text-xs' : 'text-sm'} bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded`}>
                            {row.Codigo}
                          </code>
                        </td>
                        <td className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} align-top`}>
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'} ${isMobile ? 'max-w-[120px]' : 'max-w-xs'} truncate`} title={row.Concepto}>
                            {row.Concepto}
                          </div>
                        </td>
                        <td className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} align-top text-right`}>
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-mono ${row.Monto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(row.Monto)}
                          </div>
                        </td>
                        <td className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} align-top`}>
                          {isEditing ? (
                            <Select
                              value={row.Tipo}
                              onValueChange={(value) => handleRowUpdate(row.Codigo, 'Tipo', value)}
                            >
                              <SelectTrigger className={`${isMobile ? 'w-24 h-8 text-xs' : 'w-32 h-8 text-sm'}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Ingresos">Ingresos</SelectItem>
                                <SelectItem value="Egresos">Egresos</SelectItem>
                                <SelectItem value="Indefinido">Indefinido</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={row.Tipo === 'Ingresos' ? 'default' : row.Tipo === 'Egresos' ? 'destructive' : 'secondary'} className={`${isMobile ? 'text-xs' : ''}`}>
                              {row.Tipo}
                            </Badge>
                          )}
                        </td>
                        <td className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} align-top`}>
                          {isEditing ? (
                            <Input
                              value={row['Categoria 1']}
                              onChange={(e) => handleRowUpdate(row.Codigo, 'Categoria 1', e.target.value)}
                              className={`${isMobile ? 'w-24 h-8 text-xs' : 'w-32 h-8 text-sm'}`}
                              placeholder="Categoría..."
                            />
                          ) : (
                            <div className={`${isMobile ? 'text-xs' : 'text-sm'} ${isMobile ? 'max-w-[100px]' : 'max-w-xs'} truncate`} title={row['Categoria 1']}>
                              {row['Categoria 1'] || 'Sin categoría'}
                            </div>
                          )}
                        </td>
                        <td className={`${isMobile ? 'px-2 py-2' : 'px-4 py-3'} align-top text-center`}>
                          <div className={`${isMobile ? 'flex flex-col gap-1' : 'flex items-center gap-2'}`}>
                            {!isMobile && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingRow(isEditing ? null : row.Codigo)}
                                className="h-8 w-8 p-0"
                              >
                                {isEditing ? <Check className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
                              </Button>
                            )}
                            
                            {suggestion && status.status !== 'success' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => applyAutoSuggestion(row.Codigo)}
                                className={`${isMobile ? 'h-6 text-xs' : 'h-8'} ${isMobile ? 'w-full' : 'w-8'} p-0`}
                                title="Aplicar sugerencia automática"
                              >
                                <Target className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className={`${isMobile ? 'p-3' : 'p-4'} border-t bg-white dark:bg-gray-800 flex-shrink-0`}>
            <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center justify-between'}`}>
              <div className={`${isMobile ? 'text-sm' : 'text-sm'} text-gray-600`}>
                Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedData.length)} a{' '}
                {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} de {filteredAndSortedData.length} registros
              </div>
              
              <div className={`${isMobile ? 'flex justify-between items-center' : 'flex items-center gap-2'}`}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                
                <div className={`${isMobile ? 'text-sm' : 'text-sm'} text-gray-600`}>
                  Página {currentPage} de {totalPages}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`${isMobile ? 'p-3' : 'p-4'} border-t bg-gray-50 dark:bg-gray-900 flex-shrink-0`}>
            <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center justify-between'}`}>
              <div className={`${isMobile ? 'order-2' : ''}`}>
                {validationSummary && onReturnToValidation && (
                  <Button
                    variant="outline"
                    onClick={onReturnToValidation}
                    size={isMobile ? "sm" : "default"}
                    className={`${isMobile ? 'w-full' : ''}`}
                  >
                    <ArrowUpDown className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4 mr-2'}`} />
                    {!isMobile && 'Volver a Validación'}
                  </Button>
                )}
              </div>
              
              <div className={`${isMobile ? 'flex gap-2 order-1' : 'flex items-center gap-2'}`}>
                <Button
                  variant="outline"
                  onClick={onClose}
                  size={isMobile ? "sm" : "default"}
                  className={`${isMobile ? 'flex-1' : ''}`}
                >
                  Cerrar
                </Button>
                
                <Button
                  onClick={handleSaveChanges}
                  disabled={!hasUnsavedChanges}
                  size={isMobile ? "sm" : "default"}
                  className={`${isMobile ? 'flex-1' : ''}`}
                >
                  <Save className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4 mr-2'}`} />
                  {!isMobile && 'Guardar y Cerrar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 