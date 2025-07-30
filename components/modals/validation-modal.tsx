"use client"

import React, { useState } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, AlertTriangle, Upload, Eye, Users, TrendingDown, TrendingUp } from "lucide-react"
import { ValidationSummary, ReportMetadata } from "@/lib/services/validation-service"
import { DebugDataRow } from "@/lib/services/excel-processor"

interface ValidationModalProps {
  isOpen: boolean
  onClose: () => void
  validationSummary: ValidationSummary | null
  fileName: string
  onApprove: (metadata: ReportMetadata) => Promise<void>
  onViewUnclassified: () => void
}

export default function ValidationModal({
  isOpen,
  onClose,
  validationSummary,
  fileName,
  onApprove,
  onViewUnclassified
}: ValidationModalProps) {
  const [reportName, setReportName] = useState("")
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!validationSummary) return null

  const handleApprove = async () => {
    if (!reportName.trim()) {
      alert("Por favor ingrese un nombre para el reporte")
      return
    }

    setIsSubmitting(true)
    try {
      await onApprove({
        name: reportName.trim(),
        fileName,
        month,
        year
      })
      onClose()
    } catch (error) {
      console.error("Error saving report:", error)
      alert("Error al guardar el reporte")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const ValidationStatus = ({ isValid }: { isValid: boolean }) => (
    <div className="flex items-center gap-2">
      {isValid ? (
        <>
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-green-700 font-medium">Validación Exitosa</span>
        </>
      ) : (
        <>
          <XCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700 font-medium">Requiere Revisión</span>
        </>
      )}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Validación de Datos Financieros
          </DialogTitle>
          <DialogDescription>
            Revise los resultados de la validación antes de guardar los datos en el sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Validation Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado de Validación</CardTitle>
              <CardDescription>Resultado general de la validación de datos</CardDescription>
            </CardHeader>
            <CardContent>
              <ValidationStatus isValid={validationSummary.isValid} />
              
              {validationSummary.validationErrors.length > 0 && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Problemas de Validación Encontrados</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {validationSummary.validationErrors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Family Validation Results - Enhanced Section */}
          {validationSummary.useFamilyValidation && validationSummary.familyValidation && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Análisis de Clasificación por Familias
                </CardTitle>
                <CardDescription>
                  Validación sofisticada familia por familia con detección de problemas avanzados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Family Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {validationSummary.familyValidation.totalFamilies}
                    </div>
                    <p className="text-sm text-blue-600">Familias Analizadas</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {validationSummary.familyValidation.familiesWithIssues}
                    </div>
                    <p className="text-sm text-orange-600">Con Problemas</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {validationSummary.familyValidation.criticalIssues}
                    </div>
                    <p className="text-sm text-red-600">Críticos</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(validationSummary.familyValidation.totalFinancialImpact)}
                    </div>
                    <p className="text-sm text-green-600">Impacto Total</p>
                  </div>
                </div>

                {/* Recommendations */}
                {validationSummary.familyValidation.recommendations.length > 0 && (
                  <Alert className="mb-4">
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>Recomendaciones del Sistema</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {validationSummary.familyValidation.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm">{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Issues by Type */}
                {validationSummary.familyValidation.issues.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-800">Problemas Detectados por Familia</h4>
                    <div className="max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Familia</TableHead>
                            <TableHead>Tipo de Error</TableHead>
                            <TableHead>Severidad</TableHead>
                            <TableHead>Impacto</TableHead>
                            <TableHead>% Faltante</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validationSummary.familyValidation.issues
                            .sort((a, b) => b.financial_impact - a.financial_impact)
                            .slice(0, 10)
                            .map((issue, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div>
                                  <div className="font-mono text-xs">{issue.family_code}</div>
                                  <div className="text-xs text-gray-500 truncate max-w-xs" title={issue.family_name}>
                                    {issue.family_name}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  issue.error_type === 'OVER_CLASSIFICATION' ? 'destructive' :
                                  issue.error_type.includes('MIXED') ? 'secondary' : 'outline'
                                }>
                                  {issue.error_type === 'OVER_CLASSIFICATION' ? 'Sobre-clasificación' :
                                   issue.error_type === 'MIXED_LEVEL4_SIBLINGS' ? 'Hermanos Mixtos' :
                                   issue.error_type === 'MIXED_LEVEL3_SIBLINGS' ? 'Resumen Mixto' :
                                   issue.error_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  issue.severity === 'CRITICAL' ? 'destructive' :
                                  issue.severity === 'HIGH' ? 'secondary' :
                                  issue.severity === 'MEDIUM' ? 'outline' : 'default'
                                }>
                                  {issue.severity === 'CRITICAL' ? 'Crítico' :
                                   issue.severity === 'HIGH' ? 'Alto' :
                                   issue.severity === 'MEDIUM' ? 'Medio' : 'Bajo'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {formatCurrency(issue.financial_impact)}
                              </TableCell>
                              <TableCell>
                                {issue.missing_percentage ? (
                                  <div className="flex items-center gap-1">
                                    {issue.missing_percentage > 50 ? (
                                      <TrendingDown className="h-3 w-3 text-red-500" />
                                    ) : (
                                      <TrendingUp className="h-3 w-3 text-orange-500" />
                                    )}
                                    <span className="text-xs">
                                      {issue.missing_percentage.toFixed(1)}%
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">N/A</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {validationSummary.familyValidation.issues.length > 10 && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">
                          Mostrando 10 de {validationSummary.familyValidation.issues.length} problemas. 
                          Use el análisis detallado para ver todos.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Traditional Validation - Show as secondary tab when family validation is active */}
          {validationSummary.useFamilyValidation ? (
            <Tabs defaultValue="traditional" className="w-full">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="traditional">Validación Tradicional (Referencia)</TabsTrigger>
              </TabsList>
              <TabsContent value="traditional">
                {/* Move traditional validation content here */}
                <div className="space-y-6">
                  {/* Totals Comparison */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Comparación de Totales</CardTitle>
                      <CardDescription>Comparación entre totales jerárquicos y clasificados</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-3 text-green-600">Ingresos</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Total Jerárquico (4100-0000-000-000):</span>
                              <span className="font-mono">{formatCurrency(validationSummary.hierarchyTotals.ingresos)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Clasificado:</span>
                              <span className="font-mono">{formatCurrency(validationSummary.classifiedTotals.ingresos)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span>Variación:</span>
                              <span className={`font-mono ${Math.abs(validationSummary.variance.ingresos) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(validationSummary.variance.ingresos)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-3 text-red-600">Egresos</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Total Jerárquico (5000-0000-000-000):</span>
                              <span className="font-mono">{formatCurrency(validationSummary.hierarchyTotals.egresos)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Clasificado:</span>
                              <span className="font-mono">{formatCurrency(validationSummary.classifiedTotals.egresos)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span>Variación:</span>
                              <span className={`font-mono ${Math.abs(validationSummary.variance.egresos) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(validationSummary.variance.egresos)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Unclassified Items */}
                  {validationSummary.unclassifiedItems.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Elementos Sin Clasificar</CardTitle>
                        <CardDescription>Cuentas que necesitan clasificación</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="relative">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Concepto</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {validationSummary.unclassifiedItems.slice(0, 10).map((item, index) => (
                                <TableRow key={item.Codigo || index}>
                                  <TableCell className="font-mono text-sm">{item.Codigo}</TableCell>
                                  <TableCell className="max-w-xs truncate">{item.Concepto}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.Monto)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {validationSummary.unclassifiedItems.length > 10 && (
                            <div className="text-center py-2 text-sm text-gray-500">
                              ... y {validationSummary.unclassifiedItems.length - 10} más
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* Show traditional validation directly if no family validation */
            <div className="space-y-6">
              {/* Totals Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Comparación de Totales</CardTitle>
                  <CardDescription>Comparación entre totales jerárquicos y clasificados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 text-green-600">Ingresos</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Jerárquico (4100-0000-000-000):</span>
                          <span className="font-mono">{formatCurrency(validationSummary.hierarchyTotals.ingresos)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Clasificado:</span>
                          <span className="font-mono">{formatCurrency(validationSummary.classifiedTotals.ingresos)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span>Variación:</span>
                          <span className={`font-mono ${Math.abs(validationSummary.variance.ingresos) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(validationSummary.variance.ingresos)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3 text-red-600">Egresos</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Jerárquico (5000-0000-000-000):</span>
                          <span className="font-mono">{formatCurrency(validationSummary.hierarchyTotals.egresos)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Clasificado:</span>
                          <span className="font-mono">{formatCurrency(validationSummary.classifiedTotals.egresos)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span>Variación:</span>
                          <span className={`font-mono ${Math.abs(validationSummary.variance.egresos) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(validationSummary.variance.egresos)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Unclassified Items */}
              {validationSummary.unclassifiedItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Elementos Sin Clasificar</CardTitle>
                    <CardDescription>Cuentas que necesitan clasificación</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Concepto</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validationSummary.unclassifiedItems.slice(0, 10).map((item, index) => (
                            <TableRow key={item.Codigo || index}>
                              <TableCell className="font-mono text-sm">{item.Codigo}</TableCell>
                              <TableCell className="max-w-xs truncate">{item.Concepto}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.Monto)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {validationSummary.unclassifiedItems.length > 10 && (
                        <div className="text-center py-2 text-sm text-gray-500">
                          ... y {validationSummary.unclassifiedItems.length - 10} más
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Report Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Reporte</CardTitle>
              <CardDescription>Configure los detalles del reporte antes de guardar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reportName">Nombre del Reporte</Label>
                  <Input
                    id="reportName"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="Ej: Balanza Enero 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="month">Mes</Label>
                  <select 
                    id="month"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2024, i, 1).toLocaleDateString('es-MX', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Año</Label>
                  <Input
                    id="year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>
              
              <div className="mt-4 text-sm text-muted-foreground">
                <strong>Archivo:</strong> {fileName}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          
          <div className="flex gap-3">
            {validationSummary.unclassifiedItems.length > 0 && (
              <Button variant="outline" onClick={onViewUnclassified}>
                <Eye className="h-4 w-4 mr-2" />
                Revisar Elementos
              </Button>
            )}
            
            <Button 
              onClick={handleApprove}
              disabled={isSubmitting || !reportName.trim()}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                "Guardando..."
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {validationSummary.isValid ? "Aprobar y Guardar" : "Guardar con Errores"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 