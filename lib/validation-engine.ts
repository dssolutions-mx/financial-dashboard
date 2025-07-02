import { DebugDataRow } from './excel-processor'

export interface ValidationSummary {
  hierarchyTotals: {
    ingresos: number    // From 4100-0000-000-000
    egresos: number     // From 5000-0000-000-000
  }
  classifiedTotals: {
    ingresos: number    // Sum of classified income items
    egresos: number     // Sum of classified expense items
  }
  unclassifiedItems: DebugDataRow[]  // Items that couldn't be classified
  isValid: boolean     // True if totals match within tolerance
  variance: {
    ingresos: number   // Difference between hierarchy and classified
    egresos: number    // Difference between hierarchy and classified
  }
  validationErrors: string[]  // List of validation error messages
}

export interface ReportMetadata {
  name: string
  fileName: string
  month: number
  year: number
}

export class ValidationEngine {
  private readonly HIERARCHY_CODES = {
    INGRESOS: '4100-0000-000-000',
    EGRESOS: '5000-0000-000-000'
  }
  
  private readonly TOLERANCE = 0.01 // Allow 1 peso tolerance for rounding

  /**
   * Validates processed Excel data by comparing hierarchy totals with classified totals
   */
  validateData(processedData: DebugDataRow[], rawData?: any[]): ValidationSummary {
    // Extract hierarchy totals from raw data if available
    const hierarchyTotals = this.extractHierarchyTotals(rawData || [])
    
    // Calculate classified totals
    const classifiedTotals = this.calculateClassifiedTotals(processedData)
    
    // Identify unclassified items
    const unclassifiedItems = this.identifyUnclassifiedItems(processedData)
    
    // Calculate variances
    const variance = {
      ingresos: hierarchyTotals.ingresos - classifiedTotals.ingresos,
      egresos: hierarchyTotals.egresos - classifiedTotals.egresos
    }
    
    // Check if validation passes
    const isIngresosValid = Math.abs(variance.ingresos) <= this.TOLERANCE
    const isEgresosValid = Math.abs(variance.egresos) <= this.TOLERANCE
    
    const isValid = isIngresosValid && isEgresosValid
    
    // Generate validation error messages
    const validationErrors = this.generateValidationErrors(
      variance, 
      unclassifiedItems.length,
      isIngresosValid,
      isEgresosValid
    )

    return {
      hierarchyTotals,
      classifiedTotals,
      unclassifiedItems,
      isValid,
      variance,
      validationErrors
    }
  }

  /**
   * Extract hierarchy totals from raw Excel data
   * Uses correct Cargos/Abonos logic to match excel-processor behavior
   */
  private extractHierarchyTotals(rawData: any[]): { ingresos: number; egresos: number } {
    let ingresos = 0
    let egresos = 0

    // Look for hierarchy codes in raw data
    for (const row of rawData) {
      if (row.Codigo === this.HIERARCHY_CODES.INGRESOS) {
        // For Ingresos hierarchy: Abonos - Cargos (Cargos would be returns/adjustments)
        const abonos = row.Abonos || 0
        const cargos = row.Cargos || 0
        ingresos = abonos - cargos
        console.log(`[ValidationEngine] Ingresos hierarchy found: Abonos=${abonos}, Cargos=${cargos}, Total=${ingresos}`)
      } else if (row.Codigo === this.HIERARCHY_CODES.EGRESOS) {
        // For Egresos hierarchy: Cargos - Abonos (Abonos would be returns/refunds)
        const cargos = row.Cargos || 0
        const abonos = row.Abonos || 0
        egresos = cargos - abonos
        console.log(`[ValidationEngine] Egresos hierarchy found: Cargos=${cargos}, Abonos=${abonos}, Total=${egresos}`)
      }
    }

    console.log(`[ValidationEngine] Final hierarchy totals: Ingresos=${ingresos}, Egresos=${egresos}`)
    return { ingresos, egresos }
  }

  /**
   * Calculate totals from classified data
   * Only count items that have been properly classified (not hierarchy rows)
   */
  private calculateClassifiedTotals(processedData: DebugDataRow[]): { ingresos: number; egresos: number } {
    let ingresos = 0
    let egresos = 0

    for (const row of processedData) {
      // Skip hierarchy rows in processed data
      if (row.Codigo === this.HIERARCHY_CODES.INGRESOS || row.Codigo === this.HIERARCHY_CODES.EGRESOS) {
        continue
      }

      // Count items that have been classified by the excel-processor
      // If Tipo is determined (not 'Indefinido'), then it was classified
      if (row.Tipo === 'Ingresos') {
        ingresos += row.Monto
      } else if (row.Tipo === 'Egresos') {
        // Egresos come as negative from excel-processor, but we need positive total for comparison
        egresos += Math.abs(row.Monto)
      }
    }

    console.log(`[ValidationEngine] Classified totals: Ingresos=${ingresos}, Egresos=${egresos}`)
    return { ingresos, egresos }
  }

  /**
   * Identify items that couldn't be properly classified
   * Excludes hierarchy rows which should not be classified
   */
  private identifyUnclassifiedItems(processedData: DebugDataRow[]): DebugDataRow[] {
    return processedData.filter(row => {
      // Skip hierarchy rows - they should not be classified
      if (row.Codigo === this.HIERARCHY_CODES.INGRESOS || row.Codigo === this.HIERARCHY_CODES.EGRESOS) {
        return false
      }
      
      // Return rows that are not properly classified (Tipo = 'Indefinido' means not classified)
      return row.Tipo === 'Indefinido'
    })
  }

  /**
   * Generate human-readable validation error messages
   */
  private generateValidationErrors(
    variance: { ingresos: number; egresos: number },
    unclassifiedCount: number,
    isIngresosValid: boolean,
    isEgresosValid: boolean
  ): string[] {
    const errors: string[] = []

    if (!isIngresosValid) {
      const diff = Math.abs(variance.ingresos)
      if (variance.ingresos > 0) {
        errors.push(
          `Ingresos: Total jerárquico es ${this.formatCurrency(diff)} mayor que el clasificado. Faltan elementos por clasificar.`
        )
      } else {
        errors.push(
          `Ingresos: Total clasificado es ${this.formatCurrency(diff)} mayor que el jerárquico. Hay elementos clasificados de más.`
        )
      }
    }

    if (!isEgresosValid) {
      const diff = Math.abs(variance.egresos)
      if (variance.egresos > 0) {
        errors.push(
          `Egresos: Total jerárquico es ${this.formatCurrency(diff)} mayor que el clasificado. Faltan elementos por clasificar.`
        )
      } else {
        errors.push(
          `Egresos: Total clasificado es ${this.formatCurrency(diff)} mayor que el jerárquico. Hay elementos clasificados de más.`
        )
      }
    }

    if (unclassifiedCount > 0) {
      errors.push(`${unclassifiedCount} elementos no pudieron ser clasificados automáticamente`)
    }

    return errors
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  /**
   * Enhanced Excel processor that includes raw data for hierarchy extraction
   * Uses the real excel-processor for classification instead of simplified logic
   */
  async processExcelWithValidation(file: File): Promise<{
    processedData: DebugDataRow[]
    rawData: any[]
    validation: ValidationSummary
  }> {
    // Import the real excel processor
    const { processBalanzaComprobacion } = await import('./excel-processor')
    
    // Import XLSX here to avoid server-side issues
    const XLSX = await import('xlsx')
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          // Extract raw data for hierarchy totals
          const workbook = XLSX.read(e.target?.result, {
            type: 'binary',
            cellNF: true,
            cellDates: true
          })
          const worksheet = workbook.Sheets[workbook.SheetNames[0]]
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

          const rawData: any[] = []
          const startingCode = '4100-0000-000-000'

          // Extract all relevant rows including hierarchy totals
          for (let rowNum = 7; rowNum <= range.e.r; rowNum++) {
            const codigoCell = worksheet[XLSX.utils.encode_cell({ c: 0, r: rowNum })]
            const conceptoCell = worksheet[XLSX.utils.encode_cell({ c: 1, r: rowNum })]
            const cargosCell = worksheet[XLSX.utils.encode_cell({ c: 4, r: rowNum })]
            const abonosCell = worksheet[XLSX.utils.encode_cell({ c: 5, r: rowNum })]

            if (codigoCell && codigoCell.v) {
              const codigo = String(codigoCell.v).trim()
              
              // Include all rows from starting code onwards
              if (codigo >= startingCode) {
                rawData.push({
                  Codigo: codigo,
                  Concepto: conceptoCell ? String(conceptoCell.v).trim() : '',
                  Cargos: cargosCell ? Number(cargosCell.v) : null,
                  Abonos: abonosCell ? Number(abonosCell.v) : null,
                })
              }
            }
          }

          // Use the real excel processor for classification
          const processedData = await processBalanzaComprobacion(file)
          
          // Validate the processed data
          const validation = this.validateData(processedData, rawData)

          console.log(`[ValidationEngine] Processed ${processedData.length} rows, validation: ${validation.isValid}`)
          
          resolve({
            processedData,
            rawData,
            validation
          })
        } catch (error) {
          console.error('[ValidationEngine] Error processing Excel file:', error)
          reject(error)
        }
      }

      reader.onerror = (error) => {
        console.error('[ValidationEngine] File reading error:', error)
        reject(error)
      }

      reader.readAsBinaryString(file)
    })
  }
}

export const validationEngine = new ValidationEngine() 