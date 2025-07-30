"use client"

import React, { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { handleBalanzaFileUpload } from "@/lib/services/excel-processor"
import { validationEngine } from "@/lib/services/validation-service"
import { SupabaseStorageService } from "@/lib/supabase/storage"

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

      // Process the file
      const { data: processedData, rawData } = await handleBalanzaFileUpload(file)
      setUploadProgress(40)
      setUploadStatus('processing')

      // Validate data
      setUploadProgress(50)
      const validation = validationEngine.validateData(processedData, rawData)
      setUploadProgress(70)

      // Check if validation passes
      if (!validation.isValid) {
        setUploadStatus('error')
        setUploadResult({ validation })
        
        toast({
          title: "Error en validación",
          description: "El archivo contiene errores que deben corregirse.",
          variant: "destructive"
        })
        return
      }

      // Save to Supabase
      const savedReport = await storageService.saveFinancialData(
        file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        file.name,
        new Date().getMonth() + 1,
        new Date().getFullYear(),
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
        title: "Archivo cargado exitosamente",
        description: `Se procesaron ${processedData.length} registros correctamente.`,
        variant: "default"
      })

    } catch (error) {
      console.error("Error uploading file:", error)
      setUploadStatus('error')
      toast({
        title: "Error al cargar archivo",
        description: "Ocurrió un error al procesar el archivo. Verifica el formato e inténtalo de nuevo.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
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
                Cargar Archivo de Balanza
              </CardTitle>
              <CardDescription>
                Selecciona un archivo de Excel con datos de balanza de comprobación
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadStatus === 'idle' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        Haz clic para seleccionar archivo
                      </p>
                      <p className="text-gray-500">
                        Formatos soportados: .xlsx, .xls
                      </p>
                    </label>
                  </div>
                </div>
              )}

              {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-lg font-medium mb-2">
                      {uploadStatus === 'uploading' ? 'Subiendo archivo...' : 'Procesando datos...'}
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                </div>
              )}

              {uploadStatus === 'success' && uploadResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Archivo cargado exitosamente</span>
                  </div>
                  <div className="bg-green-50 p-4 rounded">
                    <h4 className="font-medium mb-2">Detalles del archivo:</h4>
                    <ul className="space-y-1 text-sm">
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
                    <span className="font-medium">Error al cargar archivo</span>
                  </div>

                  {uploadResult?.validation && (
                    <div className="bg-red-50 p-4 rounded">
                      <h4 className="font-medium mb-2">Errores encontrados:</h4>
                      <ul className="space-y-1 text-sm list-disc list-inside">
                        {uploadResult.validation.errors.map((error: string, index: number) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button onClick={resetUpload} variant="outline" className="w-full">
                    Intentar de nuevo
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