import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { codigo, concepto, reportId, referenceDate } = await request.json()
    
    if (!codigo || !concepto || !reportId) {
      return NextResponse.json({ 
        error: 'Account code, concepto, and report ID are required' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Parse account structure
    const familyCode = codigo.substring(0, 9)
    const hierarchyLevel = getHierarchyLevel(codigo)
    
    // Get family context
    const { data: familyAccounts, error: familyError } = await supabase
      .from('financial_data')
      .select('codigo, concepto, monto, tipo, categoria_1, sub_categoria, clasificacion')
      .eq('report_id', reportId)
      .ilike('codigo', `${familyCode}%`)
      .not('codigo', 'is', null)

    if (familyError) {
      console.error('Error getting family context:', familyError)
      return NextResponse.json({ error: 'Failed to get family context' }, { status: 500 })
    }

    // Process family context
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
    const completeness = siblings.length > 0 ? (classifiedSiblings.length / siblings.length) * 100 : 0

    // Try to find dominant classification pattern
    let dominantClassification = null
    if (classifiedSiblings.length > 0) {
      const patternCounts = new Map()
      classifiedSiblings.forEach(sibling => {
        const key = sibling.clasificacion
        patternCounts.set(key, (patternCounts.get(key) || 0) + 1)
      })
      
      let maxCount = 0
      let dominantPattern = null
      for (const [pattern, count] of patternCounts) {
        if (count > maxCount) {
          maxCount = count
          dominantPattern = pattern
        }
      }

      if (maxCount >= Math.ceil(classifiedSiblings.length * 0.6)) {
        const example = classifiedSiblings.find(s => s.clasificacion === dominantPattern)
        if (example) {
          dominantClassification = {
            tipo: 'Egresos', // Default for now
            categoria_1: 'Sin Categoría', // Default for now
            sub_categoria: 'Sin Subcategoría', // Default for now
            clasificacion: dominantPattern || 'Sin Clasificación'
          }
        }
      }
    }

    // Create family context
    const familyContext = {
      family_code: familyCode,
      family_name: generateFamilyName(familyAccounts || []),
      hierarchy_level: hierarchyLevel,
      siblings,
      classified_siblings: classifiedSiblings.length,
      total_siblings: siblings.length,
      completeness_percentage: completeness,
      recommended_approach: siblings.length > 15 ? 'SUMMARY_CLASSIFICATION' : 'DETAIL_CLASSIFICATION',
      has_mixed_siblings: classifiedSiblings.length > 0 && classifiedSiblings.length < siblings.length,
      missing_amount: siblings.filter(s => s.classification_status === 'UNCLASSIFIED')
        .reduce((sum, s) => sum + s.amount, 0)
    }

    // Create smart classification result
    const result = {
      classification: dominantClassification || {
        tipo: 'Indefinido',
        categoria_1: 'Sin Categoría',
        sub_categoria: 'Sin Subcategoría',
        clasificacion: 'Sin Clasificación'
      },
      source: dominantClassification ? 'sibling_pattern' : 'unclassified',
      confidence: dominantClassification ? 0.85 : 0.0,
      reasoning: dominantClassification 
        ? `${classifiedSiblings.length} of ${siblings.length} sibling accounts use this classification pattern.`
        : `Manual classification required. Family is ${completeness.toFixed(1)}% complete.`,
      family_rule: dominantClassification 
        ? 'Sibling consistency rule applied - accounts at same hierarchy level should follow consistent classification patterns'
        : 'No automatic pattern detected - manual classification needed',
      family_context: familyContext
    }

    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Classification with context error:', error)
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