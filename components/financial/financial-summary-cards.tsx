"use client"

import React from "react"
import { Card } from "@/components/ui/card"

interface SummaryData {
  ingresos: number
  egresos: number
  utilidadBruta: number
  porcentajeUtilidad: number
}

interface FinancialSummaryCardsProps {
  summaryData: SummaryData
}

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

export function FinancialSummaryCards({ summaryData }: FinancialSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="p-3 bg-white shadow-xs hover:shadow-md transition-shadow border border-gray-200">
        <h3 className="text-xs text-gray-600">INGRESOS</h3>
        <p className="text-lg font-bold text-gray-800">{formatMoney(summaryData.ingresos, true)}</p>
      </Card>
      
      <Card className="p-3 bg-white shadow-xs hover:shadow-md transition-shadow border border-gray-200">
        <h3 className="text-xs text-gray-600">EGRESOS</h3>
        <p className="text-lg font-bold text-gray-800">{formatMoney(summaryData.egresos, true)}</p>
      </Card>
      
      <Card className="p-3 bg-white shadow-xs hover:shadow-md transition-shadow border border-gray-200">
        <h3 className="text-xs text-gray-600">UTILIDAD BRUTA</h3>
        <p className="text-lg font-bold text-gray-800">{formatMoney(summaryData.utilidadBruta, true)}</p>
      </Card>
      
      <Card className="p-3 bg-white shadow-xs hover:shadow-md transition-shadow border border-gray-200">
        <h3 className="text-xs text-gray-600">% UTILIDAD BRUTA</h3>
        <p className="text-lg font-bold text-gray-800">{summaryData.porcentajeUtilidad.toFixed(2)}%</p>
      </Card>
    </div>
  )
} 