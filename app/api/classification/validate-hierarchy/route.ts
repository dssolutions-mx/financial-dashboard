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
      .select('codigo, concepto, monto')
      .eq('report_id', reportId)
      .not('codigo', 'is', null)
      .not('monto', 'is', null)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 })
    }

    const validationResults = []

    // Build hierarchy map
    const accountMap = new Map()
    financialData?.forEach(row => {
      accountMap.set(row.codigo, {
        codigo: row.codigo,
        concepto: row.concepto,
        amount: row.monto || 0
      })
    })

    // Validate hierarchy relationships
    for (const account of financialData || []) {
      const level = getHierarchyLevel(account.codigo)
      
      if (level < 4) { // Only validate accounts that can have children
        const children = getChildren(account.codigo, level, accountMap)
        
        if (children.length > 0) {
          const parentAmount = account.monto || 0
          const childrenSum = children.reduce((sum, child) => sum + child.amount, 0)
          const variance = Math.abs(parentAmount - childrenSum)
          const variancePercentage = parentAmount !== 0 ? (variance / Math.abs(parentAmount)) * 100 : 0

          let validationStatus = 'PERFECT'
          if (variance <= 1) {
            validationStatus = 'PERFECT'
          } else if (variancePercentage <= 1) {
            validationStatus = 'MINOR_VARIANCE'
          } else if (variancePercentage <= 5) {
            validationStatus = 'MAJOR_VARIANCE'
          } else {
            validationStatus = 'CRITICAL_MISMATCH'
          }

          if (validationStatus !== 'PERFECT') {
            validationResults.push({
              parent_code: account.codigo,
              parent_name: account.concepto,
              parent_amount: parentAmount,
              children_sum: childrenSum,
              variance: variance,
              validation_status: validationStatus
            })
          }
        }
      }
    }

    return NextResponse.json({ results: validationResults })
    
  } catch (error) {
    console.error('Hierarchy validation error:', error)
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

function getChildren(parentCode: string, parentLevel: number, accountMap: Map<string, any>): any[] {
  const children = []
  
  for (const [code, account] of accountMap) {
    const childLevel = getHierarchyLevel(code)
    
    // Check if this account is a direct child of the parent
    if (childLevel === parentLevel + 1) {
      let isChild = false
      
      switch (parentLevel) {
        case 1:
          // Level 1 to Level 2: 4100-0000-000-000 → 4100-YYYY-000-000
          isChild = code.substring(0, 4) === parentCode.substring(0, 4) &&
                   code.substring(5, 15) !== '0000-000-000' &&
                   code.substring(10, 15) === '000-000'
          break
        case 2:
          // Level 2 to Level 3: 4100-1000-000-000 → 4100-1000-ZZZ-000
          isChild = code.substring(0, 9) === parentCode.substring(0, 9) &&
                   code.substring(10, 15) !== '000-000' &&
                   code.substring(14, 15) === '000'
          break
        case 3:
          // Level 3 to Level 4: 4100-1000-001-000 → 4100-1000-001-WWW
          isChild = code.substring(0, 13) === parentCode.substring(0, 13) &&
                   code.substring(14, 15) !== '000'
          break
      }
      
      if (isChild) {
        children.push(account)
      }
    }
  }
  
  return children
} 