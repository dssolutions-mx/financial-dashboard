"use client"

import { useState } from "react"
import FinancialDashboard from "@/components/financial-dashboard"
import type { DebugDataRow } from "@/lib/excel-processor"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  // Initialize with empty data - the dashboard will manage its own data through Supabase
  const [data, setData] = useState<DebugDataRow[]>([])

  const handleDataUpdate = (updatedData: DebugDataRow[]) => {
    setData(updatedData)
    // Optional: Keep localStorage as backup/cache
    localStorage.setItem("financialData", JSON.stringify(updatedData))
  }

  return (
    <main className="min-h-screen">
      <FinancialDashboard initialData={data} onDataUpdate={handleDataUpdate} />
      <Toaster />
    </main>
  )
}
