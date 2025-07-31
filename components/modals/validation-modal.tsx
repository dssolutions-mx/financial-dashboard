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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, Upload, Eye } from "lucide-react"
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