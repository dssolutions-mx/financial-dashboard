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
      // Enhanced Dynamic Classification System Tables
      classification_rules: {
        Row: {
          id: string
          account_code: string
          account_name: string | null
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
          plant_pattern: string | null
          priority: number | null
          is_active: boolean | null
          effective_from: string
          effective_to: string | null
          created_by: string | null
          approved_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          account_code: string
          account_name?: string | null
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
          plant_pattern?: string | null
          priority?: number | null
          is_active?: boolean | null
          effective_from?: string
          effective_to?: string | null
          created_by?: string | null
          approved_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          account_code?: string
          account_name?: string | null
          account_type?: string
          division?: string
          product_service?: string
          detail?: string
          hierarchy_level?: number
          family_code?: string
          tipo?: string
          categoria_1?: string
          sub_categoria?: string
          clasificacion?: string
          plant_pattern?: string | null
          priority?: number | null
          is_active?: boolean | null
          effective_from?: string
          effective_to?: string | null
          created_by?: string | null
          approved_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      account_hierarchies: {
        Row: {
          id: string
          account_code: string
          account_name: string
          account_type: string
          division: string
          product_service: string
          detail: string
          hierarchy_level: number
          family_code: string
          parent_code: string | null
          is_leaf_node: boolean
          report_id: string
          actual_amount: number
          calculated_amount: number | null
          variance: number | null
          variance_percentage: number | null
          classification_status: 'CLASSIFIED' | 'UNCLASSIFIED' | 'IMPLICITLY_CLASSIFIED'
          validation_status: 'PERFECT' | 'MINOR_VARIANCE' | 'MAJOR_VARIANCE' | 'CRITICAL_MISMATCH' | 'PENDING'
          confidence_score: number | null
          detected_at: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          id?: string
          account_code: string
          account_name: string
          account_type: string
          division: string
          product_service: string
          detail: string
          hierarchy_level: number
          family_code: string
          parent_code?: string | null
          is_leaf_node?: boolean
          report_id: string
          actual_amount: number
          calculated_amount?: number | null
          variance?: number | null
          variance_percentage?: number | null
          classification_status?: 'CLASSIFIED' | 'UNCLASSIFIED' | 'IMPLICITLY_CLASSIFIED'
          validation_status?: 'PERFECT' | 'MINOR_VARIANCE' | 'MAJOR_VARIANCE' | 'CRITICAL_MISMATCH' | 'PENDING'
          confidence_score?: number | null
          detected_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          id?: string
          account_code?: string
          account_name?: string
          account_type?: string
          division?: string
          product_service?: string
          detail?: string
          hierarchy_level?: number
          family_code?: string
          parent_code?: string | null
          is_leaf_node?: boolean
          report_id?: string
          actual_amount?: number
          calculated_amount?: number | null
          variance?: number | null
          variance_percentage?: number | null
          classification_status?: 'CLASSIFIED' | 'UNCLASSIFIED' | 'IMPLICITLY_CLASSIFIED'
          validation_status?: 'PERFECT' | 'MINOR_VARIANCE' | 'MAJOR_VARIANCE' | 'CRITICAL_MISMATCH' | 'PENDING'
          confidence_score?: number | null
          detected_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_hierarchies_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "financial_reports"
            referencedColumns: ["id"]
          }
        ]
      }
      // hierarchy_alerts table removed - was unused issue detector functionality
      family_validation_results: {
        Row: {
          id: string
          report_id: string
          family_code: string
          family_name: string
          total_amount: number
          level4_count: number | null
          level3_count: number | null
          level2_count: number | null
          level1_count: number | null
          level4_classified: number | null
          level3_classified: number | null
          level2_classified: number | null
          level1_classified: number | null
          has_issues: boolean | null
          issue_count: number | null
          financial_impact: number | null
          completeness_percentage: number | null
          recommended_approach: 'DETAIL_CLASSIFICATION' | 'SUMMARY_CLASSIFICATION' | 'HIGH_LEVEL_CLASSIFICATION' | null
          current_completeness: number | null
          validated_at: string | null
        }
        Insert: {
          id?: string
          report_id: string
          family_code: string
          family_name: string
          total_amount: number
          level4_count?: number | null
          level3_count?: number | null
          level2_count?: number | null
          level1_count?: number | null
          level4_classified?: number | null
          level3_classified?: number | null
          level2_classified?: number | null
          level1_classified?: number | null
          has_issues?: boolean | null
          issue_count?: number | null
          financial_impact?: number | null
          completeness_percentage?: number | null
          recommended_approach?: 'DETAIL_CLASSIFICATION' | 'SUMMARY_CLASSIFICATION' | 'HIGH_LEVEL_CLASSIFICATION' | null
          current_completeness?: number | null
          validated_at?: string | null
        }
        Update: {
          id?: string
          report_id?: string
          family_code?: string
          family_name?: string
          total_amount?: number
          level4_count?: number | null
          level3_count?: number | null
          level2_count?: number | null
          level1_count?: number | null
          level4_classified?: number | null
          level3_classified?: number | null
          level2_classified?: number | null
          level1_classified?: number | null
          has_issues?: boolean | null
          issue_count?: number | null
          financial_impact?: number | null
          completeness_percentage?: number | null
          recommended_approach?: 'DETAIL_CLASSIFICATION' | 'SUMMARY_CLASSIFICATION' | 'HIGH_LEVEL_CLASSIFICATION' | null
          current_completeness?: number | null
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_validation_results_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "financial_reports"
            referencedColumns: ["id"]
          }
        ]
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
      get_hierarchy_level: {
        Args: {
          account_code: string
        }
        Returns: number
      }
      get_family_code: {
        Args: {
          account_code: string
        }
        Returns: string
      }
      get_parent_code: {
        Args: {
          account_code: string
        }
        Returns: string | null
      }
      validate_hierarchy_amounts: {
        Args: {
          report_uuid: string
        }
        Returns: {
          parent_code: string
          parent_name: string
          parent_amount: number
          children_sum: number
          variance: number
          validation_status: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 