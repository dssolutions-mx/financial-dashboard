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
  Check,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
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

// Helper function to format currency for mobile (shorter)
const formatCurrencyMobile = (amount: number) => {
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: 'compact'
  }).format(amount)
  return formatted.replace('MX$', '$')
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

// Mobile-optimized inline editor component
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
  const isMobile = useIsMobile()
  
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
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-3 m-2 rounded-r-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300 truncate">
            {row.Concepto}
          </div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            {row.Codigo} • {formatCurrencyMobile(row.Monto)}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600">
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleQuickSave} className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white">
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
          <Select value={localRow.Tipo} onValueChange={(value) => handleFieldChange('Tipo', value)}>
            <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
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
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Sub categoría</label>
          <Select 
            value={localRow['Sub categoria']} 
            onValueChange={(value) => handleFieldChange('Sub categoria', value)}
            disabled={!correctType || correctType === "Indefinido"}
          >
            <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
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
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Clasificación</label>
          <Select 
            value={localRow.Clasificacion} 
            onValueChange={(value) => handleFieldChange('Clasificacion', value)}
            disabled={!localRow['Sub categoria'] || localRow['Sub categoria'] === "Sin Subcategoría"}
          >
            <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
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
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría 1</label>
          <Select 
            value={localRow['Categoria 1']} 
            onValueChange={(value) => handleFieldChange('Categoria 1', value)}
            disabled={!localRow.Clasificacion || localRow.Clasificacion === "Sin Clasificación"}
          >
            <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
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
    </div>
  )
})

InlineEditor.displayName = 'InlineEditor'

// Mobile-optimized row component
const MobileDataRow = React.memo(({ 
  row, 
  isEditing, 
  onEdit, 
  onApplySuggestion,
  suggestion,
  status
}: {
  row: DebugDataRow
  isEditing: boolean
  onEdit: () => void
  onApplySuggestion: () => void
  suggestion: any
  status: any
}) => {
  const statusIcon = {
    'classified': <CheckCircle className="h-4 w-4 text-green-500" />,
    'partial': <AlertTriangle className="h-4 w-4 text-orange-500" />,
    'unclassified': <X className="h-4 w-4 text-red-500" />,
    'hierarchy': <Info className="h-4 w-4 text-blue-500" />
  }[status.status]

  return (
    <div className={`border-b border-gray-200 dark:border-gray-700 p-3 ${isEditing ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {statusIcon}
          <Badge variant={row.Tipo === 'Ingresos' ? 'default' : row.Tipo === 'Egresos' ? 'destructive' : 'secondary'} className="text-xs">
            {row.Tipo}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {suggestion && status.status !== 'classified' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onApplySuggestion}
              className="h-8 w-8 p-0"
              title="Aplicar sugerencia automática"
            >
              <Target className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
          {row.Concepto}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
            {row.Codigo}
          </code>
          <span className={`font-mono font-medium ${row.Monto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrencyMobile(row.Monto)}
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {row['Categoria 1'] && row['Categoria 1'] !== 'Sin Categoría' ? row['Categoria 1'] : 'Sin categoría'}
        </div>
      </div>
    </div>
  )
})

MobileDataRow.displayName = 'MobileDataRow'

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
  const [itemsPerPage, setItemsPerPage] = useState(25) // Reduced for mobile
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
    setEditingRow(editingRow === rowId ? null : rowId)
  }, [editingRow])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-[100vw] max-h-[100vh] w-[100vw] h-[100vh] rounded-none' : 'max-w-[95vw] max-h-[95vh] w-[95vw]'} p-0 overflow-hidden`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`${isMobile ? 'px-4 py-3' : 'p-6'} border-b bg-white dark:bg-gray-800 flex-shrink-0`}>
            <DialogHeader className="space-y-1">
              <DialogTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                <Target className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-blue-600`} />
                Debug de Datos
              </DialogTitle>
              <DialogDescription className={`${isMobile ? 'text-sm' : 'text-base'}`}>
                Verificar, editar y clasificar datos
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Stats Bar */}
          <div className={`${isMobile ? 'px-4 py-2' : 'p-4'} bg-gray-50 dark:bg-gray-900 border-b flex-shrink-0`}>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className={`${isMobile ? 'text-lg font-bold' : 'text-2xl font-bold'} text-blue-600`}>{stats.total}</div>
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Total</div>
              </div>
              <div>
                <div className={`${isMobile ? 'text-lg font-bold' : 'text-2xl font-bold'} text-green-600`}>{stats.classified}</div>
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Clasificados</div>
              </div>
              <div>
                <div className={`${isMobile ? 'text-lg font-bold' : 'text-2xl font-bold'} text-orange-600`}>{stats.unclassified}</div>
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Sin clasificar</div>
              </div>
              <div>
                <div className={`${isMobile ? 'text-lg font-bold' : 'text-2xl font-bold'} text-gray-600`}>{stats.hierarchy}</div>
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Jerárquicos</div>
              </div>
            </div>
            
            {isMobile && hasUnsavedChanges && (
              <div className="mt-2 flex justify-center">
                <Badge variant="destructive" className="text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Cambios sin guardar
                </Badge>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className={`${isMobile ? 'px-4 py-3' : 'p-4'} bg-white dark:bg-gray-800 border-b flex-shrink-0`}>
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por código o concepto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${isMobile ? 'h-12 text-base' : 'h-10'}`}
                />
              </div>
              
              {/* Filter and Actions */}
              <div className={`${isMobile ? 'flex gap-2' : 'flex items-center justify-between gap-4'}`}>
                <div className={`${isMobile ? 'flex-1' : 'flex-none'}`}>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className={`${isMobile ? 'h-12 text-base' : 'w-40'}`}>
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

                {/* Action Buttons */}
                <div className={`${isMobile ? 'flex gap-2' : 'flex items-center gap-2'}`}>
                  <Button
                    variant="outline"
                    size={isMobile ? "default" : "default"}
                    onClick={handleResetChanges}
                    disabled={!hasUnsavedChanges}
                    className={`${isMobile ? 'h-12 px-4' : ''}`}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reiniciar
                  </Button>
                  
                  <Button
                    onClick={handleSaveChanges}
                    disabled={!hasUnsavedChanges}
                    size={isMobile ? "default" : "default"}
                    className={`${isMobile ? 'h-12 px-4' : ''}`}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Data Display */}
          <div className="flex-1 overflow-auto">
            {isMobile ? (
              // Mobile Card Layout
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedData.map((row) => {
                  const status = getClassificationStatus(row)
                  const isEditing = editingRow === row.Codigo
                  const suggestion = getAutoSuggestion(row)
                  
                  return (
                    <div key={row.Codigo}>
                      <MobileDataRow
                        row={row}
                        isEditing={isEditing}
                        onEdit={() => handleMobileRowSelect(row.Codigo)}
                        onApplySuggestion={() => applyAutoSuggestion(row.Codigo)}
                        suggestion={suggestion}
                        status={status}
                      />
                      {isEditing && (
                        <InlineEditor
                          row={row}
                          onUpdate={(updates) => {
                            Object.entries(updates).forEach(([field, value]) => {
                              handleRowUpdate(row.Codigo, field as keyof DebugDataRow, value)
                            })
                            setEditingRow(null)
                          }}
                          onCancel={() => setEditingRow(null)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              // Desktop Table Layout
              <div className="overflow-auto">
                <table ref={tableRef} className="w-full border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left border-b font-medium text-gray-600 dark:text-gray-300 text-sm">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left border-b font-medium text-gray-600 dark:text-gray-300 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => handleSort('Codigo')}>
                        <div className="flex items-center gap-1">
                          Código
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left border-b font-medium text-gray-600 dark:text-gray-300 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => handleSort('Concepto')}>
                        <div className="flex items-center gap-1">
                          Concepto
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right border-b font-medium text-gray-600 dark:text-gray-300 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => handleSort('Monto')}>
                        <div className="flex items-center justify-end gap-1">
                          Monto
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left border-b font-medium text-gray-600 dark:text-gray-300 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => handleSort('Tipo')}>
                        <div className="flex items-center gap-1">
                          Tipo
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left border-b font-medium text-gray-600 dark:text-gray-300 text-sm">
                        Categoría 1
                      </th>
                      <th className="px-4 py-3 text-center border-b font-medium text-gray-600 dark:text-gray-300 text-sm">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row) => {
                      const status = getClassificationStatus(row)
                      const isEditing = editingRow === row.Codigo
                      const suggestion = getAutoSuggestion(row)
                      
                      return (
                        <tr 
                          key={row.Codigo} 
                          className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${isEditing ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center gap-2">
                              {status.status === 'classified' && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {status.status === 'partial' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                              {status.status === 'unclassified' && <X className="h-4 w-4 text-red-500" />}
                              {status.status === 'hierarchy' && <Info className="h-4 w-4 text-blue-500" />}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded block">
                              {row.Codigo}
                            </code>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="text-sm max-w-xs break-words" title={row.Concepto}>
                              {row.Concepto}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-right">
                            <div className={`text-sm font-mono ${row.Monto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(row.Monto)}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            {isEditing ? (
                              <Select
                                value={row.Tipo}
                                onValueChange={(value) => handleRowUpdate(row.Codigo, 'Tipo', value)}
                              >
                                <SelectTrigger className="w-32 h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Ingresos">Ingresos</SelectItem>
                                  <SelectItem value="Egresos">Egresos</SelectItem>
                                  <SelectItem value="Indefinido">Indefinido</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant={row.Tipo === 'Ingresos' ? 'default' : row.Tipo === 'Egresos' ? 'destructive' : 'secondary'}>
                                {row.Tipo}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {isEditing ? (
                              <Input
                                value={row['Categoria 1']}
                                onChange={(e) => handleRowUpdate(row.Codigo, 'Categoria 1', e.target.value)}
                                className="w-32 h-8 text-sm"
                                placeholder="Categoría..."
                              />
                            ) : (
                              <div className="text-sm max-w-xs break-words" title={row['Categoria 1']}>
                                {row['Categoria 1'] || 'Sin categoría'}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingRow(isEditing ? null : row.Codigo)}
                                className="h-8 w-8 p-0"
                              >
                                {isEditing ? <Check className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
                              </Button>
                              
                              {suggestion && status.status !== 'classified' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => applyAutoSuggestion(row.Codigo)}
                                  className="h-8 w-8 p-0"
                                  title="Aplicar sugerencia automática"
                                >
                                  <Target className="h-3 w-3" />
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
            )}
          </div>

          {/* Pagination */}
          <div className={`${isMobile ? 'px-4 py-3' : 'p-4'} border-t bg-white dark:bg-gray-800 flex-shrink-0`}>
            <div className={`${isMobile ? 'space-y-2' : 'flex items-center justify-between'}`}>
              <div className={`${isMobile ? 'text-sm text-center' : 'text-sm'} text-gray-600`}>
                {filteredAndSortedData.length > 0 ? (
                  <>
                    Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedData.length)} a{' '}
                    {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} de {filteredAndSortedData.length}
                  </>
                ) : (
                  'No hay registros'
                )}
              </div>
              
              <div className={`${isMobile ? 'flex justify-center items-center gap-2' : 'flex items-center gap-2'}`}>
                <Button
                  variant="outline"
                  size={isMobile ? "default" : "sm"}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`${isMobile ? 'h-12 px-4' : ''}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {!isMobile && 'Anterior'}
                </Button>
                
                <div className={`${isMobile ? 'text-sm px-4' : 'text-sm px-2'} text-gray-600`}>
                  {currentPage} / {totalPages}
                </div>
                
                <Button
                  variant="outline"
                  size={isMobile ? "default" : "sm"}
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`${isMobile ? 'h-12 px-4' : ''}`}
                >
                  {!isMobile && 'Siguiente'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`${isMobile ? 'px-4 py-3' : 'p-4'} border-t bg-gray-50 dark:bg-gray-900 flex-shrink-0`}>
            <div className={`${isMobile ? 'space-y-2' : 'flex items-center justify-between'}`}>
              <div className={`${isMobile ? 'order-2' : ''}`}>
                {validationSummary && onReturnToValidation && (
                  <Button
                    variant="outline"
                    onClick={onReturnToValidation}
                    size={isMobile ? "default" : "default"}
                    className={`${isMobile ? 'w-full h-12 text-base' : ''}`}
                  >
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Volver a Validación
                  </Button>
                )}
              </div>
              
              <div className={`${isMobile ? 'flex gap-2 order-1' : 'flex items-center gap-2'}`}>
                <Button
                  variant="outline"
                  onClick={onClose}
                  size={isMobile ? "default" : "default"}
                  className={`${isMobile ? 'flex-1 h-12 text-base' : ''}`}
                >
                  Cerrar
                </Button>
                
                <Button
                  onClick={handleSaveChanges}
                  disabled={!hasUnsavedChanges}
                  size={isMobile ? "default" : "default"}
                  className={`${isMobile ? 'flex-1 h-12 text-base' : ''}`}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 