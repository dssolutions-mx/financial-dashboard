import { createClient } from './client'
import { DebugDataRow } from '../services/excel-processor'
import { detectAndAddMissingClassifications } from '../services/classification-service-client'

export interface FinancialReport {
  id: string
  name: string
  upload_date: string
  month: number
  year: number
  total_records: number
  file_name?: string
  created_at: string
  updated_at: string
}

export interface FinancialDataRow {
  id: string
  report_id: string
  codigo: string
  concepto: string
  abonos: number
  cargos: number
  tipo: string
  categoria_1: string
  sub_categoria: string
  clasificacion: string
  monto: number
  planta: string
  business_unit: string
  volume_m3?: number
  volume_bombeo?: number
  created_at: string
  updated_at: string
}

export interface Classification {
  id: string
  account_code: string
  account_name: string
  management_category: string
  classification: string
  sub_classification: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PlantVolume {
  id: string
  plant_code: string
  business_unit: string
  month: number
  year: number
  category: string
  volume_m3: number
  created_at: string
  updated_at: string
}

export interface CashSale {
  id: string
  plant_code: string
  business_unit: string
  month: number
  year: number
  category: string
  volume_m3: number
  amount_mxn: number
  notes?: string
  created_at: string
  updated_at: string
}

export class SupabaseStorageService {
  private supabase = createClient()

  // Save processed Excel data to Supabase
  async saveFinancialData(
    reportName: string,
    fileName: string,
    month: number,
    year: number,
    data: DebugDataRow[]
  ): Promise<FinancialReport & { newClassificationsAdded?: number }> {
    try {
      // STEP 1: Auto-detect and add missing classifications BEFORE saving the report
      console.log('🔍 Detectando nuevas clasificaciones antes de guardar el reporte...');
      const { newClassifications, totalAdded } = await detectAndAddMissingClassifications(data);
      
      if (totalAdded > 0) {
        console.log(`✅ Se agregaron ${totalAdded} nuevas clasificaciones automáticamente:`, 
          newClassifications.map(c => `${c.codigo_ingresos} - ${c.concepto_ingresos}`));
      } else {
        console.log('✅ No se detectaron nuevas clasificaciones faltantes.');
      }

      // STEP 2: Create the financial report
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

      // STEP 3: Insert all the financial data rows
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

      const { error: dataError } = await this.supabase
        .from('financial_data')
        .insert(financialDataRows)

      if (dataError) throw dataError

      // Return report with info about new classifications added
      return {
        ...report,
        newClassificationsAdded: totalAdded
      }
    } catch (error) {
      console.error('Error saving financial data:', error)
      throw error
    }
  }

  // Get all financial reports
  async getFinancialReports(): Promise<FinancialReport[]> {
    const { data, error } = await this.supabase
      .from('financial_reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Get financial data for a specific report
  async getFinancialData(reportId: string): Promise<FinancialDataRow[]> {
    const { data, error } = await this.supabase
      .from('financial_data')
      .select('*')
      .eq('report_id', reportId)
      .order('codigo')

    if (error) throw error
    return data || []
  }

  // Get financial data with filters
  async getFilteredFinancialData(filters: {
    reportId?: string
    planta?: string
    clasificacion?: string
    month?: number
    year?: number
  }): Promise<FinancialDataRow[]> {
    let query = this.supabase
      .from('financial_data')
      .select(`
        *,
        financial_reports!inner(month, year)
      `)

    if (filters.reportId) {
      query = query.eq('report_id', filters.reportId)
    }
    if (filters.planta) {
      query = query.eq('planta', filters.planta)
    }
    if (filters.clasificacion) {
      query = query.eq('clasificacion', filters.clasificacion)
    }
    if (filters.month) {
      query = query.eq('financial_reports.month', filters.month)
    }
    if (filters.year) {
      query = query.eq('financial_reports.year', filters.year)
    }

    const { data, error } = await query.order('codigo')

    if (error) throw error
    return data || []
  }

  // Update financial data classification
  async updateFinancialDataClassification(
    id: string,
    updates: Partial<FinancialDataRow>
  ): Promise<FinancialDataRow> {
    const { data, error } = await this.supabase
      .from('financial_data')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Update financial data classification by code
  async updateFinancialDataClassificationByCode(
    accountCode: string,
    updates: Partial<FinancialDataRow>
  ): Promise<FinancialDataRow[]> {
    const { data, error } = await this.supabase
      .from('financial_data')
      .update(updates)
      .eq('codigo', accountCode)
      .select()

    if (error) throw error
    return data
  }

  // Get classifications for reclassification module
  async getClassifications(): Promise<Classification[]> {
    const { data, error } = await this.supabase
      .from('classifications')
      .select('*')
      .eq('is_active', true)
      .order('account_code')

    if (error) throw error
    return data || []
  }

  // Update classification
  async updateClassification(
    id: string,
    updates: Partial<Classification>
  ): Promise<Classification> {
    const { data, error } = await this.supabase
      .from('classifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Update classification by code
  async updateClassificationByCode(
    accountCode: string,
    updates: Partial<Classification>
  ): Promise<Classification> {
    // Verificar que el código de cuenta es válido
    if (!accountCode) {
      throw new Error('El código de cuenta es requerido');
    }
    
    try {
      // Primero, intentamos actualizar la clasificación
      const { data, error } = await this.supabase
        .from('classifications')
        .update(updates)
        .eq('account_code', accountCode)
        .select()
        .single();

      if (error) {
        console.error('Error al actualizar clasificación:', error);
        throw error;
      }
      
      if (!data) {
        console.warn(`No se encontró clasificación para el código: ${accountCode}. Creando nueva.`);
        
        // Si no existe, creamos una nueva clasificación
        const newClassification = {
          account_code: accountCode,
          account_name: 'Cuenta sin nombre', // Nombre genérico
          management_category: updates.management_category || '',
          classification: updates.classification || '',
          sub_classification: updates.sub_classification || '',
          is_active: true
        };
        
        const { data: createdData, error: createError } = await this.supabase
          .from('classifications')
          .insert(newClassification)
          .select()
          .single();
          
        if (createError) {
          console.error('Error al crear nueva clasificación:', createError);
          throw createError;
        }
        
        return createdData;
      }
      
      return data;
    } catch (err) {
      console.error('Error en updateClassificationByCode:', err);
      throw err;
    }
  }

  // Add new classification
  async addClassification(classification: Omit<Classification, 'id' | 'created_at' | 'updated_at'>): Promise<Classification> {
    const { data, error } = await this.supabase
      .from('classifications')
      .insert(classification)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Delete classification
  async deleteClassification(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('classifications')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Delete financial report and all associated data with proper cascade handling
  async deleteReport(reportId: string): Promise<void> {
    try {
      // Start a transaction-like approach by checking dependencies first
      console.log(`Starting cascade deletion for report: ${reportId}`)
      
      // First, verify the report exists
      const { data: reportExists, error: checkError } = await this.supabase
        .from('financial_reports')
        .select('id, name')
        .eq('id', reportId)
        .single()

      if (checkError) {
        console.error('Error checking report existence:', checkError)
        throw new Error(`Report with ID ${reportId} not found or inaccessible`)
      }

      if (!reportExists) {
        throw new Error(`Report with ID ${reportId} does not exist`)
      }

      console.log(`Report found: ${reportExists.name}, proceeding with cascade deletion`)

      // Get count of related financial data before deletion
      const { count: dataCount, error: countError } = await this.supabase
        .from('financial_data')
        .select('*', { count: 'exact', head: true })
        .eq('report_id', reportId)

      if (countError) {
        console.error('Error counting related financial data:', countError)
        throw countError
      }

      console.log(`Found ${dataCount || 0} financial data records to delete`)

      // Step 1: Delete all financial data associated with this report (child records first)
      const { error: dataError, count: deletedDataCount } = await this.supabase
        .from('financial_data')
        .delete({ count: 'exact' })
        .eq('report_id', reportId)

      if (dataError) {
        console.error('Error deleting financial data:', dataError)
        throw new Error(`Failed to delete financial data: ${dataError.message}`)
      }

      console.log(`Successfully deleted ${deletedDataCount || 0} financial data records`)

      // Step 2: Delete the financial report itself (parent record)
      const { error: reportError, count: deletedReportCount } = await this.supabase
        .from('financial_reports')
        .delete({ count: 'exact' })
        .eq('id', reportId)

      if (reportError) {
        console.error('Error deleting financial report:', reportError)
        throw new Error(`Failed to delete financial report: ${reportError.message}`)
      }

      if (deletedReportCount === 0) {
        throw new Error('No report was deleted - report may have been deleted by another process')
      }

      console.log(`Successfully completed cascade deletion for report: ${reportExists.name}`)
      console.log(`Total records deleted: ${(deletedDataCount || 0)} data records + 1 report`)

      // Final verification: ensure no orphaned data remains
      const { count: remainingDataCount, error: verifyError } = await this.supabase
        .from('financial_data')
        .select('*', { count: 'exact', head: true })
        .eq('report_id', reportId)

      if (verifyError) {
        console.warn('Could not verify cleanup completion:', verifyError)
      } else if (remainingDataCount && remainingDataCount > 0) {
        console.error(`WARNING: ${remainingDataCount} orphaned financial_data records remain for deleted report ${reportId}`)
        // Note: We don't throw here as the main deletion succeeded, but we log the issue
      } else {
        console.log('Verification passed: No orphaned data remains')
      }

    } catch (error) {
      console.error('Error in cascade deletion:', error)
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Cascade deletion failed: ${error.message}`)
      } else {
        throw new Error('Cascade deletion failed due to unknown error')
      }
    }
  }

  // Get summary data for dashboard
  async getDashboardSummary(month?: number, year?: number) {
    let query = this.supabase
      .from('financial_data')
      .select(`
        clasificacion,
        planta,
        business_unit,
        monto,
        volume_m3,
        volume_bombeo,
        financial_reports!inner(month, year)
      `)

    if (month) {
      query = query.eq('financial_reports.month', month)
    }
    if (year) {
      query = query.eq('financial_reports.year', year)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  // Helper methods
  private getBusinessUnit(planta: string): string {
    const businessUnits: Record<string, string> = {
      'P1': 'BAJIO',
      'P2': 'ITISA', 
      'P3': 'ITISA',
      'P4': 'VIADUCTO',
      'P5': 'BAJIO'
    }
    return businessUnits[planta] || 'UNKNOWN'
  }

  private extractVolume(concepto: string, type: 'concreto' | 'bombeo'): number {
    // This is a simplified version - you can enhance this based on your business logic
    if (type === 'concreto' && concepto.toLowerCase().includes('concreto')) {
      // Extract volume from concept if available
      const match = concepto.match(/(\d+\.?\d*)\s*m3/i)
      return match ? parseFloat(match[1]) : 0
    }
    if (type === 'bombeo' && concepto.toLowerCase().includes('bombeo')) {
      // Extract pumping volume from concept if available
      const match = concepto.match(/(\d+\.?\d*)\s*m3/i)
      return match ? parseFloat(match[1]) : 0
    }
    return 0
  }

  // Export data for compatibility with existing system
  async exportToJSON(reportId?: string): Promise<string> {
    let data: FinancialDataRow[]
    
    if (reportId) {
      data = await this.getFinancialData(reportId)
    } else {
      // Get all data from the most recent report
      const reports = await this.getFinancialReports()
      if (reports.length === 0) return JSON.stringify([])
      data = await this.getFinancialData(reports[0].id)
    }

    // Convert to the format expected by the existing system
    const exportData = data.map(row => ({
      Codigo: row.codigo,
      Concepto: row.concepto,
      Abonos: row.abonos,
      Cargos: row.cargos,
      Tipo: row.tipo,
      'Categoria 1': row.categoria_1,
      'Sub categoria': row.sub_categoria,
      Clasificacion: row.clasificacion,
      Monto: row.monto,
      Planta: row.planta
    }))

    return JSON.stringify(exportData, null, 2)
  }

  // Debug method: Get unique categories and sub_categories for investigation
  async getUniqueCategoriesDebug(): Promise<{
    categoria_1: string[];
    sub_categoria: string[];
    rawMaterialsData: FinancialDataRow[];
  }> {
    const { data, error } = await this.supabase
      .from('financial_data')
      .select('categoria_1, sub_categoria, tipo, monto, concepto')
      .eq('tipo', 'Egresos')

    if (error) throw error

    const uniqueCategoria1 = [...new Set(data?.map(row => row.categoria_1).filter(Boolean))] as string[]
    const uniqueSubCategoria = [...new Set(data?.map(row => row.sub_categoria).filter(Boolean))] as string[]
    
    // Get potential raw materials data for analysis
    const rawMaterialsData = data?.filter(row => 
      row.sub_categoria === "Costo Materias Primas" ||
      ["Cemento", "Agregado Grueso", "Agregado Fino", "Aditivos", "Agua", "Adiciones especiales", "Adiciones Especiales"].includes(row.categoria_1 || "")
    ) as FinancialDataRow[]

    return {
      categoria_1: uniqueCategoria1.sort(),
      sub_categoria: uniqueSubCategoria.sort(),
      rawMaterialsData: rawMaterialsData || []
    }
  }

  // PLANT VOLUMES METHODS

  // Save or update plant volume data
  async saveOrUpdatePlantVolume(
    plantCode: string,
    month: number,
    year: number,
    category: string,
    volumeM3: number
  ): Promise<PlantVolume> {
    try {
      const businessUnit = this.getBusinessUnit(plantCode)
      
      // First, try to find existing record
      const { data: existing, error: findError } = await this.supabase
        .from('plant_volumes')
        .select('*')
        .eq('plant_code', plantCode)
        .eq('month', month)
        .eq('year', year)
        .eq('category', category)
        .single()

      if (findError && findError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw findError
      }

      if (existing) {
        // Update existing record
        const { data, error } = await this.supabase
          .from('plant_volumes')
          .update({ volume_m3: volumeM3 })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Create new record
        const { data, error } = await this.supabase
          .from('plant_volumes')
          .insert({
            plant_code: plantCode,
            business_unit: businessUnit,
            month,
            year,
            category,
            volume_m3: volumeM3
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    } catch (error) {
      console.error('Error saving plant volume:', error)
      throw error
    }
  }

  // Get plant volumes for a specific month/year
  async getPlantVolumes(month: number, year: number): Promise<PlantVolume[]> {
    const { data, error } = await this.supabase
      .from('plant_volumes')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .order('plant_code')

    if (error) throw error
    return data || []
  }

  // Get plant volumes grouped by category and plant
  async getPlantVolumesGrouped(month: number, year: number): Promise<Record<string, Record<string, number>>> {
    const volumes = await this.getPlantVolumes(month, year)
    const grouped: Record<string, Record<string, number>> = {}

    volumes.forEach(volume => {
      if (!grouped[volume.category]) {
        grouped[volume.category] = {}
      }
      grouped[volume.category][volume.plant_code] = volume.volume_m3
    })

    return grouped
  }

  // Bulk save plant volumes (useful for batch operations)
  async bulkSavePlantVolumes(
    volumeData: Array<{
      plantCode: string
      month: number
      year: number
      category: string
      volumeM3: number
    }>
  ): Promise<PlantVolume[]> {
    try {
      const results: PlantVolume[] = []
      
      // Process each volume entry sequentially to handle upserts properly
      for (const item of volumeData) {
        const result = await this.saveOrUpdatePlantVolume(
          item.plantCode,
          item.month,
          item.year,
          item.category,
          item.volumeM3
        )
        results.push(result)
      }

      return results
    } catch (error) {
      console.error('Error bulk saving plant volumes:', error)
      throw error
    }
  }

  // Delete plant volume record
  async deletePlantVolume(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('plant_volumes')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Get all available months/years with volume data
  async getAvailableVolumePeriods(): Promise<Array<{month: number, year: number}>> {
    const { data, error } = await this.supabase
      .from('plant_volumes')
      .select('month, year')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) throw error
    
    // Remove duplicates
    const unique = Array.from(
      new Set(data?.map(item => `${item.year}-${item.month}`))
    ).map(period => {
      const [year, month] = period.split('-').map(Number)
      return { month, year }
    })

    return unique
  }

  // CASH SALES METHODS

  // Save or update cash sale data
  async saveOrUpdateCashSale(
    plantCode: string,
    month: number,
    year: number,
    category: string,
    volumeM3: number,
    amountMxn: number,
    notes?: string
  ): Promise<CashSale> {
    try {
      const businessUnit = this.getBusinessUnit(plantCode)
      
      // First, try to find existing record
      const { data: existing, error: findError } = await this.supabase
        .from('cash_sales')
        .select('*')
        .eq('plant_code', plantCode)
        .eq('month', month)
        .eq('year', year)
        .eq('category', category)
        .single()

      if (findError && findError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw findError
      }

      if (existing) {
        // Update existing record
        const { data, error } = await this.supabase
          .from('cash_sales')
          .update({ 
            volume_m3: volumeM3,
            amount_mxn: amountMxn,
            notes: notes || null
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Create new record
        const { data, error } = await this.supabase
          .from('cash_sales')
          .insert({
            plant_code: plantCode,
            business_unit: businessUnit,
            month,
            year,
            category,
            volume_m3: volumeM3,
            amount_mxn: amountMxn,
            notes: notes || null
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    } catch (error) {
      console.error('Error saving cash sale:', error)
      throw error
    }
  }

  // Get cash sales for a specific month/year
  async getCashSales(month: number, year: number): Promise<CashSale[]> {
    const { data, error } = await this.supabase
      .from('cash_sales')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .order('plant_code')

    if (error) throw error
    return data || []
  }

  // Get cash sales grouped by category and plant
  async getCashSalesGrouped(month: number, year: number): Promise<Record<string, Record<string, { volume: number; amount: number }>>> {
    const cashSales = await this.getCashSales(month, year)
    const grouped: Record<string, Record<string, { volume: number; amount: number }>> = {}

    cashSales.forEach(sale => {
      if (!grouped[sale.category]) {
        grouped[sale.category] = {}
      }
      grouped[sale.category][sale.plant_code] = {
        volume: sale.volume_m3,
        amount: sale.amount_mxn
      }
    })

    return grouped
  }

  // Get cash sales volume grouped by category and plant (for volume calculations)
  async getCashSalesVolumeGrouped(month: number, year: number): Promise<Record<string, Record<string, number>>> {
    const cashSales = await this.getCashSales(month, year)
    const grouped: Record<string, Record<string, number>> = {}

    cashSales.forEach(sale => {
      if (!grouped[sale.category]) {
        grouped[sale.category] = {}
      }
      grouped[sale.category][sale.plant_code] = sale.volume_m3
    })

    return grouped
  }

  // Bulk save cash sales (useful for batch operations)
  async bulkSaveCashSales(
    salesData: Array<{
      plantCode: string
      month: number
      year: number
      category: string
      volumeM3: number
      amountMxn: number
      notes?: string
    }>
  ): Promise<CashSale[]> {
    try {
      const results: CashSale[] = []
      
      // Process each sale entry sequentially to handle upserts properly
      for (const item of salesData) {
        const result = await this.saveOrUpdateCashSale(
          item.plantCode,
          item.month,
          item.year,
          item.category,
          item.volumeM3,
          item.amountMxn,
          item.notes
        )
        results.push(result)
      }

      return results
    } catch (error) {
      console.error('Error bulk saving cash sales:', error)
      throw error
    }
  }

  // Delete cash sale record
  async deleteCashSale(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('cash_sales')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Get cash sales totals for a specific month/year
  async getCashSalesTotals(month: number, year: number): Promise<{
    totalVolume: number;
    totalAmount: number;
    byCategory: Record<string, { volume: number; amount: number }>;
    byPlant: Record<string, { volume: number; amount: number }>;
  }> {
    const cashSales = await this.getCashSales(month, year)
    
    let totalVolume = 0
    let totalAmount = 0
    const byCategory: Record<string, { volume: number; amount: number }> = {}
    const byPlant: Record<string, { volume: number; amount: number }> = {}

    cashSales.forEach(sale => {
      totalVolume += sale.volume_m3
      totalAmount += sale.amount_mxn

      // By category
      if (!byCategory[sale.category]) {
        byCategory[sale.category] = { volume: 0, amount: 0 }
      }
      byCategory[sale.category].volume += sale.volume_m3
      byCategory[sale.category].amount += sale.amount_mxn

      // By plant
      if (!byPlant[sale.plant_code]) {
        byPlant[sale.plant_code] = { volume: 0, amount: 0 }
      }
      byPlant[sale.plant_code].volume += sale.volume_m3
      byPlant[sale.plant_code].amount += sale.amount_mxn
    })

    return {
      totalVolume,
      totalAmount,
      byCategory,
      byPlant
    }
  }

  // Get combined volume data (fiscal + cash) for enhanced calculations
  async getCombinedVolumeData(month: number, year: number): Promise<{
    fiscal: Record<string, Record<string, number>>;
    cash: Record<string, Record<string, number>>;
    totals: Record<string, Record<string, number>>;
  }> {
    const [fiscalVolumes, cashVolumes] = await Promise.all([
      this.getPlantVolumesGrouped(month, year),
      this.getCashSalesVolumeGrouped(month, year)
    ])

    // Calculate totals by combining fiscal and cash volumes
    const totals: Record<string, Record<string, number>> = {}
    
    // Start with fiscal volumes
    Object.keys(fiscalVolumes).forEach(category => {
      totals[category] = { ...fiscalVolumes[category] }
    })

    // Add cash volumes
    Object.keys(cashVolumes).forEach(category => {
      if (!totals[category]) {
        totals[category] = {}
      }
      
      Object.keys(cashVolumes[category]).forEach(plant => {
        if (!totals[category][plant]) {
          totals[category][plant] = 0
        }
        totals[category][plant] += cashVolumes[category][plant]
      })
    })

    return {
      fiscal: fiscalVolumes,
      cash: cashVolumes,
      totals
    }
  }
}

// Create a singleton instance
export const supabaseStorage = new SupabaseStorageService() 