"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Database, FileText, Download, Trash2, Plus, Check } from "lucide-react"
import { FinancialReport } from "@/lib/supabase/storage"
import { Checkbox } from "@/components/ui/checkbox"

interface ReportSelectorProps {
  onSelectReport: (report: FinancialReport) => void
  onDeleteReport?: (reportId: string) => Promise<void>
  selectedReportId?: string
  // New props for multi-selection
  multiSelect?: boolean
  selectedReportIds?: string[]
  onAccumulateReports?: (reports: FinancialReport[]) => void
}

export default function ReportSelector({ 
  onSelectReport, 
  onDeleteReport, 
  selectedReportId,
  multiSelect = false,
  selectedReportIds = [],
  onAccumulateReports
}: ReportSelectorProps) {
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [filteredReports, setFilteredReports] = useState<FinancialReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [checkedReports, setCheckedReports] = useState<Set<string>>(new Set())
  const [isAccumulating, setIsAccumulating] = useState(false)

  // Load reports on component mount
  useEffect(() => {
    loadReports()
  }, [])

  // Initialize checked reports from selectedReportIds
  useEffect(() => {
    if (multiSelect && selectedReportIds.length > 0) {
      setCheckedReports(new Set(selectedReportIds))
    }
  }, [multiSelect, selectedReportIds])

  // Filter reports when filters change
  useEffect(() => {
    filterReports()
  }, [reports, selectedYear, selectedMonth])

  const loadReports = async () => {
    try {
      setIsLoading(true)
      // Import the storage service dynamically to avoid SSR issues
      const { SupabaseStorageService } = await import("@/lib/supabase/storage")
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

  const handleCheckboxChange = (reportId: string) => {
    const newCheckedReports = new Set(checkedReports)
    if (newCheckedReports.has(reportId)) {
      newCheckedReports.delete(reportId)
    } else {
      newCheckedReports.add(reportId)
    }
    setCheckedReports(newCheckedReports)
  }

  const handleAccumulate = async () => {
    if (onAccumulateReports && checkedReports.size > 0) {
      setIsAccumulating(true)
      try {
        const selectedReports = reports.filter(report => checkedReports.has(report.id))
        await onAccumulateReports(selectedReports)
      } finally {
        setIsAccumulating(false)
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Reportes Financieros
        </CardTitle>
        <CardDescription>
          {multiSelect 
            ? `Seleccione múltiples reportes para acumular (${checkedReports.size} seleccionados)`
            : "Seleccione un reporte para visualizar sus datos"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los años</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              {availableMonths.map(month => (
                <SelectItem key={month} value={month.toString()}>
                  {getMonthName(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {multiSelect && checkedReports.size > 0 && (
            <Button 
              onClick={handleAccumulate} 
              variant="default" 
              className="ml-auto"
              disabled={isAccumulating}
            >
              {isAccumulating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Acumulando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Acumular {checkedReports.size} reportes
                </>
              )}
            </Button>
          )}
        </div>

        {/* Reports Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {multiSelect && (
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={filteredReports.length > 0 && filteredReports.every(r => checkedReports.has(r.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCheckedReports(new Set(filteredReports.map(r => r.id)))
                        } else {
                          setCheckedReports(new Set())
                        }
                      }}
                    />
                  </TableHead>
                )}
                <TableHead>Nombre</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={multiSelect ? 7 : 6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Database className="h-5 w-5 animate-pulse" />
                      <span>Cargando reportes...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={multiSelect ? 7 : 6} className="text-center py-8 text-muted-foreground">
                    No se encontraron reportes
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow 
                    key={report.id} 
                    className={
                      multiSelect 
                        ? checkedReports.has(report.id) ? "bg-muted/50" : ""
                        : selectedReportId === report.id ? "bg-muted" : ""
                    }
                  >
                    {multiSelect && (
                      <TableCell>
                        <Checkbox 
                          checked={checkedReports.has(report.id)}
                          onCheckedChange={() => handleCheckboxChange(report.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {report.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {report.file_name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {getMonthName(report.month)} {report.year}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(report.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {report.total_records} registros
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!multiSelect && (
                          <Button
                            size="sm"
                            variant={selectedReportId === report.id ? "default" : "outline"}
                            onClick={() => onSelectReport(report)}
                            disabled={selectedReportId === report.id}
                          >
                            {selectedReportId === report.id ? (
                              <>
                                <Check className="mr-1 h-3 w-3" />
                                Seleccionado
                              </>
                            ) : (
                              "Seleccionar"
                            )}
                          </Button>
                        )}
                        {onDeleteReport && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteReport(report.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
} 