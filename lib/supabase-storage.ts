import { createClient } from './supabase/client'
import { DebugDataRow } from './excel-processor'

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

export class SupabaseStorageService {
  private supabase = createClient()

  // Save processed Excel data to Supabase
  async saveFinancialData(
    reportName: string,
    fileName: string,
    month: number,
    year: number,
    data: DebugDataRow[]
  ): Promise<FinancialReport> {
    try {
      // First, create the financial report
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

      // Then, insert all the financial data rows
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

      return report
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
}

// Create a singleton instance
export const supabaseStorage = new SupabaseStorageService() 