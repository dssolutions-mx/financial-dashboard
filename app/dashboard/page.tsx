"use client"

import React, { useState } from "react"
import FinancialDashboard from "@/components/financial/financial-dashboard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DebugDataRow } from "@/lib/services/excel-processor"

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const [data, setData] = useState<DebugDataRow[]>([])

  const handleDataUpdate = (newData: DebugDataRow[]) => {
    setData(newData)
  }

  return (
    <DashboardLayout>
      <FinancialDashboard 
        initialData={data} 
        onDataUpdate={handleDataUpdate} 
      />
    </DashboardLayout>
  )
} 