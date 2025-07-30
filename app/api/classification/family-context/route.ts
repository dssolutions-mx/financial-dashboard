import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { accountCode, reportId } = await request.json()
    
    if (!accountCode || !reportId) {
      return NextResponse.json({ 
        error: 'Account code and report ID are required' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Parse account structure
    const familyCode = accountCode.substring(0, 9)
    const hierarchyLevel = getHierarchyLevel(accountCode)
    
    // Get all accounts in the same family
    const { data: familyAccounts, error } = await supabase
      .from('financial_data')
      .select('codigo, concepto, monto, tipo, categoria_1, sub_categoria, clasificacion')
      .eq('report_id', reportId)
      .ilike('codigo', `${familyCode}%`)
      .not('codigo', 'is', null)
      .not('monto', 'is', null)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch family context' }, { status: 500 })
    }

    // Process family accounts
    const siblings = (familyAccounts || [])
      .filter(acc => getHierarchyLevel(acc.codigo) === hierarchyLevel)
      .map(acc => ({
        codigo: acc.codigo,
        concepto: acc.concepto || '',
        amount: acc.monto || 0,
        classification_status: getClassificationStatus(acc),
        clasificacion: acc.clasificacion
      }))

    const classifiedSiblings = siblings.filter(s => s.classification_status === 'CLASSIFIED')
    const unclassifiedSiblings = siblings.filter(s => s.classification_status === 'UNCLASSIFIED')
    const completeness = siblings.length > 0 ? (classifiedSiblings.length / siblings.length) * 100 : 0
    const missingAmount = unclassifiedSiblings.reduce((sum, s) => sum + s.amount, 0)

    // Determine family name and recommended approach
    const level2Account = familyAccounts?.find(acc => getHierarchyLevel(acc.codigo) === 2)
    const familyName = level2Account?.concepto || familyAccounts?.[0]?.concepto || 'Unknown Family'

    const recommendedApproach = determineRecommendedApproach(familyAccounts || [], hierarchyLevel)

    const familyContext = {
      family_code: familyCode,
      family_name: familyName,
      hierarchy_level: hierarchyLevel,
      siblings: siblings,
      classified_siblings: classifiedSiblings.length,
      total_siblings: siblings.length,
      completeness_percentage: completeness,
      recommended_approach: recommendedApproach,
      has_mixed_siblings: classifiedSiblings.length > 0 && unclassifiedSiblings.length > 0,
      missing_amount: missingAmount
    }

    return NextResponse.json(familyContext)
    
  } catch (error) {
    console.error('Family context error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function getHierarchyLevel(accountCode: string): number {
  if (accountCode.substring(5, 15) === '0000-000-000') return 1
  if (accountCode.substring(10, 15) === '00-000') return 2
  if (accountCode.substring(14, 15) === '000') return 3
  return 4
}

function getClassificationStatus(row: any): 'CLASSIFIED' | 'UNCLASSIFIED' {
  if (row.tipo && row.tipo !== 'Indefinido' && 
      row.categoria_1 && row.categoria_1 !== 'Sin Categoría' &&
      row.clasificacion && row.clasificacion !== 'Sin Clasificación') {
    return 'CLASSIFIED'
  }
  return 'UNCLASSIFIED'
}

function determineRecommendedApproach(accounts: any[], currentLevel: number): 'DETAIL_CLASSIFICATION' | 'SUMMARY_CLASSIFICATION' | 'HIGH_LEVEL_CLASSIFICATION' {
  const level4Count = accounts.filter(acc => getHierarchyLevel(acc.codigo) === 4).length
  const level3Count = accounts.filter(acc => getHierarchyLevel(acc.codigo) === 3).length
  
  // If we're looking at level 4 accounts and there aren't too many, recommend detail
  if (currentLevel === 4 && level4Count > 0 && level4Count <= 15) {
    return 'DETAIL_CLASSIFICATION'
  }
  
  // If we're looking at level 3 or there are many level 4 accounts, recommend summary
  if (currentLevel === 3 || level4Count > 15) {
    return 'SUMMARY_CLASSIFICATION'
  }
  
  // Default to summary for level 1 and 2
  return currentLevel <= 2 ? 'HIGH_LEVEL_CLASSIFICATION' : 'SUMMARY_CLASSIFICATION'
} 