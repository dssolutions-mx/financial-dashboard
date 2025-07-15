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
          <span className="text-green-700 font-medium text-sm">Validación Exitosa</span>
        </>
      ) : (
        <>
          <XCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700 font-medium text-sm">Requiere Revisión</span>
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
            Archivo: <span className="font-medium">{fileName}</span>
          </DialogDescription>
        </DialogHeader>

          <div className="space-y-6">
            {/* Report Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Reporte</CardTitle>
                <CardDescription>
                  Configure los datos del reporte antes de guardar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="report-name">Nombre del Reporte</Label>
                    <Input
                      id="report-name"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="Ej: Reporte Mensual Enero 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="month">Mes</Label>
                      <select
                        id="month"
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="w-full border rounded px-3 py-2 h-10 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(0, i).toLocaleDateString('es-MX', { month: 'long' })}
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
                        onChange={(e) => setYear(parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Validation Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Validación</CardTitle>
                <ValidationStatus isValid={validationSummary.isValid} />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {validationSummary.totalRows}
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      Filas Procesadas
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {validationSummary.classifiedRows}
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-300">
                      Filas Clasificadas
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {validationSummary.unclassifiedRows}
                    </div>
                    <div className="text-xs text-orange-700 dark:text-orange-300">
                      Sin Clasificar
                    </div>
                  </div>
                </div>

                {/* Summary by Type */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Resumen por Tipo</h4>
                  <div className="space-y-1">
                    {Object.entries(validationSummary.summaryByType).map(([type, data]) => (
                      <div key={type} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium">{type}</span>
                          <Badge variant={type === 'Ingresos' ? 'default' : 'secondary'} className="text-xs">
                            {formatCurrency(data.total)}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {data.count} registros
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warnings */}
            {validationSummary.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm">Advertencias</AlertTitle>
                <AlertDescription className="text-xs">
                  <ul className="mt-1 space-y-1">
                    {validationSummary.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Unclassified Details */}
            {validationSummary.unclassifiedRows > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-700 dark:text-orange-400">
                    Datos Sin Clasificar
                  </CardTitle>
                  <CardDescription>
                    {validationSummary.unclassifiedRows} registros requieren clasificación manual
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={onViewUnclassified}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Ver Datos Sin Clasificar
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={onClose}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isSubmitting || !reportName.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Aprobar y Guardar
                  </>
                )}
              </Button>
            </div>
      </DialogContent>
    </Dialog>
  )
} 