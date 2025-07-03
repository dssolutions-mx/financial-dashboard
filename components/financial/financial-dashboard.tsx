"use client"

import React from "react"
import { FinancialDashboardMain } from "./financial-dashboard-main"
import { DebugDataRow } from "@/lib/services/excel-processor"

interface FinancialDashboardProps {
  initialData: DebugDataRow[]
  onDataUpdate: (data: DebugDataRow[]) => void
}

/**
 * Financial Dashboard - Main entry point
 * 
 * This component has been restructured to follow better practices:
 * - Split into smaller, focused components
 * - Proper separation of concerns
 * - Better maintainability and testability
 * 
 * Components breakdown:
 * - DashboardHeader: Title, controls, and category filters
 * - FinancialSummaryCards: Summary metrics display
 * - FinancialDataTable: Main data table with filtering and unit price view
 * - Various modals: Debug, validation, report selection
 */
const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ initialData, onDataUpdate }) => {
  return (
    <FinancialDashboardMain 
      initialData={initialData} 
      onDataUpdate={onDataUpdate} 
    />
  )
}

export default FinancialDashboard
