"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Calculator, Upload, Eye, Database, Download } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"

interface DashboardHeaderProps {
  showUnitPriceView: boolean
  onToggleUnitPriceView: () => void
  onFileUpload: () => void
  onShowReportSelector: () => void
  onDebugModal: () => void
  onExportData: () => void
  selectedCategory: string
  categories: string[]
  onCategoryChange: (category: string) => void
  isProcessing: boolean
}

export function DashboardHeader({
  showUnitPriceView,
  onToggleUnitPriceView,
  onFileUpload,
  onShowReportSelector,
  onDebugModal,
  onExportData,
  selectedCategory,
  categories,
  onCategoryChange,
  isProcessing
}: DashboardHeaderProps) {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-green-800 rounded-md flex items-center justify-center text-white font-bold">
          DC
        </div>
        <h1 className="text-2xl font-bold text-gray-800 whitespace-nowrap">
          REPORTE DE INGRESOS Y EGRESOS
        </h1>
      </div>
      
      <div className="flex items-center gap-4 flex-wrap">
        {/* Category Dropdown */}
        <div className="flex items-center space-x-2 min-w-[180px]">
          <label htmlFor="category-select" className="text-sm text-gray-600 whitespace-nowrap">
            CATEGORÍA 1
          </label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="border rounded px-2 py-1 w-full text-sm"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Unit Price View Toggle */}
        <Button
          variant={showUnitPriceView ? "default" : "outline"}
          size="sm"
          onClick={onToggleUnitPriceView}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            showUnitPriceView 
              ? "bg-blue-600 text-white hover:bg-blue-700" 
              : "border-gray-300 hover:bg-gray-100 text-gray-700"
          }`}
        >
          <Calculator size={14} /> 
          {showUnitPriceView ? "Ver Totales" : "Ver Precio por m³"}
        </Button>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onFileUpload}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border-gray-300 hover:bg-gray-100 text-gray-700"
          >
            <Upload size={14} />
            Subir Archivo
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onShowReportSelector}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border-gray-300 hover:bg-gray-100 text-gray-700"
          >
            <Database size={14} />
            Reportes
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDebugModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border-gray-300 hover:bg-gray-100 text-gray-700"
          >
            <Eye size={14} />
            Datos
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExportData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border-gray-300 hover:bg-gray-100 text-gray-700"
          >
            <Download size={14} />
            Exportar
          </Button>

          <ThemeToggle />
        </div>
      </div>
    </div>
  )
} 