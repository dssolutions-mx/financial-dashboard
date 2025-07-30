import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get all classification rules
    const { data: rules, error } = await supabase
      .from('classification_rules')
      .select('*')
      .eq('is_active', true)
      .order('account_code')

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch classification rules' }, { status: 500 })
    }

    // Transform the data to include applies_to_reports count
    const transformedRules = (rules || []).map(rule => ({
      id: rule.id,
      account_code: rule.account_code,
      account_name: rule.account_name || rule.account_code,
      tipo: rule.tipo,
      categoria_1: rule.categoria_1,
      sub_categoria: rule.sub_categoria,
      clasificacion: rule.clasificacion,
      hierarchy_level: rule.hierarchy_level,
      family_code: rule.family_code,
      effective_from: rule.effective_from,
      effective_to: rule.effective_to,
      created_by: rule.created_by,
      approved_by: rule.approved_by,
      is_active: rule.is_active,
      applies_to_reports: 0, // TODO: Calculate from financial_data
      last_modified: rule.updated_at || rule.created_at
    }))

    return NextResponse.json({ rules: transformedRules })
    
  } catch (error) {
    console.error('Get classification rules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 