// Enhanced Dynamic Classification System - Phase 2.1
// Family-Aware Classification Engine

import { Database } from '@/lib/types/database.types'

export interface SmartClassificationResult {
  classification: Classification
  source: 'sibling_pattern' | 'parent_inheritance' | 'historical_pattern' | 'unclassified'
  confidence: number
  reasoning: string
  family_rule?: string
  family_context: FamilyContext
}

export interface Classification {
  tipo: string
  categoria_1: string
  sub_categoria: string
  clasificacion: string
  plant_pattern?: string
  priority?: number
  effective_from?: Date
  created_by?: string
}

export interface FamilyContext {
  family_code: string
  family_name: string
  hierarchy_level: number
  siblings: Array<{
    codigo: string
    concepto: string
    amount: number
    classification_status: 'CLASSIFIED' | 'UNCLASSIFIED' | 'IMPLICITLY_CLASSIFIED'
    clasificacion?: string
  }>
  classified_siblings: number
  total_siblings: number
  completeness_percentage: number
  recommended_approach: 'DETAIL_CLASSIFICATION' | 'SUMMARY_CLASSIFICATION' | 'HIGH_LEVEL_CLASSIFICATION'
  has_mixed_siblings: boolean
  missing_amount: number
}

export interface ValidationResult {
  valid: boolean
  error?: string
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  financial_impact?: number
  message?: string
  suggested_action?: string
  business_impact?: string
}

export interface FamilyClassificationImpact {
  family_code: string
  affectedRecords: number
  affectedReports: string[]
  totalFinancialImpact: number
  retroactiveChanges: Array<{
    reportId: string
    accountCode: string
    oldClassification: Classification
    newClassification: Classification
    amount: number
  }>
  estimatedProcessingTime: number
}

export interface ClassificationSuggestion {
  type: string
  confidence: number
  reasoning: string
  family_rule?: string
  classification: Classification
}

export class FamilyAwareClassificationService {
  /**
   * Classify account with full family context awareness and retroactive application
   */
  static async classifyWithFamilyContext(
    codigo: string, 
    concepto: string,
    reportId: string,
    referenceDate: Date
  ): Promise<SmartClassificationResult> {
    try {
      const response = await fetch('/api/classification/classify-with-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          codigo, 
          concepto, 
          reportId, 
          referenceDate: referenceDate.toISOString() 
        }),
      })

      if (!response.ok) {
        throw new Error(`Classification failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Family-aware classification error:', error)
      throw error
    }
  }

  /**
   * Update classification with retroactive application to all historical reports
   */
  static async updateClassificationWithRetroactiveImpact(
    accountCode: string,
    newClassification: Classification,
    effectiveFrom: Date,
    userId: string,
    applyToAllReports: boolean = true
  ): Promise<FamilyClassificationImpact> {
    try {
      const response = await fetch('/api/classification/update-retroactive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountCode,
          newClassification,
          effectiveFrom: effectiveFrom.toISOString(),
          userId,
          applyToAllReports
        }),
      })

      if (!response.ok) {
        throw new Error(`Retroactive update failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Retroactive classification update error:', error)
      throw error
    }
  }

  /**
   * Get family context for an account
   */
  static async getFamilyContext(accountCode: string, reportId: string): Promise<FamilyContext> {
    try {
      const response = await fetch('/api/classification/family-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountCode, reportId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get family context: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Family context error:', error)
      throw error
    }
  }

  /**
   * Prevent over-classification before it happens
   */
  static async validateClassificationBeforeApply(
    accountCode: string,
    proposedClassification: Classification,
    reportId: string
  ): Promise<ValidationResult> {
    try {
      const response = await fetch('/api/classification/validate-before-apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountCode, proposedClassification, reportId }),
      })

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Classification validation error:', error)
      throw error
    }
  }

  /**
   * Get classification suggestions based on family patterns and historical data
   */
  static async getClassificationSuggestions(
    accountCode: string,
    concepto: string,
    reportId: string
  ): Promise<ClassificationSuggestion[]> {
    try {
      const response = await fetch('/api/classification/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountCode, concepto, reportId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get suggestions: ${response.statusText}`)
      }

      const data = await response.json()
      return data.suggestions || []
    } catch (error) {
      console.error('Classification suggestions error:', error)
      return []
    }
  }

  /**
   * Analyze the impact of applying new classification rules across all historical data
   */
  static async analyzeRetroactiveImpact(
    accountCode: string,
    newClassification: Classification
  ): Promise<{
    totalAffectedReports: number
    totalAffectedRecords: number
    estimatedFinancialImpact: number
    oldestAffectedDate: Date
    newestAffectedDate: Date
    affectedFamilies: string[]
  }> {
    try {
      const response = await fetch('/api/classification/analyze-retroactive-impact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountCode, newClassification }),
      })

      if (!response.ok) {
        throw new Error(`Impact analysis failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Retroactive impact analysis error:', error)
      throw error
    }
  }

  /**
   * Get all classification rules for management interface
   */
  static async getAllClassificationRules(): Promise<Array<{
    id: string
    account_code: string
    account_name: string
    tipo: string
    categoria_1: string
    sub_categoria: string
    clasificacion: string
    hierarchy_level: number
    family_code: string
    effective_from: string
    effective_to?: string
    created_by: string
    approved_by?: string
    is_active: boolean
    applies_to_reports: number
    last_modified: string
  }>> {
    try {
      const response = await fetch('/api/classification/rules', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get classification rules: ${response.statusText}`)
      }

      const data = await response.json()
      return data.rules || []
    } catch (error) {
      console.error('Get classification rules error:', error)
      return []
    }
  }

  /**
   * Update a classification rule and apply retroactively
   */
  static async updateClassificationRule(
    ruleId: string,
    updates: Partial<Classification>,
    userId: string,
    applyRetroactively: boolean = true
  ): Promise<FamilyClassificationImpact> {
    try {
      const response = await fetch('/api/classification/update-rule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruleId,
          updates,
          userId,
          applyRetroactively
        }),
      })

      if (!response.ok) {
        throw new Error(`Rule update failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Classification rule update error:', error)
      throw error
    }
  }

  /**
   * Process new Excel file and update existing classifications based on new patterns
   */
  static async processExcelAndUpdateClassifications(
    fileProcessingResult: any,
    userId: string,
    updateExistingRules: boolean = true
  ): Promise<{
    newRulesCreated: number
    existingRulesUpdated: number
    retroactiveUpdatesApplied: number
    totalReportsAffected: number
    processingLog: string[]
  }> {
    try {
      const response = await fetch('/api/classification/process-excel-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileProcessingResult,
          userId,
          updateExistingRules
        }),
      })

      if (!response.ok) {
        throw new Error(`Excel processing failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Excel classification processing error:', error)
      throw error
    }
  }

  /**
   * Get classification history for an account across all reports
   */
  static async getClassificationHistory(accountCode: string): Promise<Array<{
    reportId: string
    reportDate: string
    reportName: string
    amount: number
    classification: Classification
    appliedAt: string
    appliedBy: string
    source: 'manual' | 'excel_import' | 'retroactive_update' | 'family_pattern'
  }>> {
    try {
      const response = await fetch('/api/classification/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountCode }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get classification history: ${response.statusText}`)
      }

      const data = await response.json()
      return data.history || []
    } catch (error) {
      console.error('Classification history error:', error)
      return []
    }
  }

  // Helper methods
  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount))
  }

  private static parseAccountStructure(accountCode: string): {
    level: number
    family_code: string
    parent_code?: string
  } {
    // Parse XXXX-YYYY-ZZZ-WWW structure
    const parts = accountCode.split('-')
    if (parts.length !== 4) {
      throw new Error(`Invalid account code format: ${accountCode}`)
    }

    const [type, division, product, detail] = parts
    let level = 4

    // Determine hierarchy level
    if (detail === '000') {
      level = 3
      if (product === '000') {
        level = 2
        if (division === '0000') {
          level = 1
        }
      }
    }

    const family_code = `${type}-${division}`
    let parent_code: string | undefined

    // Determine parent code
    switch (level) {
      case 4:
        parent_code = `${type}-${division}-${product}-000`
        break
      case 3:
        parent_code = `${type}-${division}-000-000`
        break
      case 2:
        parent_code = `${type}-0000-000-000`
        break
      default:
        parent_code = undefined
    }

    return { level, family_code, parent_code }
  }
} 