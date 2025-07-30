import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { accountCode, proposedClassification, reportId } = await request.json()
    
    if (!accountCode || !proposedClassification) {
      return NextResponse.json({ 
        error: 'Account code and proposed classification are required' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Parse account structure
    const hierarchyLevel = getHierarchyLevel(accountCode)
    const parentCode = getParentCode(accountCode)
    
    // Check parent classification conflict
    if (parentCode) {
      const { data: parentData, error: parentError } = await supabase
        .from('financial_data')
        .select('tipo, categoria_1, sub_categoria, clasificacion, monto')
        .eq('codigo', parentCode)
        .eq('report_id', reportId || 'default')
        .single()
      
      if (!parentError && parentData && isClassified(parentData)) {
        return NextResponse.json({
          valid: false,
          error: 'PARENT_ALREADY_CLASSIFIED',
          severity: 'CRITICAL',
          financial_impact: Math.abs(parentData.monto || 0),
          message: `Parent account ${parentCode} is already classified. This would cause double-counting.`,
          suggested_action: 'UNCLASSIFY_PARENT_OR_USE_PARENT_ONLY',
          business_impact: 'Double-counting in financial reports, inflated cost totals'
        })
      }
    }
    
    // Check children classification conflict
    const childrenPrefix = getChildrenPrefix(accountCode, hierarchyLevel)
    if (childrenPrefix) {
      const { data: childrenData, error: childrenError } = await supabase
        .from('financial_data')
        .select('codigo, tipo, categoria_1, sub_categoria, clasificacion, monto')
        .ilike('codigo', `${childrenPrefix}%`)
        .neq('codigo', accountCode)
        .eq('report_id', reportId || 'default')
      
      if (!childrenError && childrenData) {
        const classifiedChildren = childrenData.filter(child => isClassified(child))
        
        if (classifiedChildren.length > 0) {
          const childrenAmount = classifiedChildren.reduce((sum, c) => sum + Math.abs(c.monto || 0), 0)
          
          return NextResponse.json({
            valid: false,
            error: 'CHILDREN_ALREADY_CLASSIFIED',
            severity: 'CRITICAL',
            financial_impact: childrenAmount,
            message: `${classifiedChildren.length} child accounts are already classified. This would cause double-counting.`,
            suggested_action: 'UNCLASSIFY_CHILDREN_OR_USE_CHILDREN_ONLY',
            business_impact: `${formatCurrency(childrenAmount)} would be double-counted in reports`
          })
        }
      }
    }
    
    // Validation passed
    return NextResponse.json({ valid: true })
    
  } catch (error) {
    console.error('Classification validation error:', error)
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

function getChildrenPrefix(accountCode: string, level: number): string | undefined {
  switch (level) {
    case 1:
      return accountCode.substring(0, 4) // e.g., "5000"
    case 2:
      return accountCode.substring(0, 9) // e.g., "5000-1000"
    case 3:
      return accountCode.substring(0, 13) // e.g., "5000-1000-001"
    default:
      return undefined
  }
}

function isClassified(record: any): boolean {
  return record.tipo && record.tipo !== 'Indefinido' && 
         record.categoria_1 && record.categoria_1 !== 'Sin Categoría' &&
         record.clasificacion && record.clasificacion !== 'Sin Clasificación'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
} 