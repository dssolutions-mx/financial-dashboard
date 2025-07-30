import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { accountCode } = await request.json()
    
    if (!accountCode) {
      return NextResponse.json({ error: 'Account code is required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get classification history for the account across all reports
    const { data: history, error } = await supabase
      .from('financial_data')
      .select(`
        *,
        financial_reports!inner(
          id,
          name,
          month,
          year,
          created_at
        )
      `)
      .eq('codigo', accountCode)
      .order('financial_reports.created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch classification history' }, { status: 500 })
    }

    // Transform the data to the expected format
    const transformedHistory = (history || []).map(record => ({
      reportId: record.report_id,
      reportDate: record.financial_reports.created_at,
      reportName: record.financial_reports.name,
      amount: record.monto || 0,
      classification: {
        tipo: record.tipo || '',
        categoria_1: record.categoria_1 || '',
        sub_categoria: record.sub_categoria || '',
        clasificacion: record.clasificacion || ''
      },
      appliedAt: record.updated_at || record.created_at,
      appliedBy: 'system', // TODO: Track actual user
      source: 'excel_import' as const // TODO: Track actual source
    }))

    return NextResponse.json({ history: transformedHistory })
    
  } catch (error) {
    console.error('Classification history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 