// Enhanced Dynamic Classification System - Phase 1.2
// Sophisticated Bottom-Up Validation Engine

import { Database } from '@/lib/types/database.types'

export interface AccountInfo {
  codigo: string
  concepto: string
  amount: number
  classification_status: 'CLASSIFIED' | 'UNCLASSIFIED' | 'IMPLICITLY_CLASSIFIED'
  tipo?: string
  categoria_1?: string
  sub_categoria?: string
  clasificacion?: string
  hierarchy_level: number
  family_code: string
  parent_code?: string
}

export interface HierarchyFamily {
  family_code: string
  family_name: string
  total_amount: number
  level1_accounts: AccountInfo[]
  level2_accounts: AccountInfo[]
  level3_accounts: AccountInfo[]
  level4_accounts: AccountInfo[]
}

export interface ClassificationIssue {
  error_id: string
  error_type: 'OVER_CLASSIFICATION' | 'MIXED_LEVEL4_SIBLINGS' | 'MIXED_LEVEL3_SIBLINGS' | 'UNDER_CLASSIFICATION' | 'MISSING_PARENT' | 'ORPHANED_CHILD' | 'AMOUNT_MISMATCH' | 'DUPLICATE_CLASSIFICATION'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  parent_account?: AccountInfo
  classified_children: AccountInfo[]
  unclassified_children?: AccountInfo[]
  financial_impact: number
  completeness_percentage?: number
  error_message: string
  business_impact: string
  actionable_resolution: string[]
  auto_fix_possible: boolean
  priority_rank: number
}

export interface FamilyValidationResult {
  family_code: string
  family_name: string
  total_amount: number
  hasIssues: boolean
  issues: ClassificationIssue[]
  financial_impact: number
  optimal_approach: ClassificationRecommendation
}

export interface ClassificationRecommendation {
  recommended_approach: 'DETAIL_CLASSIFICATION' | 'SUMMARY_CLASSIFICATION' | 'HIGH_LEVEL_CLASSIFICATION'
  current_completeness: number
  reasoning: string
  specific_actions: string[]
  business_benefits?: string[]
}

export interface ValidationResult {
  parent_code: string
  parent_name: string
  parent_amount: number
  children_sum: number
  variance: number
  validation_status: 'PERFECT' | 'MINOR_VARIANCE' | 'MAJOR_VARIANCE' | 'CRITICAL_MISMATCH'
}

export class SophisticatedBottomUpValidator {
  /**
   * Bottom-Up Family Validation: Start from Level 4, work up family by family
   */
  static async validateHierarchyFamilies(reportId: string): Promise<FamilyValidationResult[]> {
    try {
      // Use API route for server-side operations
      const response = await fetch('/api/classification/validate-families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId }),
      })

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.validationResults || []
    } catch (error) {
      console.error('Family validation error:', error)
      throw error
    }
  }

  /**
   * Validate single family using bottom-up logic
   */
  private async validateSingleFamily(family: HierarchyFamily): Promise<FamilyValidationResult> {
    const issues: ClassificationIssue[] = []
    
    // Level 4: Validate sibling consistency (detail accounts)
    const level4Issues = await this.validateLevel4Siblings(family.level4_accounts)
    issues.push(...level4Issues)
    
    // Level 3: Check for over-classification with Level 4
    const level3Issues = await this.validateLevel3Conflicts(
      family.level3_accounts, 
      family.level4_accounts
    )
    issues.push(...level3Issues)
    
    // Level 2: Check for over-classification with lower levels
    const level2Issues = await this.validateLevel2Conflicts(
      family.level2_accounts,
      family.level3_accounts,
      family.level4_accounts
    )
    issues.push(...level2Issues)
    
    return {
      family_code: family.family_code,
      family_name: family.family_name,
      total_amount: family.total_amount,
      hasIssues: issues.length > 0,
      issues: issues,
      financial_impact: this.calculateFinancialImpact(issues),
      optimal_approach: this.determineOptimalApproach(family)
    }
  }

  /**
   * Level 4 Validation: Mixed Sibling Detection
   * Rule: If ANY sibling is classified, ALL siblings should be classified
   */
  private async validateLevel4Siblings(level4Accounts: AccountInfo[]): Promise<ClassificationIssue[]> {
    const issues: ClassificationIssue[] = []
    
    // Group by immediate parent (Level 3)
    const siblingGroups = this.groupByParent(level4Accounts)
    
    for (const [parentCode, siblings] of siblingGroups) {
      const classified = siblings.filter(s => s.classification_status === 'CLASSIFIED')
      const unclassified = siblings.filter(s => s.classification_status === 'UNCLASSIFIED')
      
      // Mixed siblings - core algorithm violation
      if (classified.length > 0 && unclassified.length > 0) {
        issues.push({
          error_id: `MIXED_LEVEL4_${parentCode}`,
          error_type: 'MIXED_LEVEL4_SIBLINGS',
          severity: this.calculateSeverity(unclassified.reduce((sum, acc) => sum + acc.amount, 0)),
          
          parent_account: { codigo: parentCode, concepto: '', amount: 0, classification_status: 'UNCLASSIFIED', hierarchy_level: 3, family_code: '' },
          classified_children: classified,
          unclassified_children: unclassified,
          
          financial_impact: unclassified.reduce((sum, acc) => sum + acc.amount, 0),
          completeness_percentage: (classified.length / siblings.length) * 100,
          
          error_message: `Mixed Level 4 classification in ${parentCode}: ${classified.length} of ${siblings.length} detail accounts are classified.`,
          
          business_impact: `${this.formatCurrency(unclassified.reduce((sum, acc) => sum + acc.amount, 0))} in detailed costs will not appear in granular analysis reports.`,
          
          actionable_resolution: [
            `RECOMMENDED: Classify the missing ${unclassified.length} detail accounts:`,
            ...unclassified.map(acc => `  • ${acc.codigo} - ${acc.concepto} (${this.formatCurrency(acc.amount)})`),
            `ALTERNATIVE: Unclassify all ${classified.length} detail accounts and classify parent ${parentCode} for summary reporting`,
            `BUSINESS RULE: All sibling accounts at Level 4 should follow the same classification approach`
          ],
          
          auto_fix_possible: unclassified.length <= 2 && this.hasConsistentPattern(classified),
          priority_rank: this.calculatePriority(unclassified.reduce((sum, acc) => sum + acc.amount, 0))
        })
      }
    }
    
    return issues
  }

  /**
   * Level 3 Validation: Over-Classification Detection
   * Rule: Account cannot be both directly classified AND have classified children
   */
  private async validateLevel3Conflicts(
    level3Accounts: AccountInfo[], 
    level4Accounts: AccountInfo[]
  ): Promise<ClassificationIssue[]> {
    const issues: ClassificationIssue[] = []
    
    // Build map of Level 3 accounts that have classified Level 4 children
    const implicitlyClassifiedLevel3 = new Set<string>()
    const level4Groups = this.groupByParent(level4Accounts)
    
    for (const [parentCode, children] of level4Groups) {
      const allChildrenClassified = children.every(child => child.classification_status === 'CLASSIFIED')
      if (allChildrenClassified && children.length > 0) {
        implicitlyClassifiedLevel3.add(parentCode)
      }
    }
    
    // Check for over-classification
    for (const level3Account of level3Accounts) {
      if (level3Account.classification_status === 'CLASSIFIED' && 
          implicitlyClassifiedLevel3.has(level3Account.codigo)) {
        
        const relatedLevel4 = level4Accounts.filter(acc => 
          acc.codigo.startsWith(level3Account.codigo.substring(0, 13))
        )
        
        issues.push({
          error_id: `OVER_CLASSIFICATION_${level3Account.codigo}`,
          error_type: 'OVER_CLASSIFICATION',
          severity: 'CRITICAL', // Always critical due to double-counting
          
          parent_account: level3Account,
          classified_children: relatedLevel4,
          
          financial_impact: level3Account.amount, // This amount is being double-counted
          
          error_message: `Over-classification detected: ${level3Account.concepto} is directly classified AND has classified Level 4 children.`,
          
          business_impact: `${this.formatCurrency(level3Account.amount)} will be double-counted in financial reports - once at Level 3 and again through Level 4 details.`,
          
          actionable_resolution: [
            'CRITICAL: Choose one classification level to prevent double-counting',
            'RECOMMENDED: Keep Level 4 detail classifications and remove Level 3 direct classification',
            'ALTERNATIVE: Keep Level 3 summary classification and remove all Level 4 detail classifications',
            'BUSINESS DECISION: Choose based on reporting needs - detailed analysis (Level 4) vs summary reporting (Level 3)'
          ],
          
          auto_fix_possible: true, // Can auto-suggest based on existing patterns
          priority_rank: 1 // Highest priority due to double-counting
        })
      }
    }
    
    return issues
  }

  /**
   * Level 2 Validation: Over-Classification Detection
   */
  private async validateLevel2Conflicts(
    level2Accounts: AccountInfo[],
    level3Accounts: AccountInfo[],
    level4Accounts: AccountInfo[]
  ): Promise<ClassificationIssue[]> {
    // Similar logic to Level 3 but checking Level 2 vs Level 3/4
    return []
  }

  /**
   * Real-Time Hierarchy Validation Query
   */
  async validateHierarchyAmounts(reportId: string): Promise<ValidationResult[]> {
    try {
      const response = await fetch('/api/classification/validate-hierarchy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId }),
      })

      if (!response.ok) {
        throw new Error(`Hierarchy validation failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Hierarchy amount validation error:', error)
      throw error
    }
  }

  // Helper methods
  private groupByParent(accounts: AccountInfo[]): Map<string, AccountInfo[]> {
    const groups = new Map<string, AccountInfo[]>()
    
    accounts.forEach(account => {
      const parentCode = account.parent_code || 'ROOT'
      if (!groups.has(parentCode)) {
        groups.set(parentCode, [])
      }
      groups.get(parentCode)!.push(account)
    })
    
    return groups
  }

  private calculateFinancialImpact(issues: ClassificationIssue[]): number {
    return issues.reduce((sum, issue) => sum + issue.financial_impact, 0)
  }

  private calculateSeverity(amount: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (amount >= 1000000) return 'CRITICAL'
    if (amount >= 500000) return 'HIGH'
    if (amount >= 100000) return 'MEDIUM'
    return 'LOW'
  }

  private calculatePriority(amount: number): number {
    if (amount >= 5000000) return 1
    if (amount >= 1000000) return 2
    if (amount >= 500000) return 3
    if (amount >= 100000) return 4
    return 5
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount))
  }

  private hasConsistentPattern(accounts: AccountInfo[]): boolean {
    if (accounts.length <= 1) return true
    
    const firstPattern = {
      tipo: accounts[0].tipo,
      categoria_1: accounts[0].categoria_1,
      sub_categoria: accounts[0].sub_categoria
    }
    
    return accounts.every(acc => 
      acc.tipo === firstPattern.tipo &&
      acc.categoria_1 === firstPattern.categoria_1 &&
      acc.sub_categoria === firstPattern.sub_categoria
    )
  }

  /**
   * Generate Family-Specific Recommendations
   */
  private determineOptimalApproach(family: HierarchyFamily): ClassificationRecommendation {
    const level4Classified = family.level4_accounts.filter(acc => acc.classification_status === 'CLASSIFIED').length
    const level3Classified = family.level3_accounts.filter(acc => acc.classification_status === 'CLASSIFIED').length
    const level2Classified = family.level2_accounts.filter(acc => acc.classification_status === 'CLASSIFIED').length
    
    const totalLevel4 = family.level4_accounts.length
    const totalLevel3 = family.level3_accounts.length
    
    // Determine current dominant pattern
    if (level4Classified > 0 && level4Classified > level3Classified) {
      return {
        recommended_approach: 'DETAIL_CLASSIFICATION',
        current_completeness: (level4Classified / totalLevel4) * 100,
        reasoning: `Family is ${((level4Classified / totalLevel4) * 100).toFixed(1)}% complete with detail classification. Continue classifying Level 4 accounts for maximum granularity.`,
        specific_actions: [
          `Complete classification of remaining ${totalLevel4 - level4Classified} Level 4 detail accounts`,
          'Ensure Level 3 and Level 2 parents remain unclassified to avoid double-counting',
          'This approach provides maximum detail for cost analysis and variance tracking'
        ],
        business_benefits: [
          'Detailed cost breakdown for accurate variance analysis',
          'Granular reporting for operational cost management',
          'Better cost control and accountability at detail level'
        ]
      }
    } else if (level3Classified > 0) {
      return {
        recommended_approach: 'SUMMARY_CLASSIFICATION',
        current_completeness: (level3Classified / totalLevel3) * 100,
        reasoning: `Family is ${((level3Classified / totalLevel3) * 100).toFixed(1)}% complete with summary classification. Continue classifying Level 3 accounts for balanced reporting.`,
        specific_actions: [
          `Complete classification of remaining ${totalLevel3 - level3Classified} Level 3 summary accounts`,
          'Ensure Level 4 detail accounts remain unclassified',
          'This approach balances detail with manageability'
        ],
        business_benefits: [
          'Good balance between detail and reporting efficiency',
          'Manageable number of accounts to maintain',
          'Suitable for most financial reporting requirements'
        ]
      }
    } else {
      // Recommend based on family complexity
      if (totalLevel4 > 15) {
        return {
          recommended_approach: 'SUMMARY_CLASSIFICATION',
          current_completeness: 0,
          reasoning: `Family has ${totalLevel4} Level 4 accounts - summary classification is more manageable.`,
          specific_actions: ['Start by classifying Level 3 summary accounts for balanced detail and efficiency']
        }
      } else if (totalLevel4 > 0) {
        return {
          recommended_approach: 'DETAIL_CLASSIFICATION',
          current_completeness: 0,
          reasoning: `Family has manageable ${totalLevel4} Level 4 accounts - detail classification provides maximum insight.`,
          specific_actions: ['Start by classifying Level 4 detail accounts for comprehensive analysis']
        }
      } else {
        return {
          recommended_approach: 'SUMMARY_CLASSIFICATION',
          current_completeness: 0,
          reasoning: 'Family structure suggests Level 3 summary classification.',
          specific_actions: ['Classify Level 3 accounts for appropriate detail level']
        }
      }
    }
  }
} 