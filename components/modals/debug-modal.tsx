"use client"

import type React from "react"
import { useMemo, useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DebugDataRow } from "@/lib/services/excel-processor"

// Define possible classification values if needed for dropdowns, or use free text input
const TIPOS = ["Ingresos", "Egresos", "Indefinido"]
// Define all possible plants including P5 for the dropdown
const ALL_PLANTS_OPTIONS = ["MEXICALI", "P1", "P2", "P3", "P4", "P5", "SIN CLASIFICACION"]

interface DebugModalProps {
  isOpen: boolean
  onClose: () => void
  data: DebugDataRow[]
  onUpdateData: (index: number, updatedRow: DebugDataRow) => void
  onSaveChanges: (data: DebugDataRow[]) => void
}

const DebugModal: React.FC<DebugModalProps> = ({ isOpen, onClose, data, onUpdateData, onSaveChanges }) => {
  const [localData, setLocalData] = useState<DebugDataRow[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize local data when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalData([...data])
      setHasChanges(false)
    }
  }, [isOpen, data])

  // Pre-calculate unique values for dropdowns using useMemo
  const uniqueCategoria1 = useMemo(
    () =>
      [
        "Sin Categoría",
        ...Array.from(new Set(localData.map((row) => row["Categoria 1"]))).filter((c) => c !== "Sin Categoría"),
      ].sort(),
    [localData],
  )

  const uniqueSubCategoria = useMemo(
    () =>
      [
        "Sin Subcategoría",
        ...Array.from(new Set(localData.map((row) => row["Sub categoria"]))).filter((c) => c !== "Sin Subcategoría"),
      ].sort(),
    [localData],
  )

  const uniqueClasificacion = useMemo(
    () =>
      [
        "Sin Clasificación",
        ...Array.from(new Set(localData.map((row) => row.Clasificacion))).filter((c) => c !== "Sin Clasificación"),
      ].sort(),
    [localData],
  )

  // Include original and processed keys in the desired order
  const columnKeys: (keyof DebugDataRow)[] = [
    "Codigo",
    "Concepto",
    "Cargos",
    "Abonos",
    "Tipo",
    "Categoria 1",
    "Sub categoria",
    "Clasificacion",
    "Planta",
    "Monto",
  ]

  // Define column widths (adjust as needed)
  const columnWidths: Record<keyof DebugDataRow, string> = {
    Codigo: "min-w-[150px]",
    Concepto: "min-w-[250px] whitespace-normal", // Allow wrapping
    Cargos: "min-w-[100px] text-right",
    Abonos: "min-w-[100px] text-right",
    Tipo: "min-w-[120px]",
    "Categoria 1": "min-w-[200px]",
    "Sub categoria": "min-w-[200px]",
    Clasificacion: "min-w-[200px]",
    Planta: "min-w-[120px]", // Adjusted width for Planta dropdown
    Monto: "min-w-[120px] text-right",
  }

  const handleFieldChange = (index: number, field: keyof DebugDataRow, value: string) => {
    const updatedData = [...localData]
    updatedData[index] = { ...updatedData[index], [field]: value }
    
    // COMENTADO: No recalcular Monto cuando Tipo changes - preservar monto original
    // if (field === "Tipo") {
    //   const row = updatedData[index]
    //   const cargos = row.Cargos || 0
    //   const abonos = row.Abonos || 0
    //   
    //   let newMonto = 0
    //   if (value === "Ingresos") {
    //     newMonto = abonos - cargos // Net income: Abonos minus any returns/adjustments in Cargos
    //   } else if (value === "Egresos") {
    //     newMonto = cargos - abonos // Net expense: Cargos minus any refunds/adjustments in Abonos
    //   } else {
    //     newMonto = abonos - cargos // Default logic for indefinido or other types
    //   }
    //   
    //   updatedData[index].Monto = newMonto
    // }
    
    setLocalData(updatedData)
    setHasChanges(true)
  }

  // Function to check if a row needs highlighting
  const needsHighlight = (row: DebugDataRow): boolean => {
    return (
      row.Tipo === "Indefinido" ||
      row["Categoria 1"] === "Sin Categoría" ||
      row["Sub categoria"] === "Sin Subcategoría" ||
      row.Clasificacion === "Sin Clasificación"
    )
  }

  const editableFields: (keyof DebugDataRow)[] = ["Tipo", "Categoria 1", "Sub categoria", "Clasificacion", "Planta"]

  const handleSaveChanges = () => {
    onSaveChanges(localData)
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Verificación y Edición de Datos Procesados</DialogTitle>
        </DialogHeader>
        <div className="grow overflow-auto border rounded-md">
          <Table className="min-w-full table-fixed">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {columnKeys.map((key) => (
                  <TableHead key={key} className={`px-2 py-2 text-xs ${columnWidths[key]}`}>
                    {key}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {localData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnKeys.length} className="h-24 text-center">
                    No hay datos para mostrar. Cargue un archivo Excel.
                  </TableCell>
                </TableRow>
              ) : (
                localData.map((row, index) => (
                  <TableRow key={index} className={`${needsHighlight(row) ? "bg-yellow-100" : ""}`}>
                    {columnKeys.map((key) => (
                      <TableCell
                        key={key}
                        className={`px-1 py-1 text-xs border-r last:border-r-0 ${columnWidths[key]}`}
                      >
                        {editableFields.includes(key) ? (
                          // Dropdown for Tipo
                          key === "Tipo" ? (
                            <Select
                              value={String(row[key] ?? "")}
                              onValueChange={(value) => handleFieldChange(index, key, value)}
                            >
                              <SelectTrigger className="h-6 px-1 py-0 text-xs w-full">
                                <SelectValue placeholder="Seleccionar Tipo..." />
                              </SelectTrigger>
                              <SelectContent>
                                {TIPOS.map((tipo) => (
                                  <SelectItem key={tipo} value={tipo} className="text-xs">
                                    {tipo}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : // Dropdown for Planta
                          key === "Planta" ? (
                            <Select
                              value={String(row[key] ?? "")}
                              onValueChange={(value) => handleFieldChange(index, key, value)}
                            >
                              <SelectTrigger className="h-6 px-1 py-0 text-xs w-full">
                                <SelectValue placeholder="Seleccionar Planta..." />
                              </SelectTrigger>
                              <SelectContent>
                                {ALL_PLANTS_OPTIONS.map((planta) => (
                                  <SelectItem key={planta} value={planta} className="text-xs">
                                    {planta}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : // Dropdown for Categoria 1
                          key === "Categoria 1" ? (
                            <Select
                              value={String(row[key] ?? "")}
                              onValueChange={(value) => handleFieldChange(index, key, value)}
                            >
                              <SelectTrigger className="h-6 px-1 py-0 text-xs w-full">
                                <SelectValue placeholder="Seleccionar Cat 1..." />
                              </SelectTrigger>
                              <SelectContent>
                                {uniqueCategoria1.map((cat) => (
                                  <SelectItem key={cat} value={cat} className="text-xs">
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : // Dropdown for Sub categoria
                          key === "Sub categoria" ? (
                            <Select
                              value={String(row[key] ?? "")}
                              onValueChange={(value) => handleFieldChange(index, key, value)}
                            >
                              <SelectTrigger className="h-6 px-1 py-0 text-xs w-full">
                                <SelectValue placeholder="Seleccionar Sub Cat..." />
                              </SelectTrigger>
                              <SelectContent>
                                {uniqueSubCategoria.map((sub) => (
                                  <SelectItem key={sub} value={sub} className="text-xs">
                                    {sub}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : // Dropdown for Clasificacion
                          key === "Clasificacion" ? (
                            <Select
                              value={String(row[key] ?? "")}
                              onValueChange={(value) => handleFieldChange(index, key, value)}
                            >
                              <SelectTrigger className="h-6 px-1 py-0 text-xs w-full">
                                <SelectValue placeholder="Seleccionar Clasif..." />
                              </SelectTrigger>
                              <SelectContent>
                                {uniqueClasificacion.map((clas) => (
                                  <SelectItem key={clas} value={clas} className="text-xs">
                                    {clas}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            // Fallback for any other editable field (shouldn't happen with current setup)
                            <Input
                              type="text"
                              value={String(row[key] ?? "")}
                              onChange={(e) => handleFieldChange(index, key, e.target.value)}
                              className="h-6 px-1 py-0 text-xs w-full"
                            />
                          )
                        ) : // Display non-editable fields
                        (key === "Cargos" || key === "Abonos" || key === "Monto") && typeof row[key] === "number" ? (
                          row[key]?.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        ) : (
                          String(row[key] ?? "")
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter className="flex justify-between mt-4">
          <div className="text-sm text-gray-500">{hasChanges ? "Hay cambios sin guardar" : "No hay cambios"}</div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline">
              Cancelar
            </Button>
            <Button
              onClick={handleSaveChanges}
              variant="default"
              className="bg-green-700 hover:bg-green-800"
              disabled={!hasChanges}
            >
              Guardar Cambios
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DebugModal
