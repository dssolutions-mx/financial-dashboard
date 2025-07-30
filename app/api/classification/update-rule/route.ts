import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { ruleId, updates, userId, applyRetroactively } = await request.json()
    
    if (!ruleId || !updates || !userId) {
      return NextResponse.json({ 
        error: 'Rule ID, updates, and user ID are required' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get the existing rule
    const { data: existingRule, error: ruleError } = await supabase
      .from('classification_rules')
      .select('*')
      .eq('id', ruleId)
      .single()

    if (ruleError || !existingRule) {
      return NextResponse.json({ error: 'Classification rule not found' }, { status: 404 })
    }

    // Update the rule
    const { error: updateError } = await supabase
      .from('classification_rules')
      .update({
        tipo: updates.tipo || existingRule.tipo,
        categoria_1: updates.categoria_1 || existingRule.categoria_1,
        sub_categoria: updates.sub_categoria || existingRule.sub_categoria,
        clasificacion: updates.clasificacion || existingRule.clasificacion,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId)

    if (updateError) {
      console.error('Error updating rule:', updateError)
      return NextResponse.json({ error: 'Failed to update classification rule' }, { status: 500 })
    }

    // Apply retroactively if requested
    const retroactiveChanges = []
    let affectedReports: string[] = []
    let totalFinancialImpact = 0

    if (applyRetroactively) {
      // Find all records with this account code
      const { data: affectedRecords, error: recordsError } = await supabase
        .from('financial_data')
        .select('id, report_id, monto, tipo, categoria_1, sub_categoria, clasificacion')
        .eq('codigo', existingRule.account_code)

      if (!recordsError && affectedRecords) {
        // Update all matching records
        for (const record of affectedRecords) {
          const oldClassification = {
            tipo: record.tipo,
            categoria_1: record.categoria_1,
            sub_categoria: record.sub_categoria,
            clasificacion: record.clasificacion
          }

          const newClassification = {
            tipo: updates.tipo || existingRule.tipo,
            categoria_1: updates.categoria_1 || existingRule.categoria_1,
            sub_categoria: updates.sub_categoria || existingRule.sub_categoria,
            clasificacion: updates.clasificacion || existingRule.clasificacion
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
              accountCode: existingRule.account_code,
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
    }

    // Create impact summary
    const impact = {
      family_code: existingRule.family_code,
      affectedRecords: retroactiveChanges.length,
      affectedReports,
      totalFinancialImpact,
      retroactiveChanges,
      estimatedProcessingTime: retroactiveChanges.length * 0.1
    }

    return NextResponse.json({ 
      success: true, 
      ruleId,
      impact 
    })
    
  } catch (error) {
    console.error('Update rule error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 