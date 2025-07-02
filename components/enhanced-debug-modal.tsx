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
} from "@/lib/classification-hierarchy"
import { ValidationSummary } from "@/lib/validation-engine"

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
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-yellow-800">
          Editando: {row.Concepto.substring(0, 50)}...
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 px-2">
            <X className="h-3 w-3" />
          </Button>
          <Button size="sm" onClick={handleQuickSave} className="h-7 px-2">
            <Check className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <Select value={localRow.Tipo} onValueChange={(value) => handleFieldChange('Tipo', value)}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ingresos">Ingresos</SelectItem>
              <SelectItem value="Egresos">Egresos</SelectItem>
              <SelectItem value="Indefinido">Sin Tipo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Select 
            value={localRow['Sub categoria']} 
            onValueChange={(value) => handleFieldChange('Sub categoria', value)}
            disabled={!correctType || correctType === "Indefinido"}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Sub categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sin Subcategoría">Sin Subcategoría</SelectItem>
              {subCategorias.map(subcat => (
                <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
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
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Clasificación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sin Clasificación">Sin Clasificación</SelectItem>
              {getClasificacionesForSubCategoria(correctType || "", localRow['Sub categoria'] || "").map(clasif => (
                <SelectItem key={clasif} value={clasif}>{clasif}</SelectItem>
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
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Categoría 1" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sin Categoría">Sin Categoría</SelectItem>
              {categorias1.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-600">
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
  validationSummary 
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
        return { ...row, ...updates }
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
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-blue-600" />
              <span>Validación de Totales Jerárquicos</span>
              <Badge variant={stats.validationStatus === 'valid' ? "default" : "destructive"}>
                {stats.validationStatus === 'valid' ? 'Totales Coinciden' : 'Verificar Totales'}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Revisa y ajusta las clasificaciones para que los totales clasificados coincidan con las metas jerárquicas. 
            No todos los elementos necesitan clasificación.
          </DialogDescription>
        </DialogHeader>

        {/* Hierarchy Validation Summary */}
        {validationSummary && (
          <Alert className={validationSummary.isValid ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
            <Target className="h-4 w-4" />
            <AlertDescription>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <strong>Ingresos:</strong>
                  </span>
                  <div className="text-right">
                    <div className="text-sm">Meta: {formatCurrency(validationSummary.hierarchyTotals.ingresos)}</div>
                    <div className="text-sm">Clasificado: {formatCurrency(validationSummary.classifiedTotals.ingresos)}</div>
                    <div className={`text-sm font-medium ${Math.abs(validationSummary.variance.ingresos) <= 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      Diferencia: {formatCurrency(validationSummary.variance.ingresos)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <strong>Egresos:</strong>
                  </span>
                  <div className="text-right">
                    <div className="text-sm">Meta: {formatCurrency(validationSummary.hierarchyTotals.egresos)}</div>
                    <div className="text-sm">Clasificado: {formatCurrency(validationSummary.classifiedTotals.egresos)}</div>
                    <div className={`text-sm font-medium ${Math.abs(validationSummary.variance.egresos) <= 0.01 ? 'text-green-600' : 'text-red-600'}`}>
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
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-blue-600">{stats.totalDetail}</div>
              <div className="text-xs text-gray-600">Registros Detalle</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-green-600">{stats.classified}</div>
              <div className="text-xs text-gray-600">Clasificados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-yellow-600">{stats.partial}</div>
              <div className="text-xs text-gray-600">Parciales</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-orange-600">{stats.unclassified}</div>
              <div className="text-xs text-gray-600">Sin Clasificar</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-sm font-bold text-purple-600">{formatCurrency(stats.unclassifiedAmount)}</div>
              <div className="text-xs text-gray-600">Monto Pendiente</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por concepto, código o planta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-64">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unclassified">🔍 Sin Clasificar</SelectItem>
              <SelectItem value="partial">⚡ Clasificación Parcial</SelectItem>
              <SelectItem value="classified">✅ Clasificados</SelectItem>
              <SelectItem value="hierarchy">📊 Totales Jerárquicos</SelectItem>
              <SelectItem value="detail">📋 Todos los Detalles</SelectItem>
              <SelectItem value="ingresos">💰 Solo Ingresos</SelectItem>
              <SelectItem value="egresos">💸 Solo Egresos</SelectItem>
              <SelectItem value="all">🗂️ Todos los Registros</SelectItem>
            </SelectContent>
          </Select>
          {selectedRows.size > 0 && (
            <Button onClick={handleBulkClassify} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Auto-clasificar ({selectedRows.size})
            </Button>
          )}
        </div>

        {/* Info about allowing unclassified items */}
        {selectedFilter === "unclassified" && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Nota:</strong> No todos los elementos necesitan clasificación. Algunos registros pueden permanecer 
              sin clasificar si no forman parte del sistema de clasificación principal. El objetivo es que los totales 
              clasificados coincidan con las metas jerárquicas.
            </AlertDescription>
          </Alert>
        )}

        {/* Data Table */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
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
                    />
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('Concepto')}>
                    <div className="flex items-center">
                      Concepto <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => handleSort('Monto')}>
                    <div className="flex items-center justify-end">
                      Monto <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoría 1</TableHead>
                  <TableHead>Acciones</TableHead>
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
                        hover:bg-gray-50 transition-colors
                        ${isHierarchy ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                        ${status.status === 'classified' ? 'bg-green-50' : ''}
                        ${status.status === 'untyped' ? 'bg-red-50' : ''}
                      `}
                    >
                      <TableCell>
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
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            status.color === 'green' ? 'default' : 
                            status.color === 'blue' ? 'secondary' :
                            status.color === 'yellow' ? 'outline' : 'destructive'
                          }
                          className={`text-xs ${
                            status.color === 'yellow' ? 'border-yellow-500 text-yellow-700' :
                            status.color === 'gray' ? 'bg-gray-100 text-gray-600' : ''
                          }`}
                        >
                          {status.message}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate" title={row.Concepto}>
                          {row.Concepto}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.Codigo}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.Monto)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {row.Tipo || 'Sin tipo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <div className="truncate text-sm" title={row['Categoria 1']}>
                          {row['Categoria 1'] || 'Sin categoría'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {!isHierarchy && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingRowId(rowId)}
                            className="h-7 px-2"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        {isHierarchy && (
                          <span className="text-xs text-blue-600 font-medium">
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

        <DialogFooter className="flex justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {processedData.length} de {data.length} registros
          </div>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 