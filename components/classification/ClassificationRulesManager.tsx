'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Settings, Edit3, History, AlertTriangle, TrendingUp, Database, Upload, Download, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'


interface ClassificationRule {
  id: string
  account_code: string
  account_name: string
  tipo: string
  categoria_1: string
  sub_categoria: string
  clasificacion: string
  is_active: boolean
  applies_to_reports: number
  last_modified: string
}

interface RetroactiveUpdateRequest {
  ruleId: string
  updates: Partial<{
    tipo: string
    categoria_1: string
    sub_categoria: string
    clasificacion: string
  }>
  applyRetroactively: boolean
  reason: string
}

import * as classificationService from '@/lib/services/classification-service-client'

export default function ClassificationRulesManager() {
  const [rules, setRules] = useState<ClassificationRule[]>([])
  const [filteredRules, setFilteredRules] = useState<ClassificationRule[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<boolean | null>(null)
  const [selectedRule, setSelectedRule] = useState<ClassificationRule | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editForm, setEditForm] = useState({
    tipo: '',
    categoria_1: '',
    sub_categoria: '',
    clasificacion: '',
    reason: ''
  })
  const [tipoOptions] = useState<string[]>(['Ingresos', 'Egresos'])
  const [categoria1Options, setCategoria1Options] = useState<string[]>(['Sin Categoría'])
  const [subCategoriaOptions, setSubCategoriaOptions] = useState<string[]>(['Sin Subcategoría'])
  const [clasificacionOptions, setClasificacionOptions] = useState<string[]>(['Sin Clasificación'])
  const [applyRetroactively, setApplyRetroactively] = useState(true)
  const [classificationHistory, setClassificationHistory] = useState<any[]>([])
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false)
  
  const { toast } = useToast()

  // Load classification rules
  useEffect(() => {
    loadClassificationRules()
  }, [])

  // Filter rules based on search and filters
  useEffect(() => {
    let filtered = rules

    if (searchTerm) {
      filtered = filtered.filter(rule => 
        rule.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.clasificacion.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterActive !== null) {
      filtered = filtered.filter(rule => rule.is_active === filterActive)
    }

    setFilteredRules(filtered)
  }, [rules, searchTerm, filterLevel, filterActive])
  
  // Load categorias1 when tipo changes in edit form
  useEffect(() => {
    const loadCategoria1 = async () => {
      if (editForm.tipo) {
        try {
          const options = await classificationService.getCategoria1ForTipo(editForm.tipo)
          setCategoria1Options(options)
        } catch (error) {
          console.error('Error loading categoria1 options:', error)
          setCategoria1Options(['Sin Categoría'])
        }
      }
    }
    
    loadCategoria1()
  }, [editForm.tipo])
  
  // Load sub categorias when categoria_1 changes in edit form
  useEffect(() => {
    const loadSubCategorias = async () => {
      if (editForm.tipo && editForm.categoria_1) {
        try {
          const options = await classificationService.getSubCategoriasForCategoria1(editForm.tipo, editForm.categoria_1)
          setSubCategoriaOptions(options)
        } catch (error) {
          console.error('Error loading subcategoria options:', error)
          setSubCategoriaOptions(['Sin Subcategoría'])
        }
      }
    }
    
    loadSubCategorias()
  }, [editForm.tipo, editForm.categoria_1])
  
  // Load clasificaciones when sub_categoria changes in edit form
  useEffect(() => {
    const loadClasificaciones = async () => {
      if (editForm.tipo && editForm.categoria_1 && editForm.sub_categoria) {
        try {
          const options = await classificationService.getClasificacionesForSubCategoria(
            editForm.tipo,
            editForm.categoria_1,
            editForm.sub_categoria
          )
          setClasificacionOptions(options)
        } catch (error) {
          console.error('Error loading clasificacion options:', error)
          setClasificacionOptions(['Sin Clasificación'])
        }
      }
    }
    
    loadClasificaciones()
  }, [editForm.tipo, editForm.categoria_1, editForm.sub_categoria])

  const loadClassificationRules = async () => {
    try {
      setIsLoading(true)
      const rulesData = await classificationService.getAllClassificationRules()
      setRules(rulesData)
    } catch (error) {
      console.error('Error loading classification rules:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las reglas de clasificación",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditRule = async (rule: ClassificationRule) => {
    setSelectedRule(rule)
    setEditForm({
      tipo: rule.tipo,
      categoria_1: rule.categoria_1,
      sub_categoria: rule.sub_categoria,
      clasificacion: rule.clasificacion,
      reason: ''
    })

    try {
      // Load options for dropdown menus
      const categoria1 = await classificationService.getCategoria1ForTipo(rule.tipo)
      setCategoria1Options(categoria1)
      
      if (rule.tipo && rule.categoria_1) {
        const subCategoria = await classificationService.getSubCategoriasForCategoria1(rule.tipo, rule.categoria_1)
        setSubCategoriaOptions(subCategoria)
      }
      
      if (rule.tipo && rule.categoria_1 && rule.sub_categoria) {
        const clasificacion = await classificationService.getClasificacionesForSubCategoria(
          rule.tipo, 
          rule.categoria_1, 
          rule.sub_categoria
        )
        setClasificacionOptions(clasificacion)
      }
    } catch (error) {
      console.error('Error loading classification options:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las opciones de clasificación",
        variant: "destructive"
      })
    }
    
    setIsEditModalOpen(true)
  }

  const handleViewHistory = async (rule: ClassificationRule) => {
    try {
      setSelectedRule(rule)
      const history = await classificationService.getClassificationHistory(rule.account_code)
      setClassificationHistory(history)
      setIsHistoryModalOpen(true)
    } catch (error) {
      console.error('Error loading classification history:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de clasificación",
        variant: "destructive"
      })
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedRule || !editForm.reason.trim()) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive"
      })
      return
    }

    try {
      setIsProcessingUpdate(true)
      
      const updates = {
        tipo: editForm.tipo,
        categoria_1: editForm.categoria_1,
        sub_categoria: editForm.sub_categoria,
        clasificacion: editForm.clasificacion
      }

      const result = await classificationService.updateClassificationRule(
        selectedRule.id,
        updates,
        'current_user', // TODO: Get from auth context
        applyRetroactively
      )

      toast({
        title: "Clasificación actualizada",
        description: applyRetroactively 
          ? `Se actualizaron ${result.impact.affectedRecords} registros en ${result.impact.affectedReports.length} reportes con impacto financiero de ${formatCurrency(result.impact.totalFinancialImpact)}`
          : "Regla actualizada exitosamente",
        duration: 5000
      })

      // Refresh rules
      await loadClassificationRules()
      setIsEditModalOpen(false)
      setSelectedRule(null)

    } catch (error) {
      console.error('Error updating classification rule:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la regla de clasificación",
        variant: "destructive"
      })
    } finally {
      setIsProcessingUpdate(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }



  const getActiveStatusBadge = (isActive: boolean, appliesTo: number) => {
    return isActive ? (
      <div className="flex items-center gap-1">
        <Badge className="bg-green-100 text-green-800 text-xs">Activa</Badge>
        <span className="text-xs text-gray-500">({appliesTo} reportes)</span>
      </div>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 text-xs">Inactiva</Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Gestión de Reglas de Clasificación
          </CardTitle>
          <CardDescription>
            Administra las reglas de clasificación con aplicación retroactiva a todos los reportes históricos
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reglas</p>
                <p className="text-2xl font-bold">{rules.length}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reglas Activas</p>
                <p className="text-2xl font-bold text-green-600">
                  {rules.filter(r => r.is_active).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        

        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reportes Afectados</p>
                <p className="text-2xl font-bold text-orange-600">
                  {rules.reduce((sum, r) => sum + r.applies_to_reports, 0)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar reglas</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Buscar por código, nombre o clasificación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <div>
                <Label htmlFor="active-filter">Estado</Label>
                <Select value={filterActive === null ? 'all' : filterActive.toString()} onValueChange={(value) => setFilterActive(value === 'all' ? null : value === 'true')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Activas</SelectItem>
                    <SelectItem value="false">Inactivas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classification Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reglas de Clasificación ({filteredRules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>Cargando reglas de clasificación...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código de Cuenta</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Clasificación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Última Modificación</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <span className="font-mono text-sm">{rule.account_code}</span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={rule.account_name}>
                          {rule.account_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{rule.clasificacion}</div>
                          <div className="text-xs text-gray-500">
                            {rule.tipo} → {rule.categoria_1}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getActiveStatusBadge(rule.is_active, rule.applies_to_reports)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(rule.last_modified)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditRule(rule)}
                            className="flex items-center gap-1"
                          >
                            <Edit3 className="h-3 w-3" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewHistory(rule)}
                            className="flex items-center gap-1"
                          >
                            <History className="h-3 w-3" />
                            Historial
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Classification Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Editar Clasificación - {selectedRule?.account_code}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current vs New Classification */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Clasificación Actual</Label>
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm">
                    <div><strong>Tipo:</strong> {selectedRule?.tipo}</div>
                    <div><strong>Categoría 1:</strong> {selectedRule?.categoria_1}</div>
                    <div><strong>Sub Categoría:</strong> {selectedRule?.sub_categoria}</div>
                    <div><strong>Clasificación:</strong> {selectedRule?.clasificacion}</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Nueva Clasificación</Label>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit-tipo">Tipo</Label>
                    <Select 
                      value={editForm.tipo} 
                      onValueChange={(value) => setEditForm(prev => ({ 
                        ...prev, 
                        tipo: value,
                        categoria_1: '',
                        sub_categoria: '',
                        clasificacion: ''
                      }))}
                    >
                      <SelectTrigger id="edit-tipo">
                        <SelectValue placeholder="Seleccionar Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipoOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-categoria-1">Categoría 1</Label>
                    <Select 
                      value={editForm.categoria_1} 
                      onValueChange={(value) => setEditForm(prev => ({ 
                        ...prev, 
                        categoria_1: value,
                        sub_categoria: '',
                        clasificacion: ''
                      }))}
                      disabled={!editForm.tipo || tipoOptions.length === 0}
                    >
                      <SelectTrigger id="edit-categoria-1">
                        <SelectValue placeholder="Seleccionar Categoría 1" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoria1Options.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-sub-categoria">Sub Categoría</Label>
                    <Select 
                      value={editForm.sub_categoria} 
                      onValueChange={(value) => setEditForm(prev => ({ 
                        ...prev, 
                        sub_categoria: value,
                        clasificacion: ''
                      }))}
                      disabled={!editForm.categoria_1 || subCategoriaOptions.length === 0}
                    >
                      <SelectTrigger id="edit-sub-categoria">
                        <SelectValue placeholder="Seleccionar Sub Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {subCategoriaOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-clasificacion">Clasificación</Label>
                    <Select 
                      value={editForm.clasificacion} 
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, clasificacion: value }))}
                      disabled={!editForm.sub_categoria || clasificacionOptions.length === 0}
                    >
                      <SelectTrigger id="edit-clasificacion">
                        <SelectValue placeholder="Seleccionar Clasificación" />
                      </SelectTrigger>
                      <SelectContent>
                        {clasificacionOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Retroactive Application */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="apply-retroactive"
                  checked={applyRetroactively}
                  onCheckedChange={setApplyRetroactively}
                />
                <Label htmlFor="apply-retroactive" className="font-medium">
                  Aplicar cambios a todos los reportes históricos
                </Label>
              </div>
              
              {applyRetroactively && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Impacto Retroactivo</AlertTitle>
                  <AlertDescription>
                    Esta clasificación se aplicará a {selectedRule?.applies_to_reports || 0} reportes existentes.
                    Todos los registros con el código {selectedRule?.account_code} serán actualizados.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Reason for Change */}
            <div>
              <Label htmlFor="edit-reason">Razón del Cambio *</Label>
              <Textarea
                id="edit-reason"
                placeholder="Explique por qué se realiza este cambio en la clasificación..."
                value={editForm.reason}
                onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={isProcessingUpdate || !editForm.reason.trim()}
            >
              {isProcessingUpdate ? 'Procesando...' : 'Aplicar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Classification History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Historial de Clasificación - {selectedRule?.account_code}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {classificationHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Reporte</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Clasificación</TableHead>
                    <TableHead>Aplicado Por</TableHead>
                    <TableHead>Origen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classificationHistory.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatDate(entry.appliedAt)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{entry.reportName}</div>
                          <div className="text-xs text-gray-500">{formatDate(entry.reportDate)}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(entry.amount)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{entry.classification.clasificacion}</div>
                          <div className="text-xs text-gray-500">
                            {entry.classification.tipo} → {entry.classification.categoria_1}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{entry.appliedBy}</TableCell>
                      <TableCell>
                        <Badge variant={entry.source === 'manual' ? 'default' : 'secondary'}>
                          {entry.source === 'manual' ? 'Manual' : 
                           entry.source === 'excel_import' ? 'Excel' :
                           entry.source === 'retroactive_update' ? 'Retroactivo' : 'Patrón'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay historial disponible para esta cuenta
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 