import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { reportId } = await request.json()
    
    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get all financial data for the report
    const { data: financialData, error } = await supabase
      .from('financial_data')
      .select('*')
      .eq('report_id', reportId)
      .not('codigo', 'is', null)
      .not('monto', 'is', null)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 })
    }

    // Group by family code and perform validation
    const familyGroups = new Map()
    
    for (const row of financialData || []) {
      const familyCode = getFamilyCode(row.codigo)
      const hierarchyLevel = getHierarchyLevel(row.codigo)
      const parentCode = getParentCode(row.codigo)
      
      const accountInfo = {
        codigo: row.codigo,
        concepto: row.concepto || '',
        amount: row.monto || 0,
        classification_status: getClassificationStatus(row),
        tipo: row.tipo,
        categoria_1: row.categoria_1,
        sub_categoria: row.sub_categoria,
        clasificacion: row.clasificacion,
        hierarchy_level: hierarchyLevel,
        family_code: familyCode,
        parent_code: parentCode
      }
      
      if (!familyGroups.has(familyCode)) {
        familyGroups.set(familyCode, [])
      }
      familyGroups.get(familyCode).push(accountInfo)
    }
    
    // Validate each family
    const validationResults = []
    
    for (const [familyCode, accounts] of familyGroups) {
      const family = {
        family_code: familyCode,
        family_name: generateFamilyName(accounts),
        total_amount: accounts.reduce((sum: number, acc: any) => sum + acc.amount, 0),
        level1_accounts: accounts.filter((acc: any) => acc.hierarchy_level === 1),
        level2_accounts: accounts.filter((acc: any) => acc.hierarchy_level === 2),
        level3_accounts: accounts.filter((acc: any) => acc.hierarchy_level === 3),
        level4_accounts: accounts.filter((acc: any) => acc.hierarchy_level === 4)
      }
      
      const familyResult = await validateSingleFamily(family)
      if (familyResult.hasIssues) {
        validationResults.push(familyResult)
      }
    }
    
    // Sort by financial impact
    validationResults.sort((a, b) => b.financial_impact - a.financial_impact)
    
    return NextResponse.json({ validationResults })
    
  } catch (error) {
    console.error('Family validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function getFamilyCode(accountCode: string): string {
  return accountCode.substring(0, 9) // XXXX-YYYY
}

function getHierarchyLevel(accountCode: string): number {
  // Correct hierarchy detection: 000 patterns indicate parent levels
  // XXXX-0000-000-000 = Level 1 (main category)
  if (accountCode.substring(5, 15) === '0000-000-000') return 1
  
  // XXXX-YYYY-000-000 = Level 2 (subcategory)  
  if (accountCode.substring(10, 15) === '000-000') return 2
  
  // XXXX-YYYY-ZZZ-000 = Level 3 (summary account)
  if (accountCode.substring(14, 17) === '000') return 3
  
  // XXXX-YYYY-ZZZ-001, XXXX-YYYY-ZZZ-002, etc. = Level 4 (detail accounts)
  return 4
}

function getParentCode(accountCode: string): string | undefined {
  const level = getHierarchyLevel(accountCode)
  
  switch (level) {
    case 4:
      // For detail accounts, parent is same but with 000 at the end
      return accountCode.substring(0, 14) + '000'
    case 3:
      // For summary accounts, parent is at level 2
      return accountCode.substring(0, 10) + '000-000'
    case 2:
      // For subcategories, parent is at level 1
      return accountCode.substring(0, 4) + '-0000-000-000'
    default:
      return undefined
  }
}

function isParentAccount(accountCode: string): boolean {
  // Check if this is a parent account (ends with 000)
  return accountCode.endsWith('-000')
}

function getDirectChildren(parentCode: string, allAccounts: any[]): any[] {
  // Get accounts that are direct children of this parent
  const parentLevel = getHierarchyLevel(parentCode)
  const parentPrefix = parentCode.substring(0, parentCode.length - 3) // Remove the '000'
  
  return allAccounts.filter(account => {
    const accountLevel = getHierarchyLevel(account.codigo)
    return accountLevel === parentLevel + 1 && 
           account.codigo.startsWith(parentPrefix) &&
           account.codigo !== parentCode
  })
}

function getClassificationStatus(row: any): 'CLASSIFIED' | 'UNCLASSIFIED' | 'IMPLICITLY_CLASSIFIED' {
  if (row.tipo && row.tipo !== 'Indefinido' && 
      row.categoria_1 && row.categoria_1 !== 'Sin Categoría' &&
      row.clasificacion && row.clasificacion !== 'Sin Clasificación') {
    return 'CLASSIFIED'
  }
  return 'UNCLASSIFIED'
}

function generateFamilyName(accounts: any[]): string {
  const level2Account = accounts.find(acc => getHierarchyLevel(acc.codigo) === 2)
  if (level2Account) {
    return level2Account.concepto
  }
  
  const level1Account = accounts.find(acc => getHierarchyLevel(acc.codigo) === 1)
  if (level1Account) {
    return level1Account.concepto
  }
  
  return accounts[0]?.concepto || 'Unknown Family'
}

async function validateSingleFamily(family: any) {
  const issues = []
  const allFamilyAccounts = [...family.level1_accounts, ...family.level2_accounts, ...family.level3_accounts, ...family.level4_accounts]
  
  // Level 4: Validate sibling consistency
  const level4Issues = validateLevel4Siblings(family.level4_accounts, allFamilyAccounts)
  issues.push(...level4Issues)
  
  // Level 3: Check for over-classification
  const level3Issues = validateLevel3Conflicts(family.level3_accounts, family.level4_accounts)
  issues.push(...level3Issues)
  
  return {
    family_code: family.family_code,
    family_name: family.family_name,
    total_amount: family.total_amount,
    hasIssues: issues.length > 0,
    issues: issues,
    financial_impact: issues.reduce((sum, issue) => sum + issue.financial_impact, 0),
    optimal_approach: determineOptimalApproach(family)
  }
}

function validateLevel4Siblings(level4Accounts: any[], allFamilyAccounts: any[]) {
  const issues = []
  const siblingGroups = new Map()
  
  level4Accounts.forEach(account => {
    const parentCode = account.parent_code || 'ROOT'
    if (!siblingGroups.has(parentCode)) {
      siblingGroups.set(parentCode, [])
    }
    siblingGroups.get(parentCode).push(account)
  })
  
  for (const [parentCode, siblings] of siblingGroups) {
    const classified = siblings.filter((s: any) => s.classification_status === 'CLASSIFIED')
    const unclassified = siblings.filter((s: any) => s.classification_status === 'UNCLASSIFIED')
    
    if (classified.length > 0 && unclassified.length > 0) {
      // Find parent account to compare amounts
      const parentAccount = allFamilyAccounts.find(acc => acc.codigo === parentCode)
      const parentAmount = parentAccount ? Math.abs(parentAccount.amount) : 0
      
      // Calculate total sibling amounts
      const totalSiblingAmount = siblings.reduce((sum: number, acc: any) => sum + Math.abs(acc.amount), 0)
      const classifiedAmount = classified.reduce((sum: number, acc: any) => sum + Math.abs(acc.amount), 0)
      const unclassifiedAmount = unclassified.reduce((sum: number, acc: any) => sum + Math.abs(acc.amount), 0)
      
      // Financial impact is the difference between parent and classified children
      // This represents what's missing from classification
      const financialImpact = parentAmount > 0 ? Math.abs(parentAmount - classifiedAmount) : unclassifiedAmount
      const completionPercentage = (classified.length / siblings.length) * 100
      const missingPercentage = parentAmount > 0 ? (financialImpact / parentAmount) * 100 : 0
      
      issues.push({
        error_id: `MIXED_LEVEL4_${parentCode}`,
        error_type: 'MIXED_LEVEL4_SIBLINGS',
        severity: calculateSeverity(financialImpact),
        parent_account: parentAccount || { codigo: parentCode, concepto: '', amount: 0 },
        classified_children: classified,
        unclassified_children: unclassified,
        financial_impact: financialImpact,
        parent_amount: parentAmount,
        classified_amount: classifiedAmount,
        unclassified_amount: unclassifiedAmount,
        completeness_percentage: completionPercentage,
        missing_percentage: missingPercentage,
        error_message: `Clasificación mixta de hermanos Nivel 4 en ${parentCode}: ${classified.length} de ${siblings.length} cuentas detalle están clasificadas.`,
        business_impact: `${formatCurrency(financialImpact)} (${missingPercentage.toFixed(1)}% del total jerárquico de ${formatCurrency(parentAmount)}) no coincide con el total del padre.`,
        actionable_resolution: [
          `RECOMENDADO: Clasificar las ${unclassified.length} cuentas detalle faltantes para completar ${formatCurrency(unclassifiedAmount)}`,
          `Total Jerárquico del Padre: ${formatCurrency(parentAmount)}`,
          `Total Clasificado Actual: ${formatCurrency(classifiedAmount)}`,
          `Diferencia por Clasificar: ${formatCurrency(financialImpact)}`,
          `ALTERNATIVA: Desclasificar todas las ${classified.length} cuentas detalle y clasificar el padre ${parentCode}`
        ],
        auto_fix_possible: unclassified.length <= 2,
        priority_rank: calculatePriority(financialImpact, missingPercentage)
      })
    }
  }
  
  return issues
}

function validateLevel3Conflicts(level3Accounts: any[], level4Accounts: any[]) {
  const issues = []
  const implicitlyClassifiedLevel3 = new Set()
  
  // Group Level 4 by parent
  const level4Groups = new Map()
  level4Accounts.forEach(acc => {
    const parentCode = acc.parent_code
    if (parentCode) {
      if (!level4Groups.has(parentCode)) {
        level4Groups.set(parentCode, [])
      }
      level4Groups.get(parentCode).push(acc)
    }
  })
  
  for (const [parentCode, children] of level4Groups) {
    const allChildrenClassified = children.every((child: any) => child.classification_status === 'CLASSIFIED')
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
      
      const childrenAmount = relatedLevel4.reduce((sum: any, acc: any) => sum + Math.abs(acc.amount), 0)
      const parentAmount = Math.abs(level3Account.amount)
      const overClassificationImpact = Math.min(parentAmount, childrenAmount)
      
      issues.push({
        error_id: `OVER_CLASSIFICATION_${level3Account.codigo}`,
        error_type: 'OVER_CLASSIFICATION',
        severity: 'CRITICAL',
        parent_account: level3Account,
        classified_children: relatedLevel4,
        financial_impact: overClassificationImpact,
        error_message: `Sobre-clasificación detectada: ${level3Account.concepto} está clasificado directamente Y tiene hijos Nivel 4 clasificados.`,
        business_impact: `${formatCurrency(overClassificationImpact)} será contado doble en reportes financieros. Padre: ${formatCurrency(parentAmount)}, Hijos: ${formatCurrency(childrenAmount)}.`,
        actionable_resolution: [
          'CRÍTICO: Elegir un solo nivel de clasificación para prevenir doble conteo',
          'RECOMENDADO: Mantener clasificaciones detalladas Nivel 4 y remover clasificación directa Nivel 3'
        ],
        auto_fix_possible: true,
        priority_rank: 1
      })
    }
  }
  
  return issues
}

function calculateSeverity(amount: number, missingPercentage?: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  // Consider both absolute amount and percentage of parent
  if (amount >= 1000000 || (missingPercentage && missingPercentage > 50)) return 'CRITICAL'
  if (amount >= 500000 || (missingPercentage && missingPercentage > 25)) return 'HIGH'
  if (amount >= 100000 || (missingPercentage && missingPercentage > 10)) return 'MEDIUM'
  return 'LOW'
}

function calculatePriority(amount: number, missingPercentage?: number): number {
  // Prioritize by both amount and percentage impact
  if (amount >= 5000000 || (missingPercentage && missingPercentage > 75)) return 1
  if (amount >= 1000000 || (missingPercentage && missingPercentage > 50)) return 2
  if (amount >= 500000 || (missingPercentage && missingPercentage > 25)) return 3
  if (amount >= 100000 || (missingPercentage && missingPercentage > 10)) return 4
  return 5
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.abs(amount))
}

function determineOptimalApproach(family: any) {
  const level4Classified = family.level4_accounts.filter((acc: any) => acc.classification_status === 'CLASSIFIED').length
  const level3Classified = family.level3_accounts.filter((acc: any) => acc.classification_status === 'CLASSIFIED').length
  const totalLevel4 = family.level4_accounts.length
  const totalLevel3 = family.level3_accounts.length
  
  if (level4Classified > 0 && level4Classified > level3Classified) {
    return {
      recommended_approach: 'DETAIL_CLASSIFICATION',
      current_completeness: (level4Classified / totalLevel4) * 100,
      reasoning: `La familia está ${((level4Classified / totalLevel4) * 100).toFixed(1)}% completa con clasificación detallada.`,
      specific_actions: [`Completar clasificación de las ${totalLevel4 - level4Classified} cuentas detalle Nivel 4 restantes`],
      business_benefits: [
        'Análisis granular de costos por cuenta específica',
        'Mayor precisión en identificación de oportunidades de ahorro',
        'Trazabilidad completa de movimientos financieros'
      ]
    }
  } else if (level3Classified > 0) {
    return {
      recommended_approach: 'SUMMARY_CLASSIFICATION',
      current_completeness: (level3Classified / totalLevel3) * 100,
      reasoning: `La familia está ${((level3Classified / totalLevel3) * 100).toFixed(1)}% completa con clasificación resumen.`,
      specific_actions: [`Completar clasificación de las ${totalLevel3 - level3Classified} cuentas resumen Nivel 3 restantes`],
      business_benefits: [
        'Visión consolidada de categorías principales',
        'Reportes ejecutivos más claros',
        'Menor esfuerzo de mantenimiento de clasificaciones'
      ]
    }
  } else {
    return {
      recommended_approach: totalLevel4 > 15 ? 'SUMMARY_CLASSIFICATION' : 'DETAIL_CLASSIFICATION',
      current_completeness: 0,
      reasoning: `La familia tiene ${totalLevel4} cuentas Nivel 4. ${totalLevel4 > 15 ? 'Se recomienda clasificación resumen por complejidad.' : 'Se recomienda clasificación detallada por simplicidad.'}`,
      specific_actions: [
        totalLevel4 > 15 
          ? 'Iniciar con clasificación resumen en Nivel 3 para familias complejas'
          : 'Iniciar con clasificación detallada en Nivel 4 para familias simples'
      ],
      business_benefits: [
        'Enfoque estratégico basado en complejidad de la familia',
        'Optimización del esfuerzo de clasificación',
        'Mejor relación costo-beneficio en análisis'
      ]
    }
  }
} 