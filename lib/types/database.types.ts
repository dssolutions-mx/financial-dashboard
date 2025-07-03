export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      financial_reports: {
        Row: {
          id: string
          name: string
          upload_date: string | null
          month: number
          year: number
          total_records: number | null
          file_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          upload_date?: string | null
          month: number
          year: number
          total_records?: number | null
          file_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          upload_date?: string | null
          month?: number
          year?: number
          total_records?: number | null
          file_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_data: {
        Row: {
          id: string
          report_id: string | null
          codigo: string | null
          concepto: string | null
          abonos: number | null
          cargos: number | null
          tipo: string | null
          categoria_1: string | null
          sub_categoria: string | null
          clasificacion: string | null
          monto: number | null
          planta: string | null
          business_unit: string | null
          volume_m3: number | null
          volume_bombeo: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          report_id?: string | null
          codigo?: string | null
          concepto?: string | null
          abonos?: number | null
          cargos?: number | null
          tipo?: string | null
          categoria_1?: string | null
          sub_categoria?: string | null
          clasificacion?: string | null
          monto?: number | null
          planta?: string | null
          business_unit?: string | null
          volume_m3?: number | null
          volume_bombeo?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          report_id?: string | null
          codigo?: string | null
          concepto?: string | null
          abonos?: number | null
          cargos?: number | null
          tipo?: string | null
          categoria_1?: string | null
          sub_categoria?: string | null
          clasificacion?: string | null
          monto?: number | null
          planta?: string | null
          business_unit?: string | null
          volume_m3?: number | null
          volume_bombeo?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_data_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "financial_reports"
            referencedColumns: ["id"]
          }
        ]
      }
      classifications: {
        Row: {
          id: string
          account_code: string | null
          account_name: string | null
          management_category: string | null
          classification: string | null
          sub_classification: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          account_code?: string | null
          account_name?: string | null
          management_category?: string | null
          classification?: string | null
          sub_classification?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          account_code?: string | null
          account_name?: string | null
          management_category?: string | null
          classification?: string | null
          sub_classification?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      plant_volumes: {
        Row: {
          id: string
          plant_code: string
          business_unit: string
          month: number
          year: number
          category: string
          volume_m3: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          plant_code: string
          business_unit: string
          month: number
          year: number
          category: string
          volume_m3?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          plant_code?: string
          business_unit?: string
          month?: number
          year?: number
          category?: string
          volume_m3?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cash_sales: {
        Row: {
          id: string
          plant_code: string
          business_unit: string
          month: number
          year: number
          category: string
          volume_m3: number | null
          amount_mxn: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          plant_code: string
          business_unit: string
          month: number
          year: number
          category: string
          volume_m3?: number | null
          amount_mxn?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          plant_code?: string
          business_unit?: string
          month?: number
          year?: number
          category?: string
          volume_m3?: number | null
          amount_mxn?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 