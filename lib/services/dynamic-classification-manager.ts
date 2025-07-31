import { createClient } from '@/lib/supabase/client'
import { DebugDataRow } from './excel-processor'

export interface ClassificationChange {
  accountCode: string
  oldClassification: {
    tipo: string
    categoria_1: string
    sub_categoria: string
    clasificacion: string
  }
  newClassification: {
    tipo: string
    categoria_1: string
    sub_categoria: string
    clasificacion: string
  }
  amount: number
  reportId: string
}

export interface ClassificationRule {
  id?: string
  account_code: string
  account_name?: string
  account_type: string
  division: string
  product_service: string
  detail: string
  hierarchy_level: number
  family_code: string
  tipo: string
  categoria_1: string
  sub_categoria: string
  clasificacion: string
  plant_pattern?: string
  priority?: number
  is_active: boolean
  effective_from: string
  effective_to?: string
  created_by?: string
  approved_by?: string
  created_at?: string
  updated_at?: string
}

export class DynamicClassificationManager {
  private supabase = createClient()

  /**
   * Step 1: Process Excel file with existing classifications
   */
  async processExcelWithExistingClassifications(
    processedData: DebugDataRow[],
    reportName: string,
    fileName: string,
    month: number,
    year: number
  ): Promise<{
    processedData: DebugDataRow[]
    unclassifiedAccounts: Array<{
      codigo: string
      concepto: string
      monto: number
    }>
    classificationSummary: {
      totalAccounts: number
      classifiedAccounts: number
      unclassifiedAccounts: number
      totalAmount: number
      classifiedAmount: number
      unclassifiedAmount: number
    }
  }> {
    // Get existing classification rules from database
    const { data: existingRules, error: rulesError } = await this.supabase
      .from('classification_rules')
      .select('*')
      .eq('is_active', true)

    if (rulesError) {
      console.error('Error loading classification rules:', rulesError)
      throw new Error('Failed to load classification rules')
    }

    // Create lookup map for faster access
    const classificationMap = new Map<string, ClassificationRule>()
    existingRules?.forEach(rule => {
      classificationMap.set(rule.account_code, rule)
    })

    // Apply existing classifications to processed data
    const processedWithClassifications = processedData.map(row => {
      const existingRule = classificationMap.get(row.Codigo)
      
      if (existingRule) {
        return {
          ...row,
          Tipo: existingRule.tipo,
          'Categoria 1': existingRule.categoria_1,
          'Sub categoria': existingRule.sub_categoria,
          Clasificacion: existingRule.clasificacion
        }
      }
      
      return row
    })

    // Calculate summary statistics
    const totalAccounts = processedWithClassifications.length
    const classifiedAccounts = processedWithClassifications.filter(row => 
      row.Tipo !== 'Indefinido' && row.Tipo !== 'Sin Categoría'
    ).length
    const unclassifiedAccounts = totalAccounts - classifiedAccounts
    
    const totalAmount = processedWithClassifications.reduce((sum, row) => sum + Math.abs(row.Monto), 0)
    const classifiedAmount = processedWithClassifications
      .filter(row => row.Tipo !== 'Indefinido' && row.Tipo !== 'Sin Categoría')
      .reduce((sum, row) => sum + Math.abs(row.Monto), 0)
    const unclassifiedAmount = totalAmount - classifiedAmount

    // Identify unclassified accounts for user review
    const unclassifiedAccountsList = processedWithClassifications
      .filter(row => row.Tipo === 'Indefinido' || row.Tipo === 'Sin Categoría')
      .map(row => ({
        codigo: row.Codigo,
        concepto: row.Concepto,
        monto: row.Monto
      }))

    return {
      processedData: processedWithClassifications,
      unclassifiedAccounts: unclassifiedAccountsList,
      classificationSummary: {
        totalAccounts,
        classifiedAccounts,
        unclassifiedAccounts,
        totalAmount,
        classifiedAmount,
        unclassifiedAmount
      }
    }
  }

  /**
   * Step 2: Apply user classification changes
   */
  async applyUserClassificationChanges(
    changes: ClassificationChange[],
    userId: string,
    currentData?: DebugDataRow[]
  ): Promise<{
    updatedData: DebugDataRow[]
    newRulesCreated: number
    existingRulesUpdated: number
  }> {
    let newRulesCreated = 0
    let existingRulesUpdated = 0

    for (const change of changes) {
      // Parse account structure
      const structure = this.parseAccountStructure(change.accountCode)
      
      // Check if rule already exists
      const { data: existingRule, error: fetchError } = await this.supabase
        .from('classification_rules')
        .select('*')
        .eq('account_code', change.accountCode)
        .eq('is_active', true)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing rule:', fetchError)
        continue
      }

      if (existingRule) {
        // Update existing rule
        const { error: updateError } = await this.supabase
          .from('classification_rules')
          .update({
            tipo: change.newClassification.tipo,
            categoria_1: change.newClassification.categoria_1,
            sub_categoria: change.newClassification.sub_categoria,
            clasificacion: change.newClassification.clasificacion,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRule.id)

        if (!updateError) {
          existingRulesUpdated++
        }
      } else {
        // Create new rule
        const { error: createError } = await this.supabase
          .from('classification_rules')
          .insert({
            account_code: change.accountCode,
            account_name: '', // Will be filled from data
            account_type: structure.account_type,
            division: structure.division,
            product_service: structure.product_service,
            detail: structure.detail,
            hierarchy_level: structure.hierarchy_level,
            family_code: structure.family_code,
            tipo: change.newClassification.tipo,
            categoria_1: change.newClassification.categoria_1,
            sub_categoria: change.newClassification.sub_categoria,
            clasificacion: change.newClassification.clasificacion,
            is_active: true,
            effective_from: new Date().toISOString(),
            created_by: userId
          })

        if (!createError) {
          newRulesCreated++
        }
      }
    }

    // Apply changes to current data if provided
    let updatedData: DebugDataRow[] = []
    if (currentData) {
      const changesMap = new Map<string, ClassificationChange>()
      changes.forEach(change => {
        changesMap.set(change.accountCode, change)
      })

      updatedData = currentData.map(row => {
        const change = changesMap.get(row.Codigo)
        if (change) {
          return {
            ...row,
            Tipo: change.newClassification.tipo,
            'Categoria 1': change.newClassification.categoria_1,
            'Sub categoria': change.newClassification.sub_categoria,
            Clasificacion: change.newClassification.clasificacion
          }
        }
        return row
      })
    } else {
      // Return empty array if no current data provided
      updatedData = []
    }

    return {
      updatedData,
      newRulesCreated,
      existingRulesUpdated
    }
  }

  /**
   * Step 3: Save data with updated classifications to database
   */
  async saveDataWithUpdatedClassifications(
    data: DebugDataRow[],
    reportName: string,
    fileName: string,
    month: number,
    year: number
  ): Promise<{
    reportId: string
    savedRecords: number
    totalAmount: number
  }> {
    try {
      // Create financial report
      const { data: report, error: reportError } = await this.supabase
        .from('financial_reports')
        .insert({
          name: reportName,
          month,
          year,
          total_records: data.length,
          file_name: fileName
        })
        .select()
        .single()

      if (reportError) throw reportError

      // Prepare financial data rows
      const financialDataRows = data.map(row => ({
        report_id: report.id,
        codigo: row.Codigo,
        concepto: row.Concepto,
        abonos: row.Abonos || 0,
        cargos: row.Cargos || 0,
        tipo: row.Tipo,
        categoria_1: row['Categoria 1'],
        sub_categoria: row['Sub categoria'],
        clasificacion: row.Clasificacion,
        monto: row.Monto,
        planta: row.Planta,
        business_unit: this.getBusinessUnit(row.Planta),
        volume_m3: this.extractVolume(row.Concepto, 'concreto'),
        volume_bombeo: this.extractVolume(row.Concepto, 'bombeo')
      }))

      // Insert financial data
      const { error: dataError } = await this.supabase
        .from('financial_data')
        .insert(financialDataRows)

      if (dataError) throw dataError

      const totalAmount = data.reduce((sum, row) => sum + Math.abs(row.Monto), 0)

      return {
        reportId: report.id,
        savedRecords: data.length,
        totalAmount
      }
    } catch (error) {
      console.error('Error saving financial data:', error)
      throw error
    }
  }

  /**
   * Step 4: Update classification rules for future Excel files
   */
  async updateClassificationRulesForFutureUse(
    changes: ClassificationChange[],
    userId: string
  ): Promise<{
    rulesUpdated: number
    rulesCreated: number
    totalImpact: number
  }> {
    let rulesUpdated = 0
    let rulesCreated = 0
    let totalImpact = 0

    for (const change of changes) {
      const structure = this.parseAccountStructure(change.accountCode)
      totalImpact += Math.abs(change.amount)

      // Check if rule exists
      const { data: existingRule } = await this.supabase
        .from('classification_rules')
        .select('*')
        .eq('account_code', change.accountCode)
        .eq('is_active', true)
        .single()

      if (existingRule) {
        // Update existing rule
        const { error: updateError } = await this.supabase
          .from('classification_rules')
          .update({
            tipo: change.newClassification.tipo,
            categoria_1: change.newClassification.categoria_1,
            sub_categoria: change.newClassification.sub_categoria,
            clasificacion: change.newClassification.clasificacion,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRule.id)

        if (!updateError) {
          rulesUpdated++
        }
      } else {
        // Create new rule for future use
        const { error: createError } = await this.supabase
          .from('classification_rules')
          .insert({
            account_code: change.accountCode,
            account_name: '', // Will be filled from future data
            account_type: structure.account_type,
            division: structure.division,
            product_service: structure.product_service,
            detail: structure.detail,
            hierarchy_level: structure.hierarchy_level,
            family_code: structure.family_code,
            tipo: change.newClassification.tipo,
            categoria_1: change.newClassification.categoria_1,
            sub_categoria: change.newClassification.sub_categoria,
            clasificacion: change.newClassification.clasificacion,
            is_active: true,
            effective_from: new Date().toISOString(),
            created_by: userId
          })

        if (!createError) {
          rulesCreated++
        }
      }
    }

    return {
      rulesUpdated,
      rulesCreated,
      totalImpact
    }
  }

  /**
   * Complete workflow: Process Excel → Apply Changes → Save → Update Rules
   */
  async processExcelWithUserChanges(
    processedData: DebugDataRow[],
    userChanges: ClassificationChange[],
    reportName: string,
    fileName: string,
    month: number,
    year: number,
    userId: string
  ): Promise<{
    finalData: DebugDataRow[]
    reportId: string
    summary: {
      totalAccounts: number
      classifiedAccounts: number
      unclassifiedAccounts: number
      totalAmount: number
      classifiedAmount: number
      unclassifiedAmount: number
      newRulesCreated: number
      existingRulesUpdated: number
      rulesUpdatedForFuture: number
      rulesCreatedForFuture: number
    }
  }> {
    // Step 1: Process with existing classifications
    const initialResult = await this.processExcelWithExistingClassifications(
      processedData,
      reportName,
      fileName,
      month,
      year
    )

    // Step 2: Apply user changes
    const changeResult = await this.applyUserClassificationChanges(userChanges, userId, initialResult.processedData)

    // Step 3: Save data with updated classifications
    const saveResult = await this.saveDataWithUpdatedClassifications(
      changeResult.updatedData,
      reportName,
      fileName,
      month,
      year
    )

    // Step 4: Update rules for future use
    const ruleResult = await this.updateClassificationRulesForFutureUse(userChanges, userId)

    // Calculate final summary
    const finalData = changeResult.updatedData
    const finalClassifiedAccounts = finalData.filter(row => 
      row.Tipo !== 'Indefinido' && row.Tipo !== 'Sin Categoría'
    ).length
    const finalUnclassifiedAccounts = finalData.length - finalClassifiedAccounts
    const finalClassifiedAmount = finalData
      .filter(row => row.Tipo !== 'Indefinido' && row.Tipo !== 'Sin Categoría')
      .reduce((sum, row) => sum + Math.abs(row.Monto), 0)
    const finalUnclassifiedAmount = finalData.reduce((sum, row) => sum + Math.abs(row.Monto), 0) - finalClassifiedAmount

    return {
      finalData,
      reportId: saveResult.reportId,
      summary: {
        totalAccounts: finalData.length,
        classifiedAccounts: finalClassifiedAccounts,
        unclassifiedAccounts: finalUnclassifiedAccounts,
        totalAmount: finalData.reduce((sum, row) => sum + Math.abs(row.Monto), 0),
        classifiedAmount: finalClassifiedAmount,
        unclassifiedAmount: finalUnclassifiedAmount,
        newRulesCreated: changeResult.newRulesCreated,
        existingRulesUpdated: changeResult.existingRulesUpdated,
        rulesUpdatedForFuture: ruleResult.rulesUpdated,
        rulesCreatedForFuture: ruleResult.rulesCreated
      }
    }
  }

  // Helper methods
  private parseAccountStructure(accountCode: string) {
    const parts = accountCode.split('-')
    return {
      account_type: parts[0] || '',
      division: parts[1] || '',
      product_service: parts[2] || '',
      detail: parts[3] || '',
      hierarchy_level: this.calculateHierarchyLevel(accountCode),
      family_code: `${parts[0]}-${parts[1]}` || ''
    }
  }

  private calculateHierarchyLevel(accountCode: string): number {
    const parts = accountCode.split('-')
    if (parts[3] && parts[3] !== '000') return 4
    if (parts[2] && parts[2] !== '000') return 3
    if (parts[1] && parts[1] !== '0000') return 2
    return 1
  }

  private async getUpdatedDataWithClassifications(changes: ClassificationChange[]): Promise<DebugDataRow[]> {
    // Create a map of changes for quick lookup
    const changesMap = new Map<string, ClassificationChange>()
    changes.forEach(change => {
      changesMap.set(change.accountCode, change)
    })

    // Get current data from the database or return the processed data with changes applied
    // For now, we'll return the processed data with changes applied
    // This would typically load from the current session or database
    return []
  }

  private getBusinessUnit(planta: string): string {
    const plantMap: { [key: string]: string } = {
      'P1': 'Planta 1',
      'P2': 'Planta 2', 
      'P3': 'Planta 3',
      'P4': 'Planta 4',
      'P5': 'Planta 5',
      'MEXICALI': 'Mexicali'
    }
    return plantMap[planta] || 'Sin Clasificación'
  }

  private extractVolume(concepto: string, type: 'concreto' | 'bombeo'): number {
    // Extract volume from concepto string
    const volumeMatch = concepto.match(/(\d+(?:\.\d+)?)\s*m3/i)
    return volumeMatch ? parseFloat(volumeMatch[1]) : 0
  }
} 