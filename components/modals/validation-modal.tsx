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
import { useIsMobile } from "@/components/ui/use-mobile"
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
  const isMobile = useIsMobile()

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
          <CheckCircle className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} text-green-500`} />
          <span className={`text-green-700 font-medium ${isMobile ? 'text-base' : 'text-sm'}`}>Validación Exitosa</span>
        </>
      ) : (
        <>
          <XCircle className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} text-red-500`} />
          <span className={`text-red-700 font-medium ${isMobile ? 'text-base' : 'text-sm'}`}>Requiere Revisión</span>
        </>
      )}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${
        isMobile 
          ? 'fixed inset-0 w-full h-full max-w-none max-h-none m-0 rounded-none border-0 p-0 overflow-y-auto' 
          : 'max-w-4xl max-h-[90vh] overflow-y-auto'
      }`}>
        <div className={`${isMobile ? 'p-4' : 'p-0'}`}>
          <DialogHeader className={`${isMobile ? 'mb-4' : 'mb-6'}`}>
            <DialogTitle className={`flex items-center gap-3 ${isMobile ? 'text-xl' : 'text-lg'}`}>
              <AlertTriangle className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} text-orange-500`} />
              Validación de Datos Financieros
            </DialogTitle>
            <DialogDescription className={`${isMobile ? 'text-base' : 'text-sm'}`}>
              Archivo: <span className="font-medium">{fileName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
            {/* Report Configuration */}
            <Card>
              <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
                <CardTitle className={`${isMobile ? 'text-lg' : 'text-md'}`}>Configuración del Reporte</CardTitle>
                <CardDescription className={`${isMobile ? 'text-sm' : 'text-xs'}`}>
                  Configure los datos del reporte antes de guardar
                </CardDescription>
              </CardHeader>
              <CardContent className={`${isMobile ? 'space-y-4' : 'space-y-3'}`}>
                <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-3 gap-4'}`}>
                  <div className={`${isMobile ? 'space-y-2' : 'col-span-2 space-y-2'}`}>
                    <Label htmlFor="report-name" className={`${isMobile ? 'text-sm' : 'text-xs'}`}>Nombre del Reporte</Label>
                    <Input
                      id="report-name"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="Ej: Reporte Mensual Enero 2024"
                      className={`${isMobile ? 'h-12 text-base' : 'h-10 text-sm'}`}
                    />
                  </div>
                  <div className={`${isMobile ? 'grid grid-cols-2 gap-3' : 'space-y-2'}`}>
                    <div className={`${isMobile ? 'space-y-2' : 'space-y-2'}`}>
                      <Label htmlFor="month" className={`${isMobile ? 'text-sm' : 'text-xs'}`}>Mes</Label>
                      <select
                        id="month"
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className={`w-full border rounded px-3 py-2 ${isMobile ? 'h-12 text-base' : 'h-10 text-sm'} bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600`}
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(0, i).toLocaleDateString('es-MX', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={`${isMobile ? 'space-y-2' : 'space-y-2'}`}>
                      <Label htmlFor="year" className={`${isMobile ? 'text-sm' : 'text-xs'}`}>Año</Label>
                      <Input
                        id="year"
                        type="number"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className={`${isMobile ? 'h-12 text-base' : 'h-10 text-sm'}`}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Validation Summary */}
            <Card>
              <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
                <CardTitle className={`${isMobile ? 'text-lg' : 'text-md'}`}>Resumen de Validación</CardTitle>
                <ValidationStatus isValid={validationSummary.isValid} />
              </CardHeader>
              <CardContent className={`${isMobile ? 'space-y-4' : 'space-y-3'}`}>
                <div className={`${isMobile ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-3 gap-4'}`}>
                  <div className={`${isMobile ? 'p-3' : 'p-4'} bg-blue-50 dark:bg-blue-900/20 rounded-lg`}>
                    <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-blue-600 dark:text-blue-400`}>
                      {validationSummary.totalRows}
                    </div>
                    <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-blue-700 dark:text-blue-300`}>
                      Filas Procesadas
                    </div>
                  </div>
                  <div className={`${isMobile ? 'p-3' : 'p-4'} bg-green-50 dark:bg-green-900/20 rounded-lg`}>
                    <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-green-600 dark:text-green-400`}>
                      {validationSummary.classifiedRows}
                    </div>
                    <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-green-700 dark:text-green-300`}>
                      Filas Clasificadas
                    </div>
                  </div>
                  <div className={`${isMobile ? 'p-3' : 'p-4'} bg-orange-50 dark:bg-orange-900/20 rounded-lg`}>
                    <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-orange-600 dark:text-orange-400`}>
                      {validationSummary.unclassifiedRows}
                    </div>
                    <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-orange-700 dark:text-orange-300`}>
                      Sin Clasificar
                    </div>
                  </div>
                </div>

                {/* Summary by Type */}
                <div className={`${isMobile ? 'space-y-3' : 'space-y-2'}`}>
                  <h4 className={`${isMobile ? 'text-base' : 'text-sm'} font-semibold`}>Resumen por Tipo</h4>
                  <div className={`${isMobile ? 'space-y-2' : 'space-y-1'}`}>
                    {Object.entries(validationSummary.summaryByType).map(([type, data]) => (
                      <div key={type} className={`${isMobile ? 'p-3' : 'p-2'} bg-gray-50 dark:bg-gray-800 rounded`}>
                        <div className="flex justify-between items-center">
                          <span className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium`}>{type}</span>
                          <Badge variant={type === 'Ingresos' ? 'default' : 'secondary'} className={`${isMobile ? 'text-xs' : 'text-xs'}`}>
                            {formatCurrency(data.total)}
                          </Badge>
                        </div>
                        <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-600 dark:text-gray-400 mt-1`}>
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
                <AlertTriangle className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                <AlertTitle className={`${isMobile ? 'text-base' : 'text-sm'}`}>Advertencias</AlertTitle>
                <AlertDescription className={`${isMobile ? 'text-sm' : 'text-xs'}`}>
                  <ul className={`${isMobile ? 'mt-2 space-y-1' : 'mt-1 space-y-1'}`}>
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
                <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
                  <CardTitle className={`${isMobile ? 'text-lg' : 'text-md'} text-orange-700 dark:text-orange-400`}>
                    Datos Sin Clasificar
                  </CardTitle>
                  <CardDescription className={`${isMobile ? 'text-sm' : 'text-xs'}`}>
                    {validationSummary.unclassifiedRows} registros requieren clasificación manual
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={onViewUnclassified}
                    variant="outline"
                    className={`${isMobile ? 'w-full h-12 text-base' : 'w-full'} flex items-center justify-center gap-2`}
                  >
                    <Eye className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                    Ver Datos Sin Clasificar
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className={`${isMobile ? 'flex flex-col gap-3 pt-4' : 'flex justify-end space-x-2 pt-4'}`}>
              <Button
                onClick={onClose}
                variant="outline"
                className={`${isMobile ? 'w-full h-12 text-base' : ''}`}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isSubmitting || !reportName.trim()}
                className={`${isMobile ? 'w-full h-12 text-base' : ''} bg-green-600 hover:bg-green-700`}
              >
                {isSubmitting ? (
                  <>
                    <Upload className={`${isMobile ? 'mr-2 h-5 w-5' : 'mr-2 h-4 w-4'}`} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Upload className={`${isMobile ? 'mr-2 h-5 w-5' : 'mr-2 h-4 w-4'}`} />
                    Aprobar y Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 