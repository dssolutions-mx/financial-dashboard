"use client"

import React, { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { handleBalanzaFileUpload } from "@/lib/excel-processor"
import { validationEngine } from "@/lib/validation-engine"
import { SupabaseStorageService } from "@/lib/supabase-storage"

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle')
  const [uploadResult, setUploadResult] = useState<any>(null)
  
  const storageService = new SupabaseStorageService()
  const { toast } = useToast()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      setUploadStatus('uploading')
      setUploadProgress(10)

      // Process the Excel file
      const { processedData, rawData, fileName } = await handleBalanzaFileUpload(file)
      setUploadProgress(40)
      setUploadStatus('processing')

      // Validate the processed data
      const validation = validationEngine.validateProcessedData(processedData)
      setUploadProgress(70)

      if (validation.isValid) {
        // Extract metadata for saving
        const reportName = `Reporte ${new Date().toLocaleDateString('es-MX')}`
        const currentDate = new Date()
        const month = currentDate.getMonth() + 1
        const year = currentDate.getFullYear()

        // Save to Supabase
        const savedReport = await storageService.saveFinancialData(
          reportName,
          fileName,
          month,
          year,
          processedData
        )

        setUploadProgress(100)
        setUploadStatus('success')
        setUploadResult({
          report: savedReport,
          recordCount: processedData.length,
          validation
        })

        toast({
          title: "¡Carga exitosa!",
          description: `Se procesaron ${processedData.length} registros correctamente.`,
        })
      } else {
        setUploadStatus('error')
        setUploadResult({ validation })
        
        toast({
          title: "Error en validación",
          description: "El archivo contiene errores que deben corregirse.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      setUploadStatus('error')
      toast({
        title: "Error al cargar archivo",
        description: "No se pudo procesar el archivo. Verifica el formato.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const resetUpload = () => {
    setUploadStatus('idle')
    setUploadProgress(0)
    setUploadResult(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Cargar Datos</h1>
          <p className="text-muted-foreground">
            Sube archivos de balanza para procesar y almacenar datos financieros
          </p>
        </div>

        {/* Upload Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Subir Archivo de Balanza
              </CardTitle>
              <CardDescription>
                Selecciona un archivo Excel (.xlsx) con la balanza financiera
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadStatus === 'idle' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="excel-file">Archivo Excel</Label>
                    <Input
                      id="excel-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="cursor-pointer"
                    />
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Requisitos del archivo:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Formato Excel (.xlsx)</li>
                      <li>• Estructura de balanza estándar</li>
                      <li>• Columnas: Código, Concepto, Abonos, Cargos</li>
                      <li>• Datos válidos en todas las filas</li>
                    </ul>
                  </div>
                </div>
              )}

              {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      {uploadStatus === 'uploading' ? 'Subiendo archivo...' : 'Procesando datos...'}
                    </div>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {uploadStatus === 'success' && uploadResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">¡Carga completada exitosamente!</span>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Resumen de la carga:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• <strong>Reporte:</strong> {uploadResult.report.name}</li>
                      <li>• <strong>Registros procesados:</strong> {uploadResult.recordCount}</li>
                      <li>• <strong>Fecha:</strong> {new Date(uploadResult.report.created_at).toLocaleDateString('es-MX')}</li>
                    </ul>
                  </div>

                  <Button onClick={resetUpload} variant="outline" className="w-full">
                    Cargar otro archivo
                  </Button>
                </div>
              )}

              {uploadStatus === 'error' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Error en la carga</span>
                  </div>
                  
                  {uploadResult?.validation && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Errores encontrados:</h4>
                      <ul className="text-sm space-y-1">
                        {uploadResult.validation.errors.map((error: string, index: number) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button onClick={resetUpload} variant="outline" className="w-full">
                    Intentar nuevamente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Instrucciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Paso 1: Preparar el archivo</h4>
                  <p className="text-sm text-muted-foreground">
                    Asegúrate de que tu archivo Excel contenga la estructura de balanza con las columnas requeridas.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Paso 2: Validación automática</h4>
                  <p className="text-sm text-muted-foreground">
                    El sistema validará automáticamente los datos y mostrará cualquier error que requiera corrección.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Paso 3: Almacenamiento</h4>
                  <p className="text-sm text-muted-foreground">
                    Una vez validados, los datos se almacenarán en la base de datos y estarán disponibles para análisis.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-blue-900">💡 Consejo</h4>
                <p className="text-sm text-blue-700">
                  Para mejores resultados, utiliza el formato de balanza estándar proporcionado por tu sistema contable.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
} 