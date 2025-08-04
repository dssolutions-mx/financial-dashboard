import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get all classification rules
    const { data: rules, error } = await supabase
      .from('classifications')
      .select('*')
      .eq('is_active', true)
      .order('account_code')

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch classification rules' }, { status: 500 })
    }

    // Get counts using raw SQL query since group by is not well-typed with the supabase client
    const { data: counts, error: countError } = await supabase
      .rpc('count_records_by_account_code')

    if (countError) {
      console.error('Database error fetching financial data counts:', countError)
      // Non-fatal, we can continue without the counts
    }

    // Safely type our report counts
    const reportCounts = counts?.reduce((acc: Record<string, number>, item: any) => {
        // Using any here to handle the structure that comes back from the RPC
        if (item && item.codigo) {
          acc[item.codigo] = parseInt(item.count, 10) || 0;
        }
        return acc;
    }, {} as Record<string, number>);


    // Transform the data to the format expected by the frontend
    const transformedRules = (rules || []).map(rule => ({
      id: rule.id,
      account_code: rule.account_code,
      account_name: rule.account_name || rule.account_code,
      tipo: rule.classification, // Mapped from 'classification'
      categoria_1: rule.management_category, // Mapped from 'management_category'
      sub_categoria: rule.sub_classification, // Mapped from 'sub_classification'
      clasificacion: rule.sub_sub_classification, // Mapped from 'sub_sub_classification'
      hierarchy_level: 4, // Defaulting to 4 as this info is not in this table
      family_code: rule.account_code.substring(0, 9), // Derived from account_code
      effective_from: rule.created_at,
      created_by: 'system', // Placeholder
      is_active: rule.is_active,
      applies_to_reports: reportCounts?.[rule.account_code] || 0,
      last_modified: rule.updated_at || rule.created_at
    }))

    return NextResponse.json({ rules: transformedRules })
    
  } catch (error) {
    console.error('Get classification rules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 