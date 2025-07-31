import * as XLSX from 'xlsx';
import * as React from 'react';
import { getClassifications, getClassificationByCode } from './classification-service-client';

interface BalanzaRow {
  Codigo: string;
  Concepto: string;
  Abonos: number | null;
  Cargos: number | null;
  Monto?: number;
  Planta?: string;
}

// Keep ProcessedRow for potential internal use or compatibility
export interface ProcessedRow {
  Tipo: string;
  'Categoria 1': string;
  'Sub categoria': string;
  Clasificacion: string;
  Monto: number;
  Planta: string;
}

// New interface combining original and processed data
export interface DebugDataRow extends ProcessedRow {
  // Original fields from BalanzaRow
  Codigo: string;
  Concepto: string; // Corresponds to 'Nombre Cuenta' in some contexts?
  Abonos: number | null;
  Cargos: number | null;
  // Processed fields are inherited
}

interface UnifiedClassification {
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

// Function to get classifications from database
async function getUnifiedClassifications(): Promise<UnifiedClassification[]> {
  if (UNIFIED_CLASSIFICATIONS_CACHE) {
    return UNIFIED_CLASSIFICATIONS_CACHE;
  }
  
  try {
    UNIFIED_CLASSIFICATIONS_CACHE = await getClassifications();
    return UNIFIED_CLASSIFICATIONS_CACHE;
  } catch (error) {
    console.error('Error loading classifications from database:', error);
    // Fallback to empty array if database fails
    return [];
  }
}

function classifyPlant(concepto: string): string {
  const conceptoLower = concepto.toLowerCase();
  // Prioritize specific plant mentions
  if (conceptoLower.includes('p5') || conceptoLower.includes('p-5') || conceptoLower.includes('planta 5')) {
    return 'P5';
  } else if (conceptoLower.includes('p1') || conceptoLower.includes('p-1') || conceptoLower.includes('planta 1')) {
    return 'P1';
  } else if (conceptoLower.includes('p2') || conceptoLower.includes('p-2') || conceptoLower.includes('planta 2')) {
    return 'P2';
  } else if (conceptoLower.includes('p3') || conceptoLower.includes('p-3') || conceptoLower.includes('planta 3')) {
    return 'P3';
  } else if (conceptoLower.includes('p4') || conceptoLower.includes('p-4') || conceptoLower.includes('planta 4')) {
    return 'P4';
  } else if (conceptoLower.includes('mx') || conceptoLower.includes('mexicali')) {
    return 'MEXICALI';
  }
  return 'SIN CLASIFICACION';
}

async function processBalanzaData(data: BalanzaRow[]): Promise<DebugDataRow[]> {
  const processed: DebugDataRow[] = [];

  // Get classifications from database
  const UNIFIED_CLASSIFICATIONS = await getUnifiedClassifications();

  for (const row of data) {
    const codigo = row.Codigo;
    // Ensure Concepto exists, provide a fallback if necessary
    const concepto = row.Concepto || 'CONCEPTO_FALTANTE'; 
    const cargos = row.Cargos || 0;
    const abonos = row.Abonos || 0;

    // Determine Monto based on classification type (Ingresos/Egresos)
    let monto = 0;
    let tipo = ''; // Determine tipo later based on classification

    // Find classification based on Codigo
    const classification = UNIFIED_CLASSIFICATIONS.find(c => c.codigo_ingresos === codigo);

    let categoria1 = 'Sin Categoría';
    let subCategoria = 'Sin Subcategoría';
    let clasificacion = 'Sin Clasificación';
    let planta = 'SIN CLASIFICACION'; // Default plant

    // Attempt to classify plant based on Concepto first, as Codigo pattern might not cover all cases (like P5)
    planta = classifyPlant(concepto);

    // If Concepto didn't classify, try Codigo pattern (for P1-P4, Mexicali)
    if (planta === 'SIN CLASIFICACION') {
        const plantCodeMatch = codigo.match(/\d{4}-(\d)\d{3}/);
      if (plantCodeMatch) {
          const plantDigit = plantCodeMatch[1];
          if (plantDigit === '1') planta = 'P1';
          else if (plantDigit === '2') planta = 'P2';
          else if (plantDigit === '3') planta = 'P3';
          else if (plantDigit === '5') planta = 'P4'; // Assuming 5XXX is still P4
          else if (plantDigit === '8') planta = 'MEXICALI';
        // Add specific digit for P5 if it exists
      }
    }

    if (classification) {
      tipo = classification.clasificacion_gerencia || 'Indefinido';
      categoria1 = classification.concepto_gerencia || 'Sin Categoría';
      subCategoria = classification.sub_clasificacion_gerencia || 'Sin Subcategoría';
      clasificacion = classification.sub_sub_clasificacion_gerencia || 'Sin Clasificación';

      // CORREGIDO: Usar convención contable estándar uniforme
      // Monto = Abonos - Cargos (siempre, independiente del tipo)
      // - Positivo: cuenta con saldo acreedor (típico ingresos/pasivos)
      // - Negativo: cuenta con saldo deudor (típico gastos/activos)
      monto = abonos - cargos;

    } else {
      // If no classification found by Codigo, try by Concepto?
      // For now, default classification applies
      tipo = 'Indefinido'; // Mark as Indefinido if no match
      monto = abonos - cargos; // Standard accounting convention
      // Keep default 'Sin Categoría', 'Sin Subcategoría', 'Sin Clasificación'
    }

    // Skip rows with zero monto if they are not specifically needed
    if (monto === 0) {
      // console.log('Skipping zero monto row:', row);
      continue; // Skip this iteration
    }

    processed.push({
      // Original Fields
      Codigo: codigo,
      Concepto: concepto,
      Cargos: row.Cargos, // Keep original null/number value
      Abonos: row.Abonos, // Keep original null/number value
      // Processed Fields
      Tipo: tipo,
      'Categoria 1': categoria1,
      'Sub categoria': subCategoria,
      Clasificacion: clasificacion,
      Monto: monto,
      Planta: planta,
    });
  }

  return processed;
}

export function processBalanzaComprobacion(inputFile: File): Promise<DebugDataRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, {
          type: 'binary',
          cellNF: true,
          cellDates: true
        });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

        const rawData: BalanzaRow[] = [];
        const startingCode = '4100-0000-000-000';

        for (let rowNum = 7; rowNum <= range.e.r; rowNum++) {
          const codigoCell = worksheet[XLSX.utils.encode_cell({ c: 0, r: rowNum })];
          const conceptoCell = worksheet[XLSX.utils.encode_cell({ c: 1, r: rowNum })];
          const cargosCell = worksheet[XLSX.utils.encode_cell({ c: 4, r: rowNum })];
          const abonosCell = worksheet[XLSX.utils.encode_cell({ c: 5, r: rowNum })];

          if (codigoCell && codigoCell.v) {
            const codigo = String(codigoCell.v).trim();
            // Filter rows based on Codigo >= startingCode
            if (codigo >= startingCode) {
              rawData.push({
                Codigo: codigo,
                Concepto: conceptoCell ? String(conceptoCell.v).trim() : '',
                Cargos: cargosCell ? Number(cargosCell.v) : null,
                Abonos: abonosCell ? Number(abonosCell.v) : null,
                // Monto calculation moved to processBalanzaData for consistency
              });
            }
          }
        }

        // Process the *filtered* data
        const processedData = await processBalanzaData(rawData);

        console.log(`Read ${rawData.length} rows >= ${startingCode}, Processed ${processedData.length} rows with non-zero monto`);
        resolve(processedData);
      } catch (error) {
        console.error('Error processing Excel file:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error('File reading error:', error);
      reject(error);
    };

    reader.readAsBinaryString(inputFile);
  });
}

// React component handler - supports both File and ChangeEvent
export const handleBalanzaFileUpload = (
  input: React.ChangeEvent<HTMLInputElement> | File
): Promise<{data: DebugDataRow[], rawData: any[]}> => {
  return new Promise(async (resolve, reject) => {
    const file = input instanceof File ? input : input.target.files?.[0];
    if (file) {
      processBalanzaComprobacion(file)
        .then((processedData) => {
          // Return both processed data and raw data for compatibility
          resolve({
            data: processedData,
            rawData: processedData // For now, using processed data as raw data
          });
        })
        .catch(error => {
          console.error('Error processing file:', error);
          reject(error);
        });
    } else {
      reject(new Error('No file selected'));
    }
  });
}; 