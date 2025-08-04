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
      .from('classifications')
      .select('*')
      .eq('id', ruleId)
      .single()

    if (ruleError || !existingRule) {
      return NextResponse.json({ error: 'Classification rule not found' }, { status: 404 })
    }

    // Update the rule
    const { error: updateError } = await supabase
      .from('classifications')
      .update({
        classification: updates.tipo || existingRule.classification,
        management_category: updates.categoria_1 || existingRule.management_category,
        sub_classification: updates.sub_categoria || existingRule.sub_classification,
        sub_sub_classification: updates.clasificacion || existingRule.sub_sub_classification,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId)

    if (updateError) {
      console.error('Error updating rule:', updateError)
      return NextResponse.json({ error: 'Failed to update classification rule' }, { status: 500 })
    }

    // Apply retroactively if requested
    let retroactiveChanges: any[] = []
    let affectedReports: string[] = []
    let totalFinancialImpact = 0
    let affectedRecordsCount = 0

    if (applyRetroactively) {
      // First, count all records with this account code
      const { count, error: countError } = await supabase
        .from('financial_data')
        .select('*', { count: 'exact', head: true })
        .eq('codigo', existingRule.account_code)
      
      if (countError) {
        console.error('Error counting affected records:', countError)
      } else {
        affectedRecordsCount = count || 0
        console.log(`Found ${affectedRecordsCount} records with account code ${existingRule.account_code}`)
      }

      // Find all unique reports containing this account code
      const { data: reportData, error: reportsError } = await supabase
        .from('financial_data')
        .select('report_id, monto')
        .eq('codigo', existingRule.account_code)

      if (reportsError) {
        console.error('Error fetching affected reports:', reportsError)
      } else if (reportData) {
        // Calculate unique reports and total financial impact
        affectedReports = [...new Set(reportData.map(r => r.report_id))]
        totalFinancialImpact = reportData.reduce((acc, r) => acc + Math.abs(r.monto || 0), 0)
        
        console.log(`Affecting ${affectedReports.length} unique reports with total impact of ${totalFinancialImpact}`)
      }

      // Update all matching records
      const { error: updateRecordError } = await supabase
          .from('financial_data')
          .update({
            tipo: updates.tipo || existingRule.classification,
            categoria_1: updates.categoria_1 || existingRule.management_category,
            sub_categoria: updates.sub_categoria || existingRule.sub_classification,
            clasificacion: updates.clasificacion || existingRule.sub_sub_classification,
          })
          .eq('codigo', existingRule.account_code)
      
      if(updateRecordError){
          console.error('Error updating financial data:', updateRecordError)
          return NextResponse.json({ error: 'Failed to update financial data' }, { status: 500 })
      }
      
      console.log(`Successfully updated ${affectedRecordsCount} records across ${affectedReports.length} reports`)
      
      // Record the change for the history
      retroactiveChanges = [{
        account_code: existingRule.account_code,
        updated_at: new Date().toISOString(),
        updated_by: userId,
        affected_records: affectedRecordsCount,
        affected_reports: affectedReports.length,
        financial_impact: totalFinancialImpact
      }]
    }

    // Create impact summary
    const impact = {
      family_code: existingRule.account_code.substring(0, 9),
      affectedRecords: affectedRecordsCount,
      affectedReports,
      totalFinancialImpact,
      retroactiveChanges,
      estimatedProcessingTime: affectedRecordsCount * 0.01
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