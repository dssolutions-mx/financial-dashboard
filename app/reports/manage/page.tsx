"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { SupabaseStorageService, FinancialReport } from "@/lib/supabase/storage"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { 
  FileText, 
  Search, 
  Download, 
  Trash2, 
  Eye, 
  Calendar,
  TrendingUp,
  DollarSign
} from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export default function ManageReportsPage() {
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [filteredReports, setFilteredReports] = useState<FinancialReport[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<FinancialReport | null>(null)
  
  const storageService = new SupabaseStorageService()
  const { toast } = useToast()

  useEffect(() => {
    loadReports()
  }, [])

  useEffect(() => {
    // Filter reports based on search term
    const filtered = reports.filter(report => 
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${report.month}/${report.year}`.includes(searchTerm)
    )
    setFilteredReports(filtered)
  }, [reports, searchTerm])

  const loadReports = async () => {
    try {
      setIsLoading(true)
      const allReports = await storageService.getFinancialReports()
      setReports(allReports)
      setFilteredReports(allReports)
    } catch (error) {
      console.error("Error loading reports:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los reportes",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    try {
      await storageService.deleteReport(reportId)
      await loadReports() // Reload the list
      toast({
        title: "Reporte eliminado",
        description: "El reporte se eliminó correctamente",
      })
    } catch (error) {
      console.error("Error deleting report:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el reporte",
        variant: "destructive"
      })
    }
  }

  const handleExportReport = async (report: FinancialReport) => {
    try {
      const jsonData = await storageService.exportToJSON(report.id)
      
      // Create and download file
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.name.replace(/\s+/g, '_')}_${report.month}_${report.year}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Exportación exitosa",
        description: "El archivo se descargó correctamente",
      })
    } catch (error) {
      console.error("Error exporting report:", error)
      toast({
        title: "Error",
        description: "No se pudo exportar el reporte",
        variant: "destructive"
      })
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
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getMonthName = (month: number) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return months[month - 1] || month.toString()
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando reportes...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Gestionar Reportes</h1>
            <p className="text-muted-foreground">
              Administra y revisa los reportes financieros almacenados
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar reportes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reportes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.length}</div>
              <p className="text-xs text-muted-foreground">
                Reportes almacenados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Período Más Reciente</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reports.length > 0 
                  ? `${getMonthName(reports[0].month)} ${reports[0].year}`
                  : "N/A"
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Última carga de datos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reports.reduce((sum, report) => sum + (report.total_records || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Registros financieros
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Reportes</CardTitle>
            <CardDescription>
              {filteredReports.length} de {reports.length} reportes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredReports.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Fecha de Carga</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{report.name}</div>
                          {report.file_name && (
                            <div className="text-sm text-muted-foreground">
                              {report.file_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getMonthName(report.month)} {report.year}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(report.total_records || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {report.created_at && formatDate(report.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">
                          Activo
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportReport(report)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar reporte?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente el reporte "{report.name}" y todos sus datos asociados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteReport(report.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? "No se encontraron reportes" : "No hay reportes disponibles"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? "Intenta con otros términos de búsqueda" 
                    : "Comienza subiendo tu primer archivo de balanza"
                  }
                </p>
                {!searchTerm && (
                  <Button asChild>
                    <a href="/reports/upload">
                      Cargar primer reporte
                    </a>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 