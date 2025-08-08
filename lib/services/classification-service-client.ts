// This file was partially removed, so I will re-create it with the new functions

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

// Cache for classifications to avoid multiple database calls
let UNIFIED_CLASSIFICATIONS_CACHE: UnifiedClassification[] | null = null;

// Function to clear cache when classifications are updated
export function clearClassificationsCache(): void {
  UNIFIED_CLASSIFICATIONS_CACHE = null;
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

// Classification hierarchy functions - UPDATED for May 2026 structure
// CORRECTED: Functions now have clear names that match what they return

export async function getCategoria1ForTipo(tipo: string): Promise<string[]> {
  // Returns the main categories (Categoria 1) for a given tipo
  const hierarchy = CLASSIFICATION_HIERARCHY as any;
  if (!hierarchy[tipo]) {
    return ['Sin Categoría'];
  }
  
  // Return the main categories for the given tipo
  const categorias1 = Object.keys(hierarchy[tipo]);
  return ['Sin Categoría', ...categorias1];
}

export async function getSubCategoriasForCategoria1(tipo: string, categoria1: string): Promise<string[]> {
  // Returns the subcategories for a given categoria1
  const hierarchy = CLASSIFICATION_HIERARCHY as any;
  if (!hierarchy[tipo] || !hierarchy[tipo][categoria1]) {
    return ['Sin Subcategoría'];
  }
  
  // Return the subcategories for the given categoria1
  const subCategorias = Object.keys(hierarchy[tipo][categoria1]);
  return ['Sin Subcategoría', ...subCategorias];
}

export async function getClasificacionesForSubCategoria(tipo: string, categoria1: string, subCategoria: string): Promise<string[]> {
  // Returns the final classifications for a given subcategory
  const hierarchy = CLASSIFICATION_HIERARCHY as any;
  if (!hierarchy[tipo] || 
      !hierarchy[tipo][categoria1] || 
      !hierarchy[tipo][categoria1][subCategoria]) {
    return ['Sin Clasificación'];
  }
  
  // Return the final classifications for the given subcategory
  const clasificaciones = hierarchy[tipo][categoria1][subCategoria];
  return ['Sin Clasificación', ...clasificaciones];
}

// BACKWARD COMPATIBILITY: Keep old function names but redirect to new ones
export async function getSubCategoriasForTipo(tipo: string): Promise<string[]> {
  return getCategoria1ForTipo(tipo);
}

export async function getCategoria1ForClasificacion(tipo: string, categoria1: string, subCategoria: string): Promise<string[]> {
  return getClasificacionesForSubCategoria(tipo, categoria1, subCategoria);
}

// Helper function for getting subcategorias when we only have tipo and categoria1
export async function getSubcategoriasFromCategoria1(tipo: string, categoria1: string): Promise<string[]> {
  return getSubCategoriasForCategoria1(tipo, categoria1);
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

// Static classification hierarchy - SYNCHRONIZED with May 2026 database structure
export const CLASSIFICATION_HIERARCHY = {
  "Ingresos": {
    "Ventas": {
      "Ventas Concreto": ["Ventas Concreto"],
      "Ventas Bombeo": ["Ventas Bombeo"],
      "Ventas Productos Alternativos": ["Ventas Productos Alternativos"]
    },
    "Otros Ingresos": {
      "Otros": ["Otros Ingresos"]
    }
  },
  "Egresos": {
    "Costo Materias Primas": {
      "Materia prima": ["Cemento", "Agregado Grueso", "Agregado Fino", "Aditivos", "Agua", "Adiciones especiales"]
    },
    "Costo operativo": {
      "Costo transporte": [
        "Diesel CR", 
        "Nómina Operadores CR",
        "Mantenimiento Preventivo CR",
        "Mantenimiento Correctivo CR",
        "Otros gastos CR"
      ],
      "Costo Fijo": [
        "Nómina Producción",
        "Nómina Administrativos", 
        "Mantenimiento Producción",
        "Otros gastos Producción",
        "Otros gastos Administrativos",
        "Rentas Equipos",
        "Rentas Inmuebles",
        "Costo servicio de bomba",  // NEW in May 2026
        "Servicios",
        "Otros gastos CR"  // Can appear in both categories
      ]
    }
  }
};

// Correct category ordering for consistent display across the application
export const CATEGORY_DISPLAY_ORDER = {
  "Ingresos": ["Ventas", "Otros Ingresos"],
  "Egresos": ["Costo Materias Primas", "Costo operativo"]
};

// Function to get categories in the correct order for display
export function getCategoriesInOrder(categories: string[]): string[] {
  const orderedCategories: string[] = [];
  
  // Add income categories in order
  CATEGORY_DISPLAY_ORDER.Ingresos.forEach(category => {
    if (categories.includes(category)) {
      orderedCategories.push(category);
    }
  });
  
  // Add expense categories in order  
  CATEGORY_DISPLAY_ORDER.Egresos.forEach(category => {
    if (categories.includes(category)) {
      orderedCategories.push(category);
    }
  });
  
  // Add any remaining categories not in our predefined order
  categories.forEach(category => {
    if (!orderedCategories.includes(category) && category !== "ALL" && category !== "Sin Categoría") {
      orderedCategories.push(category);
    }
  });
  
  // Add "Sin Categoría" at the end if it exists
  if (categories.includes("Sin Categoría")) {
    orderedCategories.push("Sin Categoría");
  }
  
  return orderedCategories;
}

// Add new function to auto-create missing classifications
export async function addMissingClassification(
  accountCode: string, 
  accountName: string,
  defaultClassification: {
    managementCategory?: string;
    classification?: string;
    subClassification?: string;
    subSubClassification?: string;
  } = {}
): Promise<UnifiedClassification | null> {
  const supabase = createClient();
  
  // Set defaults for unclassified accounts
  const classification = {
    account_code: accountCode,
    account_name: accountName,
    management_category: defaultClassification.managementCategory || 'Sin Categoría',
    classification: defaultClassification.classification || 'Sin Clasificación',
    sub_classification: defaultClassification.subClassification || 'Sin Subcategoría', 
    sub_sub_classification: defaultClassification.subSubClassification || 'Sin Clasificación',
    is_active: true
  };

  const { data, error } = await supabase
    .from('classifications')
    .insert(classification)
    .select()
    .single();

  if (error) {
    console.error('Error adding missing classification:', error);
    return null;
  }

  // Clear cache to force refresh
  UNIFIED_CLASSIFICATIONS_CACHE = null;

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

// Function to detect and add missing classifications from processed data
export async function detectAndAddMissingClassifications(processedData: any[]): Promise<{
  newClassifications: UnifiedClassification[];
  totalAdded: number;
}> {
  const supabase = createClient();
  const newClassifications: UnifiedClassification[] = [];

  // Get all existing account codes
  const { data: existingClassifications } = await supabase
    .from('classifications')
    .select('account_code')
    .eq('is_active', true);

  const existingCodes = new Set(existingClassifications?.map(c => c.account_code) || []);

  // Build a map of missing accounts aggregating the strongest (by monto absoluto) defined classification per code
  type MissingInfo = {
    code: string;
    name: string;
    weight: number; // suma de |Monto| para priorizar la variante dominante
    managementCategory?: string;
    classification?: string;
    subClassification?: string;
    subSubClassification?: string;
  };

  const missingAccounts: Map<string, MissingInfo> = processedData
    .filter(row => !existingCodes.has(row.Codigo))
    .reduce((acc: Map<string, MissingInfo>, row: any) => {
      const code: string = row.Codigo;
      const name: string = row.Concepto || 'Concepto no disponible';
      const montoAbs: number = Math.abs(Number(row.Monto ?? 0));

      // Detect if row brings a meaningful classification (not default placeholders)
      const tipo: string | undefined = row?.Tipo;
      const categoria1: string | undefined = row?.['Categoria 1'];
      const subCategoria: string | undefined = row?.['Sub categoria'];
      const clasificacion: string | undefined = row?.Clasificacion;

      const hasDefinedClassification =
        !!tipo && tipo !== 'Indefinido' &&
        !!categoria1 && categoria1 !== 'Sin Categoría' &&
        !!subCategoria && subCategoria !== 'Sin Subcategoría' &&
        !!clasificacion && clasificacion !== 'Sin Clasificación';

      const current = acc.get(code);

      // Initialize if not present
      if (!current) {
        acc.set(code, {
          code,
          name,
          weight: hasDefinedClassification ? montoAbs : 0,
          managementCategory: hasDefinedClassification ? categoria1 : undefined,
          classification: hasDefinedClassification ? tipo : undefined,
          subClassification: hasDefinedClassification ? subCategoria : undefined,
          subSubClassification: hasDefinedClassification ? clasificacion : undefined,
        });
        return acc;
      }

      // If we find a stronger (by monto) defined classification, replace
      if (hasDefinedClassification && montoAbs > (current.weight || 0)) {
        current.weight = montoAbs;
        current.managementCategory = categoria1;
        current.classification = tipo;
        current.subClassification = subCategoria;
        current.subSubClassification = clasificacion;
        acc.set(code, current);
        return acc;
      }

      // Otherwise keep the existing (either already defined or still undefined)
      return acc;
    }, new Map<string, MissingInfo>());

  // Add missing classifications to database
  for (const [, info] of missingAccounts) {
    const newClassification = await addMissingClassification(
      info.code,
      info.name,
      info.classification
        ? {
            managementCategory: info.managementCategory,
            classification: info.classification,
            subClassification: info.subClassification,
            subSubClassification: info.subSubClassification,
          }
        : {}
    );
    if (newClassification) {
      newClassifications.push(newClassification);
    }
  }

  console.log(
    `Detectadas y agregadas ${newClassifications.length} nuevas clasificaciones:`,
    newClassifications.map(c => c.codigo_ingresos)
  );

  return {
    newClassifications,
    totalAdded: newClassifications.length,
  };
}

export async function getAllClassificationRules() {
  const response = await fetch('/api/classification/rules');
  if (!response.ok) {
    throw new Error('Failed to fetch classification rules');
  }
  const data = await response.json();
  return data.rules;
}

export async function getClassificationHistory(accountCode: string) {
  const response = await fetch('/api/classification/history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accountCode }),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch classification history');
  }
  const data = await response.json();
  return data.history;
}

export async function updateClassificationRule(
  ruleId: string,
  updates: any,
  userId: string,
  applyRetroactively: boolean
) {
  const response = await fetch('/api/classification/update-rule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ruleId, updates, userId, applyRetroactively }),
  });
  if (!response.ok) {
    throw new Error('Failed to update classification rule');
  }
  return response.json();
}
