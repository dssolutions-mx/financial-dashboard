import { DebugDataRow } from './excel-processor'

// Keep existing interfaces for backward compatibility
export interface ValidationSummary {
  hierarchyTotals: {
    ingresos: number
    egresos: number
  }
  classifiedTotals: {
    ingresos: number
    egresos: number
  }
  unclassifiedItems: DebugDataRow[]
  isValid: boolean
  variance: {
    ingresos: number
    egresos: number
  }
  validationErrors: string[]
}

// New interface for family-based validation results
// Family validation interfaces removed - no longer used

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
   * Helper method to determine if an item is fully classified
   * Uses the same criteria as the debug modal for consistency
   */
  private isFullyClassified(row: DebugDataRow): boolean {
    const hasValidTipo = Boolean(row.Tipo && row.Tipo !== "Indefinido")
    const hasValidCategoria1 = Boolean(row['Categoria 1'] && row['Categoria 1'] !== "Sin Categoría")
    return hasValidTipo && hasValidCategoria1
  }

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
   * Enhanced family-based validation that replaces simple hierarchy validation
   * This method integrates the sophisticated family validator with the existing workflow
   */
  /**
   * Enhanced validation with family analysis
   * DEPRECATED: This method is no longer used as family validation was removed from the UI
   */
  async validateDataWithFamilyAnalysis(
    processedData: DebugDataRow[], 
    rawData?: any[], 
    reportId?: string
  ): Promise<ValidationSummary> {
    // This method is deprecated - use validateData instead
    console.warn('validateDataWithFamilyAnalysis is deprecated. Use validateData for basic validation.')
    return this.validateData(processedData, rawData)
  }

  // Family validation methods removed - no longer used

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
        // CORREGIDO: Make egresos negative to match sign convention used in processed data
        const cargos = row.Cargos || 0
        const abonos = row.Abonos || 0
        egresos = -(cargos - abonos) // Make negative to match classified data sign convention
        console.log(`[ValidationEngine] Egresos hierarchy found: Cargos=${cargos}, Abonos=${abonos}, Total=${egresos} (made negative to match sign convention)`)
      }
    }

    console.log(`[ValidationEngine] Final hierarchy totals: Ingresos=${ingresos}, Egresos=${egresos}`)
    return { ingresos, egresos }
  }

  /**
   * Calculate totals from classified data
   * Only count items that have been properly classified (not hierarchy rows)
   * CORREGIDO: Usar los mismos criterios que el debug modal - requiere Tipo Y Categoria 1
   */
  private calculateClassifiedTotals(processedData: DebugDataRow[]): { ingresos: number; egresos: number } {
    let ingresos = 0
    let egresos = 0

    for (const row of processedData) {
      // Skip hierarchy rows in processed data
      if (row.Codigo === this.HIERARCHY_CODES.INGRESOS || row.Codigo === this.HIERARCHY_CODES.EGRESOS) {
        continue
      }

      // Only count fully classified items (same logic as debug modal)
      if (this.isFullyClassified(row)) {
        if (row.Tipo === 'Ingresos') {
          // CORREGIDO: Para ingresos, usar el monto exactamente como viene (preserva signo para devoluciones)
          ingresos += row.Monto
        } else if (row.Tipo === 'Egresos') {
          // TEMPORAL: Log both approaches to determine which is correct
          egresos += row.Monto
        }
      }
    }

    console.log(`[ValidationEngine] Classified totals (matching debug modal criteria): Ingresos=${ingresos}, Egresos=${egresos}`)
    
    // DEBUG: Log individual account contributions to understand sign conventions
    console.log(`[ValidationEngine] DETAILED BREAKDOWN:`)
    const ingresosItems: any[] = []
    const egresosItems: any[] = []
    
    for (const row of processedData) {
      if (row.Codigo === this.HIERARCHY_CODES.INGRESOS || row.Codigo === this.HIERARCHY_CODES.EGRESOS) {
        continue
      }
      
      if (this.isFullyClassified(row)) {
        if (row.Tipo === 'Ingresos') {
          ingresosItems.push({ codigo: row.Codigo, concepto: row.Concepto, monto: row.Monto })
        } else if (row.Tipo === 'Egresos') {
          egresosItems.push({ codigo: row.Codigo, concepto: row.Concepto, monto: row.Monto })
        }
      }
    }
    
    console.log(`[ValidationEngine] Classified Ingresos items (${ingresosItems.length}):`, ingresosItems.slice(0, 5))
    console.log(`[ValidationEngine] Classified Egresos items (${egresosItems.length}):`, egresosItems.slice(0, 5))
    console.log(`[ValidationEngine] Ingresos amounts sign analysis:`, {
      positive: ingresosItems.filter(i => i.monto > 0).length,
      negative: ingresosItems.filter(i => i.monto < 0).length,
      totalSum: ingresosItems.reduce((sum, i) => sum + i.monto, 0)
    })
    console.log(`[ValidationEngine] Egresos amounts sign analysis:`, {
      positive: egresosItems.filter(i => i.monto > 0).length,
      negative: egresosItems.filter(i => i.monto < 0).length,
      totalSum: egresosItems.reduce((sum, i) => sum + i.monto, 0),
      totalSumAbs: egresosItems.reduce((sum, i) => sum + Math.abs(i.monto), 0)
    })
    console.log(`[ValidationEngine] COMPARISON OF EGRESOS CALCULATION METHODS:`)
    console.log(`[ValidationEngine] Current method (preserving signs): ${egresos}`)
    console.log(`[ValidationEngine] Alternative method (Math.abs): ${egresosItems.reduce((sum, i) => sum + Math.abs(i.monto), 0)}`)
    
    return { ingresos, egresos }
  }

  /**
   * Identify items that couldn't be properly classified
   * Excludes hierarchy rows which should not be classified
   * CORREGIDO: Usar los mismos criterios que el debug modal - requiere Tipo Y Categoria 1
   */
  private identifyUnclassifiedItems(processedData: DebugDataRow[]): DebugDataRow[] {
    return processedData.filter(row => {
      // Skip hierarchy rows - they should not be classified
      if (row.Codigo === this.HIERARCHY_CODES.INGRESOS || row.Codigo === this.HIERARCHY_CODES.EGRESOS) {
        return false
      }
      
      // Return rows that are not fully classified (missing either Tipo or Categoria 1)
      return !this.isFullyClassified(row)
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