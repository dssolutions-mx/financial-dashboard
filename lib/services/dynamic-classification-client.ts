import { DebugDataRow } from './excel-processor'
import { ClassificationChange } from './dynamic-classification-manager'

export interface ClassificationSummary {
  totalAccounts: number
  classifiedAccounts: number
  unclassifiedAccounts: number
  totalAmount: number
  classifiedAmount: number
  unclassifiedAmount: number
}

export interface ProcessExcelResult {
  processedData: DebugDataRow[]
  unclassifiedAccounts: Array<{
    codigo: string
    concepto: string
    monto: number
  }>
  classificationSummary: ClassificationSummary
}

export interface CompleteWorkflowResult {
  finalData: DebugDataRow[]
  reportId: string
  summary: ClassificationSummary & {
    newRulesCreated: number
    existingRulesUpdated: number
    rulesUpdatedForFuture: number
    rulesCreatedForFuture: number
  }
}

export class DynamicClassificationClient {
  /**
   * Step 1: Process Excel file with existing classifications
   */
  static async processExcelWithExistingClassifications(
    processedData: DebugDataRow[],
    reportName: string,
    fileName: string,
    month: number,
    year: number
  ): Promise<ProcessExcelResult> {
    try {
      const response = await fetch('/api/classification/process-excel-with-existing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          processedData,
          reportName,
          fileName,
          month,
          year
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to process Excel: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error processing Excel with existing classifications:', error)
      throw error
    }
  }

  /**
   * Complete workflow: Process Excel → Apply Changes → Save → Update Rules
   */
  static async processExcelWithUserChanges(
    processedData: DebugDataRow[],
    userChanges: ClassificationChange[],
    reportName: string,
    fileName: string,
    month: number,
    year: number,
    userId: string
  ): Promise<CompleteWorkflowResult> {
    try {
      const response = await fetch('/api/classification/process-excel-with-changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          processedData,
          userChanges,
          reportName,
          fileName,
          month,
          year,
          userId
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to process Excel with changes: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error processing Excel with user changes:', error)
      throw error
    }
  }

  /**
   * Apply user classification changes only (without saving to database)
   */
  static async applyUserChanges(
    userChanges: ClassificationChange[],
    userId: string
  ): Promise<{
    updatedData: DebugDataRow[]
    newRulesCreated: number
    existingRulesUpdated: number
  }> {
    try {
      const response = await fetch('/api/classification/apply-user-changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userChanges,
          userId
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to apply user changes: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error applying user changes:', error)
      throw error
    }
  }

  /**
   * Save data with updated classifications to database
   */
  static async saveDataWithUpdatedClassifications(
    data: DebugDataRow[],
    reportName: string,
    fileName: string,
    month: number,
    year: number
  ): Promise<{
    reportId: string
    savedRecords: number
    totalAmount: number
  }> {
    try {
      const response = await fetch('/api/classification/save-with-updated-classifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          reportName,
          fileName,
          month,
          year
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to save data: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error saving data with updated classifications:', error)
      throw error
    }
  }

  /**
   * Update classification rules for future Excel files
   */
  static async updateClassificationRulesForFutureUse(
    changes: ClassificationChange[],
    userId: string
  ): Promise<{
    rulesUpdated: number
    rulesCreated: number
    totalImpact: number
  }> {
    try {
      const response = await fetch('/api/classification/update-rules-for-future', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes,
          userId
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update classification rules: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating classification rules for future use:', error)
      throw error
    }
  }
} 