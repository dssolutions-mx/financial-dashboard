import { createClient } from '../supabase/server';

export interface DatabaseClassification {
  id: string;
  account_code: string;
  account_name: string;
  management_category: string;
  classification: string;
  sub_classification: string;
  sub_sub_classification: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnifiedClassification {
  codigo_ingresos: string;
  categoria_ingresos: string;
  concepto_ingresos: string;
  concepto_gerencia: string;
  clasificacion_gerencia: string;
  sub_clasificacion_gerencia: string;
  sub_sub_clasificacion_gerencia: string;
}

export async function getClassifications(): Promise<UnifiedClassification[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('classifications')
    .select('*')
    .eq('is_active', true)
    .order('account_code');

  if (error) {
    console.error('Error fetching classifications:', error);
    throw new Error('Failed to fetch classifications from database');
  }

  // Transform database format to match the excel processor format
  return data.map((dbClassification: DatabaseClassification) => ({
    codigo_ingresos: dbClassification.account_code,
    categoria_ingresos: dbClassification.management_category,
    concepto_ingresos: dbClassification.account_name,
    concepto_gerencia: dbClassification.management_category,
    clasificacion_gerencia: dbClassification.classification,
    sub_clasificacion_gerencia: dbClassification.sub_classification,
    sub_sub_clasificacion_gerencia: dbClassification.sub_sub_classification || dbClassification.sub_classification
  }));
}

export async function getClassificationByCode(accountCode: string): Promise<UnifiedClassification | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('classifications')
    .select('*')
    .eq('account_code', accountCode)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  // Transform database format to match the excel processor format
  return {
    codigo_ingresos: data.account_code,
    categoria_ingresos: data.management_category,
    concepto_ingresos: data.account_name,
    concepto_gerencia: data.management_category,
    clasificacion_gerencia: data.classification,
    sub_clasificacion_gerencia: data.sub_classification,
    sub_sub_clasificacion_gerencia: data.sub_sub_classification || data.sub_classification
  };
} 