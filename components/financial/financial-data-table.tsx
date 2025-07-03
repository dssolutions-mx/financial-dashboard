"use client"

import React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"

interface FinancialDataTableProps {
  matrixData: Record<string, any>
  selectedUnits: string[]
  onUnitChange: (units: string[]) => void
  expandedRows: Set<string>
  onRowToggle: (rowId: string) => void
  volumenes: Record<string, Record<string, number>>
  onVolumeChange: (categoria: string, planta: string, value: number) => void
  showUnitPriceView: boolean
  getVisiblePlants: () => string[]
  shouldUseCombinedVolume: (clasificacion: string) => boolean
  getVolumeForUnitCost: (planta: string, clasificacion: string) => number
  getTotalVolume: (categoria: string, visiblePlants: string[]) => number
  getTotalCombinedVolume: (visiblePlants: string[]) => number
}

// Unit options
const ALL_UNITS = ["BAJIO", "VIADUCTO", "ITISA", "OTROS"]

// Helper function to format currency
const formatMoney = (amount: number, isTotal = false): string => {
  if (isTotal) {
    const absAmount = Math.abs(amount)
    if (absAmount >= 1000000) {
      const millones = absAmount / 1000000
      return `${amount < 0 ? '-' : ''}$${millones.toFixed(1)}M`
    } else if (absAmount >= 1000) {
      const miles = absAmount / 1000
      return `${amount < 0 ? '-' : ''}$${miles.toFixed(0)}K`
    }
  }
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Helper function to format unit price
const formatUnitPrice = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function FinancialDataTable({
  matrixData,
  selectedUnits,
  onUnitChange,
  expandedRows,
  onRowToggle,
  volumenes,
  onVolumeChange,
  showUnitPriceView,
  getVisiblePlants,
  shouldUseCombinedVolume,
  getVolumeForUnitCost,
  getTotalVolume,
  getTotalCombinedVolume
}: FinancialDataTableProps) {
  
  const visiblePlants = getVisiblePlants()

  const handleUnitToggle = (unit: string) => {
    if (unit === "ALL") {
      if (selectedUnits.includes("ALL")) {
        onUnitChange([])
      } else {
        onUnitChange(["ALL"])
      }
    } else {
      const newUnits = selectedUnits.includes("ALL") 
        ? [unit]
        : selectedUnits.includes(unit)
          ? selectedUnits.filter(u => u !== unit)
          : [...selectedUnits.filter(u => u !== "ALL"), unit]
      onUnitChange(newUnits)
    }
  }

  const renderVolumeInput = (categoria: string, planta: string) => {
    if (!categoria.includes("Ventas")) return null

    return (
      <div className="mt-1">
        <Input
          type="number"
          value={volumenes[categoria]?.[planta] || 0}
          onChange={(e) => onVolumeChange(categoria, planta, parseFloat(e.target.value) || 0)}
          className="h-6 text-xs w-20"
          step="0.01"
          min="0"
        />
        <div className="text-xs text-gray-500 mt-1">m³</div>
      </div>
    )
  }

  const renderTableCell = (categoria: string, clasificacion: string, planta: string, monto: number) => {
    if (showUnitPriceView && monto !== 0) {
      const volume = getVolumeForUnitCost(planta, clasificacion)
      const unitCost = volume > 0 ? monto / volume : 0

      return (
        <div className="text-right">
          <div className="font-medium">{formatUnitPrice(unitCost)}</div>
          <div className="text-xs text-gray-500">({formatMoney(monto)})</div>
        </div>
      )
    }

    return <div className="text-right">{formatMoney(monto)}</div>
  }

  const renderTotalCell = (categoria: string, clasificacion: string, totalMonto: number) => {
    if (showUnitPriceView && totalMonto !== 0) {
      const totalVolume = shouldUseCombinedVolume(clasificacion)
        ? getTotalCombinedVolume(visiblePlants)
        : getTotalVolume("Ventas Concreto", visiblePlants)
      
      const avgUnitCost = totalVolume > 0 ? totalMonto / totalVolume : 0

      return (
        <div className="text-right font-semibold">
          <div>{formatUnitPrice(avgUnitCost)}</div>
          <div className="text-xs text-gray-500">({formatMoney(totalMonto, true)})</div>
        </div>
      )
    }

    return <div className="text-right font-semibold">{formatMoney(totalMonto, true)}</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-x-auto w-full">
      {/* Unit Filter */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filtrar por Unidad de Negocio:</h3>
        <div className="flex flex-wrap gap-2">
          {["ALL", ...ALL_UNITS].map((unit) => (
            <button
              key={unit}
              onClick={() => handleUnitToggle(unit)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                selectedUnits.includes(unit)
                  ? "bg-green-600 text-white border-green-600 shadow-sm"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              {unit === "ALL" ? "Todas las Unidades" : unit}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <table className="w-full min-w-[1400px] lg:min-w-0 border-collapse text-xs">
        <thead>
          <tr className="bg-green-800 text-white sticky top-0 z-10">
            <th className="px-3 py-2 text-left border-b border-gray-200 sticky left-0 bg-green-800 z-20">
              Hierarquía
            </th>
            {visiblePlants.map((planta) => (
              <th key={planta} className="px-3 py-2 text-right border-b border-gray-200 whitespace-nowrap">
                {planta}
              </th>
            ))}
            <th className="px-3 py-2 text-right border-b border-gray-200 whitespace-nowrap">
              Total
            </th>
          </tr>
        </thead>
        
        <tbody>
          {Object.entries(matrixData).map(([categoria, categoriaData]) => {
            const isExpanded = expandedRows.has(categoria)
            
            return (
              <React.Fragment key={categoria}>
                {/* Category Header Row */}
                <tr 
                  className="bg-gray-100 hover:bg-gray-200 cursor-pointer border-b border-gray-200"
                  onClick={() => onRowToggle(categoria)}
                >
                  <td className="px-3 py-2 font-semibold text-gray-800 sticky left-0 bg-gray-100 z-10">
                    <div className="flex items-center">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span className="ml-2">{categoria}</span>
                    </div>
                  </td>
                  
                  {visiblePlants.map((planta) => {
                    const totalMonto = categoriaData.total?.[planta] || 0
                    return (
                      <td key={planta} className="px-3 py-2 font-semibold text-gray-800">
                        <div className="text-right">{formatMoney(totalMonto, true)}</div>
                        {renderVolumeInput(categoria, planta)}
                      </td>
                    )
                  })}
                  
                  <td className="px-3 py-2 font-semibold text-gray-800">
                    <div className="text-right">
                      {formatMoney(categoriaData.grandTotal || 0, true)}
                    </div>
                  </td>
                </tr>

                {/* Subcategory Rows */}
                {isExpanded && Object.entries(categoriaData.subCategorias || {}).map(([clasificacion, clasificacionData]) => (
                  <tr key={`${categoria}-${clasificacion}`} className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-700 pl-8 sticky left-0 bg-white z-10">
                      {clasificacion}
                    </td>
                    
                    {visiblePlants.map((planta) => {
                      const monto = (clasificacionData as any)?.[planta] || 0
                      return (
                        <td key={planta} className="px-3 py-2 text-gray-700">
                          {renderTableCell(categoria, clasificacion, planta, monto)}
                        </td>
                      )
                    })}
                    
                    <td className="px-3 py-2 text-gray-700">
                      {renderTotalCell(categoria, clasificacion, (clasificacionData as any)?.total || 0)}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
} 