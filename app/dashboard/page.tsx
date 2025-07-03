"use client"

import React, { useState } from "react"
import FinancialDashboard from "@/components/financial-dashboard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DebugDataRow } from "@/lib/excel-processor"

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