import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { 
      accountCode, 
      newClassification, 
      effectiveFrom, 
      userId, 
      applyToAllReports 
    } = await request.json()
    
    if (!accountCode || !newClassification || !userId) {
      return NextResponse.json({ 
        error: 'Account code, classification, and user ID are required' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Parse account structure
    const familyCode = accountCode.substring(0, 9)
    const hierarchyLevel = getHierarchyLevel(accountCode)
    
    // 1. Create/Update classification rule
    const { data: existingRule, error: ruleCheckError } = await supabase
      .from('classification_rules')
      .select('*')
      .eq('account_code', accountCode)
      .eq('is_active', true)
      .single()

    let ruleId: string
    
    if (existingRule) {
      // Update existing rule
      const { error: updateError } = await supabase
        .from('classification_rules')
        .update({
          tipo: newClassification.tipo,
          categoria_1: newClassification.categoria_1,
          sub_categoria: newClassification.sub_categoria,
          clasificacion: newClassification.clasificacion,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRule.id)
      
      if (updateError) {
        console.error('Error updating classification rule:', updateError)
        return NextResponse.json({ error: 'Failed to update classification rule' }, { status: 500 })
      }
      
      ruleId = existingRule.id
    } else {
      // Create new rule
      const { data: newRule, error: createError } = await supabase
        .from('classification_rules')
        .insert({
          account_code: accountCode,
          account_type: accountCode.substring(0, 4),
          division: accountCode.substring(5, 9),
          product_service: accountCode.substring(10, 13),
          detail: accountCode.substring(14, 17),
          hierarchy_level: hierarchyLevel,
          family_code: familyCode,
          tipo: newClassification.tipo,
          categoria_1: newClassification.categoria_1,
          sub_categoria: newClassification.sub_categoria,
          clasificacion: newClassification.clasificacion,
          effective_from: effectiveFrom,
          created_by: userId,
          is_active: true
        })
        .select('id')
        .single()
      
      if (createError) {
        console.error('Error creating classification rule:', createError)
        return NextResponse.json({ error: 'Failed to create classification rule' }, { status: 500 })
      }
      
      ruleId = newRule.id
    }

    // 2. Apply retroactive updates if requested
    const retroactiveChanges = []
    let affectedReports: string[] = []
    let totalFinancialImpact = 0
    
    if (applyToAllReports) {
      // Find all reports with this account
      const { data: affectedRecords, error: recordsError } = await supabase
        .from('financial_data')
        .select('id, report_id, monto, tipo, categoria_1, sub_categoria, clasificacion')
        .eq('codigo', accountCode)
      
      if (recordsError) {
        console.error('Error finding affected records:', recordsError)
        return NextResponse.json({ error: 'Failed to find affected records' }, { status: 500 })
      }

      // Update all matching records
      for (const record of affectedRecords || []) {
        const oldClassification = {
          tipo: record.tipo,
          categoria_1: record.categoria_1,
          sub_categoria: record.sub_categoria,
          clasificacion: record.clasificacion
        }

        // Update the record
        const { error: updateRecordError } = await supabase
          .from('financial_data')
          .update({
            tipo: newClassification.tipo,
            categoria_1: newClassification.categoria_1,
            sub_categoria: newClassification.sub_categoria,
            clasificacion: newClassification.clasificacion
          })
          .eq('id', record.id)

        if (!updateRecordError) {
          retroactiveChanges.push({
            reportId: record.report_id,
            accountCode,
            oldClassification,
            newClassification,
            amount: record.monto || 0
          })
          
          if (!affectedReports.includes(record.report_id)) {
            affectedReports.push(record.report_id)
          }
          
          totalFinancialImpact += Math.abs(record.monto || 0)
        }
      }
    }

    // 3. Log significant changes (hierarchy_alerts removed as it was unused)
    if (retroactiveChanges.length > 10 || totalFinancialImpact > 1000000) {
      console.log(`Significant retroactive changes: ${retroactiveChanges.length} records, ${formatCurrency(totalFinancialImpact)} impact`)
    }

    // 4. Return impact summary
    const impact = {
      family_code: familyCode,
      affectedRecords: retroactiveChanges.length,
      affectedReports,
      totalFinancialImpact,
      retroactiveChanges,
      estimatedProcessingTime: retroactiveChanges.length * 0.1 // seconds
    }

    return NextResponse.json({ 
      success: true, 
      ruleId,
      impact 
    })
    
  } catch (error) {
    console.error('Retroactive classification update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getHierarchyLevel(accountCode: string): number {
  if (accountCode.substring(5, 15) === '0000-000-000') return 1
  if (accountCode.substring(10, 15) === '00-000') return 2
  if (accountCode.substring(14, 15) === '000') return 3
  return 4
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.abs(amount))
} 