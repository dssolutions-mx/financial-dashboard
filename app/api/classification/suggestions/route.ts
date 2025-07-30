import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { accountCode, concepto, reportId } = await request.json()
    
    if (!accountCode || !concepto || !reportId) {
      return NextResponse.json({ 
        error: 'Account code, concepto, and report ID are required' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Parse account structure
    const familyCode = accountCode.substring(0, 9)
    const hierarchyLevel = getHierarchyLevel(accountCode)
    
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

    const suggestions = []

    // 1. Sibling Pattern Suggestion
    const siblings = (familyAccounts || [])
      .filter(acc => getHierarchyLevel(acc.codigo) === hierarchyLevel)
      .filter(acc => acc.codigo !== accountCode)

    const classifiedSiblings = siblings.filter(acc => getClassificationStatus(acc) === 'CLASSIFIED')

    if (classifiedSiblings.length > 0) {
      // Find dominant pattern
      const patternCounts = new Map()
      classifiedSiblings.forEach(sibling => {
        const key = `${sibling.tipo}|${sibling.categoria_1}|${sibling.sub_categoria}|${sibling.clasificacion}`
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
        const [tipo, categoria_1, sub_categoria, clasificacion] = dominantPattern.split('|')
        const confidence = (maxCount / classifiedSiblings.length) * 100

        suggestions.push({
          type: 'SIBLING_PATTERN',
          confidence: Math.round(confidence),
          reasoning: `${maxCount} of ${classifiedSiblings.length} sibling accounts use this classification pattern.`,
          family_rule: 'Sibling consistency rule - accounts at same hierarchy level should follow consistent patterns',
          classification: {
            tipo: tipo || 'Egresos',
            categoria_1: categoria_1 || 'Sin Categoría',
            sub_categoria: sub_categoria || 'Sin Subcategoría', 
            clasificacion: clasificacion || 'Sin Clasificación'
          }
        })
      }
    }

    // 2. Historical Pattern Suggestion
    const { data: historicalMatches, error: histError } = await supabase
      .from('classification_rules')
      .select('*')
      .or(`account_code.eq.${accountCode},account_name.ilike.%${concepto.substring(0, 20)}%`)
      .eq('is_active', true)
      .limit(1)

    if (!histError && historicalMatches && historicalMatches.length > 0) {
      const rule = historicalMatches[0]
      suggestions.push({
        type: 'HISTORICAL_PATTERN',
        confidence: rule.account_code === accountCode ? 95 : 70,
        reasoning: rule.account_code === accountCode 
          ? 'Exact account code match found in classification rules'
          : 'Similar account pattern found in classification rules',
        family_rule: 'Historical pattern matching based on previous classifications',
        classification: {
          tipo: rule.tipo,
          categoria_1: rule.categoria_1,
          sub_categoria: rule.sub_categoria,
          clasificacion: rule.clasificacion
        }
      })
    }

    // 3. Parent Inheritance Suggestion
    const parentCode = getParentCode(accountCode)
    if (parentCode) {
      const { data: parentData, error: parentError } = await supabase
        .from('financial_data')
        .select('tipo, categoria_1, sub_categoria, clasificacion')
        .eq('codigo', parentCode)
        .eq('report_id', reportId)
        .single()

      if (!parentError && parentData && getClassificationStatus(parentData) === 'CLASSIFIED') {
        suggestions.push({
          type: 'PARENT_INHERITANCE',
          confidence: 60,
          reasoning: `Inheriting classification from parent account ${parentCode}`,
          family_rule: 'Parent inheritance rule - child accounts can inherit parent classification when appropriate',
          classification: {
            tipo: parentData.tipo,
            categoria_1: parentData.categoria_1,
            sub_categoria: parentData.sub_categoria,
            clasificacion: parentData.clasificacion
          }
        })
      }
    }

    // Sort suggestions by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence)

    return NextResponse.json({ suggestions })
    
  } catch (error) {
    console.error('Classification suggestions error:', error)
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

function getParentCode(accountCode: string): string | undefined {
  const level = getHierarchyLevel(accountCode)
  
  switch (level) {
    case 4:
      return accountCode.substring(0, 14) + '000'
    case 3:
      return accountCode.substring(0, 10) + '000-000'
    case 2:
      return accountCode.substring(0, 4) + '-0000-000-000'
    default:
      return undefined
  }
}

function getClassificationStatus(row: any): 'CLASSIFIED' | 'UNCLASSIFIED' {
  if (row.tipo && row.tipo !== 'Indefinido' && 
      row.categoria_1 && row.categoria_1 !== 'Sin Categoría' &&
      row.clasificacion && row.clasificacion !== 'Sin Clasificación') {
    return 'CLASSIFIED'
  }
  return 'UNCLASSIFIED'
} 