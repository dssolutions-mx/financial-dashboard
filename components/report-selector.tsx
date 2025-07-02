"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Database, FileText, Download, Trash2 } from "lucide-react"
import { FinancialReport } from "@/lib/supabase-storage"

interface ReportSelectorProps {
  onSelectReport: (report: FinancialReport) => void
  onDeleteReport?: (reportId: string) => Promise<void>
  selectedReportId?: string
}

export default function ReportSelector({ 
  onSelectReport, 
  onDeleteReport, 
  selectedReportId 
}: ReportSelectorProps) {
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [filteredReports, setFilteredReports] = useState<FinancialReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState<string>("all")

  // Load reports on component mount
  useEffect(() => {
    loadReports()
  }, [])

  // Filter reports when filters change
  useEffect(() => {
    filterReports()
  }, [reports, selectedYear, selectedMonth])

  const loadReports = async () => {
    try {
      setIsLoading(true)
      // Import the storage service dynamically to avoid SSR issues
      const { SupabaseStorageService } = await import("@/lib/supabase-storage")
      const storageService = new SupabaseStorageService()
      const reportData = await storageService.getFinancialReports()
      setReports(reportData)
    } catch (error) {
      console.error("Error loading reports:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterReports = () => {
    let filtered = [...reports]

    if (selectedYear !== "all") {
      filtered = filtered.filter(report => report.year === parseInt(selectedYear))
    }

    if (selectedMonth !== "all") {
      filtered = filtered.filter(report => report.month === parseInt(selectedMonth))
    }

    setFilteredReports(filtered)
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!onDeleteReport) return
    
    const confirmed = confirm("¿Está seguro de que desea eliminar este reporte? Esta acción no se puede deshacer.")
    if (!confirmed) return

    try {
      await onDeleteReport(reportId)
      await loadReports() // Reload reports after deletion
    } catch (error) {
      console.error("Error deleting report:", error)
      alert("Error al eliminar el reporte")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMonthName = (month: number) => {
    return new Date(2024, month - 1, 1).toLocaleDateString('es-MX', { month: 'long' })
  }

  // Get unique years and months for filters
  const availableYears = [...new Set(reports.map(r => r.year))].sort((a, b) => b - a)
  const availableMonths = [...new Set(reports.map(r => r.month))].sort((a, b) => a - b)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Reportes Financieros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando reportes...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Reportes Financieros
        </CardTitle>
        <CardDescription>
          Seleccione un reporte para ver los datos financieros
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Año</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mes</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month.toString()}>
                    {getMonthName(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reports Table */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No hay reportes disponibles
            </h3>
            <p className="text-muted-foreground">
              {reports.length === 0 
                ? "Suba su primer archivo de Balanza de Comprobación para comenzar"
                : "No hay reportes que coincidan con los filtros seleccionados"
              }
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead>Fecha de Subida</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map(report => (
                <TableRow 
                  key={report.id}
                  className={selectedReportId === report.id ? "bg-muted" : ""}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{report.name}</div>
                      {report.file_name && (
                        <div className="text-xs text-muted-foreground">
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
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {report.total_records.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDate(report.upload_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={selectedReportId === report.id ? "default" : "outline"}
                        onClick={() => onSelectReport(report)}
                      >
                        {selectedReportId === report.id ? "Seleccionado" : "Seleccionar"}
                      </Button>
                      
                      {onDeleteReport && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteReport(report.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
} 