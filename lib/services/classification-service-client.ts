import { createClient } from '../supabase/client';

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
  const supabase = createClient();
  
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
  const supabase = createClient();
  
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

// Database-based classification hierarchy functions - CORREGIDAS para usar jerarquía estática
export async function getSubCategoriasForTipo(tipo: string): Promise<string[]> {
  // Usar la jerarquía estática en lugar de la base de datos
  const hierarchy = CLASSIFICATION_HIERARCHY as any;
  if (!hierarchy[tipo]) {
    return ['Sin Subcategoría'];
  }
  
  // Retornar las categorías principales (Categoria 1) para el tipo dado
  const categorias1 = Object.keys(hierarchy[tipo]);
  return ['Sin Subcategoría', ...categorias1];
}

export async function getClasificacionesForSubCategoria(tipo: string, categoria1: string): Promise<string[]> {
  // categoria1 es realmente la "Categoria 1" (ej: "Ventas")
  // Necesitamos retornar las subcategorías para esa categoria1
  const hierarchy = CLASSIFICATION_HIERARCHY as any;
  if (!hierarchy[tipo] || !hierarchy[tipo][categoria1]) {
    return ['Sin Clasificación'];
  }
  
  // Retornar las subcategorías para la categoria1 dada
  const subCategorias = Object.keys(hierarchy[tipo][categoria1]);
  return ['Sin Clasificación', ...subCategorias];
}

export async function getCategoria1ForClasificacion(tipo: string, categoria1: string, subCategoria: string): Promise<string[]> {
  // subCategoria es realmente la "Sub categoria" (ej: "Ventas")
  // Necesitamos retornar las clasificaciones finales para esa subcategoría
  const hierarchy = CLASSIFICATION_HIERARCHY as any;
  if (!hierarchy[tipo] || 
      !hierarchy[tipo][categoria1] || 
      !hierarchy[tipo][categoria1][subCategoria]) {
    return ['Sin Categoría'];
  }
  
  // Retornar las clasificaciones finales para la subcategoría dada
  const clasificaciones = hierarchy[tipo][categoria1][subCategoria];
  return ['Sin Categoría', ...clasificaciones];
}

export async function suggestClassification(concepto: string, codigo: string): Promise<{
  tipo?: string;
  subCategoria?: string;
  clasificacion?: string;
  categoria1?: string;
}> {
  const supabase = createClient();
  
  // Try to find by exact code match first
  const { data: exactMatch, error: exactError } = await supabase
    .from('classifications')
    .select('*')
    .eq('account_code', codigo)
    .eq('is_active', true)
    .single();

  if (!exactError && exactMatch) {
    return {
      tipo: exactMatch.classification,
      subCategoria: exactMatch.sub_classification,
      clasificacion: exactMatch.sub_sub_classification,
      categoria1: exactMatch.management_category
    };
  }

  // If no exact match, try to find by concept similarity
  const { data: similarMatches, error: similarError } = await supabase
    .from('classifications')
    .select('*')
    .ilike('account_name', `%${concepto.toLowerCase()}%`)
    .eq('is_active', true)
    .limit(1);

  if (!similarError && similarMatches && similarMatches.length > 0) {
    const match = similarMatches[0];
    return {
      tipo: match.classification,
      subCategoria: match.sub_classification,
      clasificacion: match.sub_sub_classification,
      categoria1: match.management_category
    };
  }

  // Determine tipo based on code prefix
  let tipo = '';
  const codigoPrefix = codigo.substring(0, 4);
  if (codigoPrefix === '4100') {
    tipo = 'Ingresos';
  } else if (codigoPrefix === '5000') {
    tipo = 'Egresos';
  }

  return { tipo };
}

// Static classification hierarchy for backward compatibility
export const CLASSIFICATION_HIERARCHY = {
  "Ingresos": {
    "Ventas": {
      "Ventas Concreto": ["Ventas Concreto"],
      "Ventas Bombeo": ["Ventas Bombeo"],
      "Ventas Productos Alternativos": ["Ventas Productos Alternativos"]
    },
    "Otros Ingresos": {
      "Otros": ["Otros Ingresos", "Ingresos Financieros"]
    }
  },
  "Egresos": {
    "Costo Materias Primas": {
      "Materia prima": ["Cemento", "Agregado Grueso", "Agregado Fino", "Aditivos", "Agua", "Adiciones especiales"]
    },
    "Costos Operativos": {
      "Costo transporte concreto": ["Diesel CR", "Servicios", "Mantenimiento Preventivo CR", "Otros gastos CR", "Mantenimiento Correctivo CR", "Costo servicio de bomba", "Fletes"],
      "Costo Fijo": ["Nómina Producción", "Nómina Operadores CR", "Nómina Administrativos", "Mantenimiento Producción", "Rentas Equipos", "Rentas Inmuebles", "Otros gastos Producción", "Otros gastos Administrativos"]
    }
  }
}; 