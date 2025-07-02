import type { DebugDataRow } from "./excel-processor"

// Save data to localStorage
export const saveData = (data: DebugDataRow[]): void => {
  try {
    localStorage.setItem("financialData", JSON.stringify(data))
  } catch (error) {
    console.error("Error saving data to localStorage:", error)
  }
}

// Load data from localStorage
export const loadData = (): DebugDataRow[] | null => {
  try {
    const savedData = localStorage.getItem("financialData")
    if (savedData) {
      return JSON.parse(savedData) as DebugDataRow[]
    }
    return null
  } catch (error) {
    console.error("Error loading data from localStorage:", error)
    return null
  }
}

// Export data to JSON file
export const exportDataToJson = (data: DebugDataRow[]): void => {
  try {
    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "financial_data.json"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Error exporting data to JSON:", error)
  }
}
