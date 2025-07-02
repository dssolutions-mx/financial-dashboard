"use client"

import { useState, useEffect } from "react"
import FinancialDashboard from "@/components/financial-dashboard"
import type { DebugDataRow } from "@/lib/excel-processor"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  const [data, setData] = useState<DebugDataRow[]>([])

  useEffect(() => {
    // Try to load data from localStorage on initial render
    const savedData = localStorage.getItem("financialData")
    if (savedData) {
      try {
        setData(JSON.parse(savedData))
      } catch (error) {
        console.error("Error parsing saved data:", error)
        // Load default empty data if parsing fails
        setData([])
      }
    }
  }, [])

  const handleDataUpdate = (updatedData: DebugDataRow[]) => {
    setData(updatedData)
    // Save to localStorage for persistence
    localStorage.setItem("financialData", JSON.stringify(updatedData))
  }

  return (
    <main className="min-h-screen">
      <FinancialDashboard initialData={data} onDataUpdate={handleDataUpdate} />
      <Toaster />
    </main>
  )
}
