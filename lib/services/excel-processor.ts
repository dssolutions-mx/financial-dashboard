import * as XLSX from 'xlsx';
import React from 'react';

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

// Load the unified classifications from the JSON file
const UNIFIED_CLASSIFICATIONS: UnifiedClassification[] = [
  {
    "categoria_ingresos": "Ventas Concreto",
    "codigo_ingresos": "4100-1000-001-000",
    "concepto_ingresos": "Concreto Sil P1",
    "concepto_gerencia": "Ventas Concreto",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Ventas",
    "sub_sub_clasificacion_gerencia": "Ventas"
  },
  {
    "categoria_ingresos": "Ventas Concreto",
    "codigo_ingresos": "4100-2000-001-000",
    "concepto_ingresos": "Concreto TI P-2",
    "concepto_gerencia": "Ventas Concreto",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Ventas",
    "sub_sub_clasificacion_gerencia": "Ventas"
  },
  {
    "categoria_ingresos": "Ventas Concreto",
    "codigo_ingresos": "4100-3000-001-000",
    "concepto_ingresos": "Concreto TI P3",
    "concepto_gerencia": "Ventas Concreto",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Ventas",
    "sub_sub_clasificacion_gerencia": "Ventas"
  },
  {
    "categoria_ingresos": "Ventas Concreto",
    "codigo_ingresos": "4100-5000-001-000",
    "concepto_ingresos": "Concreto TI P-4",
    "concepto_gerencia": "Ventas Concreto",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Ventas",
    "sub_sub_clasificacion_gerencia": "Ventas"
  },
  {
    "categoria_ingresos": "Ventas Concreto",
    "codigo_ingresos": "4100-8000-001-000",
    "concepto_ingresos": "Concreto Mexicali",
    "concepto_gerencia": "Ventas Concreto",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Ventas",
    "sub_sub_clasificacion_gerencia": "Ventas"
  },
  {
    "categoria_ingresos": "Ventas Concreto",
    "codigo_ingresos": "4100-4000-000-000",
    "concepto_ingresos": "Ventas publico Tijuana P-1 8%",
    "concepto_gerencia": "Ventas Concreto",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Ventas",
    "sub_sub_clasificacion_gerencia": "Ventas"
  },
  {
    "categoria_ingresos": "Ventas Productos Alternativos",
    "codigo_ingresos": "4100-1000-003-000",
    "concepto_ingresos": "Base H Triturado Basalto 1 1/2\" a Finos",
    "concepto_gerencia": "Ventas Productos Alternativos",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Ventas",
    "sub_sub_clasificacion_gerencia": "Ventas"
  },
  {
    "categoria_ingresos": "Ventas Bombeo",
    "codigo_ingresos": "4100-1000-004-000",
    "concepto_ingresos": "Bombeo Sil P1",
    "concepto_gerencia": "Ventas Bombeo",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Ventas Bombeo",
    "sub_sub_clasificacion_gerencia": "Ventas Bombeo"
  },
  {
    "categoria_ingresos": "Ventas Bombeo",
    "codigo_ingresos": "4100-2000-002-000",
    "concepto_ingresos": "Bombeo TI P-2",
    "concepto_gerencia": "Ventas Bombeo",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Ventas Bombeo",
    "sub_sub_clasificacion_gerencia": "Ventas Bombeo"
  },
  {
    "categoria_ingresos": "Ventas Bombeo",
    "codigo_ingresos": "4100-3000-002-000",
    "concepto_ingresos": "Bombeo TI P3",
    "concepto_gerencia": "Ventas Bombeo",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Ventas Bombeo",
    "sub_sub_clasificacion_gerencia": "Ventas Bombeo"
  },
  {
    "categoria_ingresos": "Ventas Bombeo",
    "codigo_ingresos": "4100-5000-002-000",
    "concepto_ingresos": "Bombeo TI P-4",
    "concepto_gerencia": "Ventas Bombeo",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Ventas Bombeo",
    "sub_sub_clasificacion_gerencia": "Ventas Bombeo"
  },
  {
    "categoria_ingresos": "Ventas Productos Alternativos",
    "codigo_ingresos": "4100-1000-009-000",
    "concepto_ingresos": "Fibra de Polipropileno P-1",
    "concepto_gerencia": "Ventas Productos Alternativos",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Ventas",
    "sub_sub_clasificacion_gerencia": "Ventas"
  },
  {
    "categoria_ingresos": "Ventas Productos Alternativos",
    "codigo_ingresos": "4100-1000-002-000",
    "concepto_ingresos": "Vacio de olla Sil P1",
    "concepto_gerencia": "Ventas Productos Alternativos",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Ventas",
    "sub_sub_clasificacion_gerencia": "Ventas"
  },
  {
    "categoria_ingresos": "Ingresos Financieros",
    "codigo_ingresos": "4100-9001-000-000",
    "concepto_ingresos": "Utilidad Cambiaria",
    "concepto_gerencia": "Ingresos Financieros",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Otros",
    "sub_sub_clasificacion_gerencia": "Otros"
  },
  {
    "categoria_ingresos": "Ingresos Financieros",
    "codigo_ingresos": "4100-9002-000-001",
    "concepto_ingresos": "Intereses de inversiones",
    "concepto_gerencia": "Ingresos Financieros",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Otros",
    "sub_sub_clasificacion_gerencia": "Otros"
  },
  {
    "categoria_ingresos": "Otros Ingresos",
    "codigo_ingresos": "4100-1000-005-000",
    "concepto_ingresos": "Arrendamiento de Eq Sil P1",
    "concepto_gerencia": "Otros Ingresos",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Otros",
    "sub_sub_clasificacion_gerencia": "Otros"
  },
  {
    "categoria_ingresos": "Otros Ingresos",
    "codigo_ingresos": "4100-1000-006-000",
    "concepto_ingresos": "Mano de Obra Sil P1",
    "concepto_gerencia": "Otros Ingresos",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Otros",
    "sub_sub_clasificacion_gerencia": "Otros"
  },
  {
    "categoria_ingresos": "Otros Ingresos",
    "codigo_ingresos": "4100-1000-007-000",
    "concepto_ingresos": "Otros Ingresos P1",
    "concepto_gerencia": "Otros Ingresos",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Otros",
    "sub_sub_clasificacion_gerencia": "Otros"
  },
  {
    "categoria_ingresos": "Otros Ingresos",
    "codigo_ingresos": "4100-1000-010-000",
    "concepto_ingresos": "Apertura de Planta P1",
    "concepto_gerencia": "Otros Ingresos",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Otros",
    "sub_sub_clasificacion_gerencia": "Otros"
  },
  {
    "categoria_ingresos": "Otros Ingresos",
    "codigo_ingresos": "4100-9000-000-000",
    "concepto_ingresos": "Otros Ingresos",
    "concepto_gerencia": "Otros Ingresos",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Otros",
    "sub_sub_clasificacion_gerencia": "Otros"
  },
  {
    "categoria_ingresos": "Otros Ingresos",
    "codigo_ingresos": "4100-9100-000-000",
    "concepto_ingresos": "Utilidad en Vta de Activo Fijo",
    "concepto_gerencia": "Otros Ingresos",
    "clasificacion_gerencia": "Ingresos",
    "sub_clasificacion_gerencia": "Otros",
    "sub_sub_clasificacion_gerencia": "Otros"
  },
  {
    "categoria_ingresos": "Servicios",
    "codigo_ingresos": "5000-1100-003-000",
    "concepto_ingresos": "Fletes P1",
    "concepto_gerencia": "Servicios",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Servicios",
    "codigo_ingresos": "5000-1200-003-000",
    "concepto_ingresos": "Fletes P2",
    "concepto_gerencia": "Servicios",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Servicios",
    "codigo_ingresos": "5000-1300-003-000",
    "concepto_ingresos": "Fletes P3",
    "concepto_gerencia": "Servicios",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Servicios",
    "codigo_ingresos": "5000-1500-003-000",
    "concepto_ingresos": "Fletes P4",
    "concepto_gerencia": "Servicios",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Cemento",
    "codigo_ingresos": "5000-1000-001-102",
    "concepto_ingresos": "Cemento Costo Vtas MX",
    "concepto_gerencia": "Cemento",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Agregado Grueso",
    "codigo_ingresos": "5000-1000-001-103",
    "concepto_ingresos": "Agregado Grueso Costo Vtas MX",
    "concepto_gerencia": "Agregado Grueso",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Agregado Fino",
    "codigo_ingresos": "5000-1000-001-104",
    "concepto_ingresos": "Agregado Fino Costo Vtas MX",
    "concepto_gerencia": "Agregado Fino",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Aditivos",
    "codigo_ingresos": "5000-1000-001-105",
    "concepto_ingresos": "Aditivo Costo Vtas MX",
    "concepto_gerencia": "Aditivos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Cemento",
    "codigo_ingresos": "5000-1000-002-003",
    "concepto_ingresos": "Cemento Costo Vtas P4",
    "concepto_gerencia": "Cemento",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Agregado Grueso",
    "codigo_ingresos": "5000-1000-002-004",
    "concepto_ingresos": "Agregado Grueso Costo Vtas P4",
    "concepto_gerencia": "Agregado Grueso",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Agregado Fino",
    "codigo_ingresos": "5000-1000-002-005",
    "concepto_ingresos": "Agregado Fino Costo Vtas P4",
    "concepto_gerencia": "Agregado Fino",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Aditivos",
    "codigo_ingresos": "5000-1000-002-006",
    "concepto_ingresos": "Aditivo Costo Vtas P4",
    "concepto_gerencia": "Aditivos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Diesel CR",
    "codigo_ingresos": "5000-1000-002-009",
    "concepto_ingresos": "Diesel Costo Vta P4",
    "concepto_gerencia": "Diesel CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Cemento",
    "codigo_ingresos": "5000-1001-001-001",
    "concepto_ingresos": "Cemento Costo Vtas P1",
    "concepto_gerencia": "Cemento",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Agregado Grueso",
    "codigo_ingresos": "5000-1001-001-002",
    "concepto_ingresos": "Agregado Grueso Costo Vtas P1",
    "concepto_gerencia": "Agregado Grueso",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Agregado Fino",
    "codigo_ingresos": "5000-1001-001-003",
    "concepto_ingresos": "Agregado Fino Costo Vtas P1",
    "concepto_gerencia": "Agregado Fino",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Aditivos",
    "codigo_ingresos": "5000-1001-001-004",
    "concepto_ingresos": "Aditivo Costo Vtas P1",
    "concepto_gerencia": "Aditivos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Agua",
    "codigo_ingresos": "5000-1001-001-005",
    "concepto_ingresos": "Agua Costo Vtas P1",
    "concepto_gerencia": "Agua",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Adiciones especiales",
    "codigo_ingresos": "5000-1001-001-006",
    "concepto_ingresos": "Adiciones Especiales Costo Vtas P1",
    "concepto_gerencia": "Adiciones especiales",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1001-001-008",
    "concepto_ingresos": "Base H Triturada Basalto 1 1/2\" a Finos",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Cemento",
    "codigo_ingresos": "5000-1002-001-001",
    "concepto_ingresos": "Cemento Costo Vtas P2",
    "concepto_gerencia": "Cemento",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Agregado Grueso",
    "codigo_ingresos": "5000-1002-001-002",
    "concepto_ingresos": "Agregado Grueso Costo Vtas P2",
    "concepto_gerencia": "Agregado Grueso",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Agregado Fino",
    "codigo_ingresos": "5000-1002-001-003",
    "concepto_ingresos": "Agregado Fino Costo Vtas P2",
    "concepto_gerencia": "Agregado Fino",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Aditivos",
    "codigo_ingresos": "5000-1002-001-004",
    "concepto_ingresos": "Aditivo Costo Vtas P2",
    "concepto_gerencia": "Aditivos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Agua",
    "codigo_ingresos": "5000-1002-001-005",
    "concepto_ingresos": "Agua Costo Vtas P2",
    "concepto_gerencia": "Agua",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Adiciones especiales",
    "codigo_ingresos": "5000-1002-001-006",
    "concepto_ingresos": "Adiciones Especiales Costo Vtas P2",
    "concepto_gerencia": "Adiciones especiales",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Cemento",
    "codigo_ingresos": "5000-1003-001-001",
    "concepto_ingresos": "Cemento Costo Vtas P3",
    "concepto_gerencia": "Cemento",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Agregado Grueso",
    "codigo_ingresos": "5000-1003-001-002",
    "concepto_ingresos": "Agregado Grueso Costo Vtas P3",
    "concepto_gerencia": "Agregado Grueso",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Agregado Fino",
    "codigo_ingresos": "5000-1003-001-003",
    "concepto_ingresos": "Agregado Fino Costo Vtas P3",
    "concepto_gerencia": "Agregado Fino",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Aditivos",
    "codigo_ingresos": "5000-1003-001-004",
    "concepto_ingresos": "Aditivo Costo Vtas P3",
    "concepto_gerencia": "Aditivos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Agua",
    "codigo_ingresos": "5000-1003-001-005",
    "concepto_ingresos": "Agua Costo Vtas P3",
    "concepto_gerencia": "Agua",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Nómina Operadores CR",
    "codigo_ingresos": "5000-1009-200-000",
    "concepto_ingresos": "Sueldos Costo Camion MX",
    "concepto_gerencia": "Nómina Operadores CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Nómina Operadores CR",
    "codigo_ingresos": "5000-1007-200-000",
    "concepto_ingresos": "Sueldos Costo Camion TI P4",
    "concepto_gerencia": "Nómina Operadores CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Nómina Operadores CR",
    "codigo_ingresos": "5000-1004-200-000",
    "concepto_ingresos": "Sueldos Costo Camion Sil P1",
    "concepto_gerencia": "Nómina Operadores CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Nómina Operadores CR",
    "codigo_ingresos": "5000-1005-200-000",
    "concepto_ingresos": "Sueldos Costo Camion TI P2",
    "concepto_gerencia": "Nómina Operadores CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Nómina Operadores CR",
    "codigo_ingresos": "5000-1006-200-000",
    "concepto_ingresos": "Sueldos Costo Camion TI P3",
    "concepto_gerencia": "Nómina Operadores CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Mantenimiento Preventivo CR",
    "codigo_ingresos": "5000-1100-002-000",
    "concepto_ingresos": "Refacciones y Manto de Eq de Transporte P1",
    "concepto_gerencia": "Mantenimiento Preventivo CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1100-006-000",
    "concepto_ingresos": "Casetas viales P1",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1100-013-000",
    "concepto_ingresos": "Verificaciones Vehiculares P1",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1100-014-000",
    "concepto_ingresos": "Renta de CR P1",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1100-016-000",
    "concepto_ingresos": "Dep Eq Transporte Trompos P1",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1200-006-000",
    "concepto_ingresos": "Casetas viales P2",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Diesel CR",
    "codigo_ingresos": "5000-1200-013-000",
    "concepto_ingresos": "Diesel P2",
    "concepto_gerencia": "Diesel CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Diesel CR",
    "codigo_ingresos": "5000-1300-012-000",
    "concepto_ingresos": "Diesel P3",
    "concepto_gerencia": "Diesel CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1400-002-000",
    "concepto_ingresos": "Dep Eq Transporte Trompos MX",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Diesel CR",
    "codigo_ingresos": "5000-1000-001-108",
    "concepto_ingresos": "Diesel Costo Vtas MX",
    "concepto_gerencia": "Diesel CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Diesel CR",
    "codigo_ingresos": "5000-1001-001-007",
    "concepto_ingresos": "Diesel Costo Vtas P1",
    "concepto_gerencia": "Diesel CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Diesel CR",
    "codigo_ingresos": "5000-1002-001-007",
    "concepto_ingresos": "Diesel Costo Vtas P2",
    "concepto_gerencia": "Diesel CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Diesel CR",
    "codigo_ingresos": "5000-1003-001-007",
    "concepto_ingresos": "Diesel Costo Vtas P3",
    "concepto_gerencia": "Diesel CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Nómina Producción",
    "codigo_ingresos": "5000-1009-100-000",
    "concepto_ingresos": "Sueldos Costo Concreto MX",
    "concepto_gerencia": "Nómina Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Nómina Producción",
    "codigo_ingresos": "5000-1007-100-000",
    "concepto_ingresos": "Sueldos Costo Concreto TI P4",
    "concepto_gerencia": "Nómina Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Nómina Producción",
    "codigo_ingresos": "5000-1004-100-000",
    "concepto_ingresos": "Sueldos Costo Concreto Sil P1",
    "concepto_gerencia": "Nómina Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Nómina Producción",
    "codigo_ingresos": "5000-1005-100-000",
    "concepto_ingresos": "Sueldos Costo Concreto TI P2",
    "concepto_gerencia": "Nómina Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Nómina Producción",
    "codigo_ingresos": "5000-1006-100-000",
    "concepto_ingresos": "Sueldos Costo Concreto TI P3",
    "concepto_gerencia": "Nómina Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Preventivo CR",
    "codigo_ingresos": "5000-1100-001-000",
    "concepto_ingresos": "Herramientas y manto Maq P1",
    "concepto_gerencia": "Mantenimiento Preventivo CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Rentas Equipos",
    "codigo_ingresos": "5000-1100-004-000",
    "concepto_ingresos": "Renta de Maquinaria P1",
    "concepto_gerencia": "Rentas Equipos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1100-005-000",
    "concepto_ingresos": "Electricidad Planta 1",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1100-007-000",
    "concepto_ingresos": "Manto de Maquinaria P1",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1100-008-000",
    "concepto_ingresos": "Pruebas de laboratorio P1",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1100-009-000",
    "concepto_ingresos": "Materiales Petreos P1",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1100-010-000",
    "concepto_ingresos": "Uniformes de Trabajo P1",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1100-011-000",
    "concepto_ingresos": "Manto de Planta P1",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1100-015-000",
    "concepto_ingresos": "Dep Maq y Eq P1",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Costo servicio de Bomba",
    "codigo_ingresos": "5000-1100-017-000",
    "concepto_ingresos": "Servicio de bombeo P1",
    "concepto_gerencia": "Costo servicio de bomba",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1100-018-000",
    "concepto_ingresos": "Concreto Premezclado P1",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Rentas Equipos",
    "codigo_ingresos": "5000-1100-019-000",
    "concepto_ingresos": "Servicio de Grua P1",
    "concepto_gerencia": "Rentas Equipos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1100-020-000",
    "concepto_ingresos": "Traslado de Equipos P1",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1200-001-000",
    "concepto_ingresos": "Herramientas y manto Maq P2",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1200-002-000",
    "concepto_ingresos": "Refacciones y Manto de Eq de Transporte P2",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Rentas Equipos",
    "codigo_ingresos": "5000-1200-004-000",
    "concepto_ingresos": "Renta de Maquinaria P2",
    "concepto_gerencia": "Rentas Equipos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1200-007-000",
    "concepto_ingresos": "Manto de Maquinaria P2",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1200-010-000",
    "concepto_ingresos": "Uniformes de Trabajo P2",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1200-011-000",
    "concepto_ingresos": "Manto de Planta P2",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1200-012-000",
    "concepto_ingresos": "Antidopig P2",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1200-014-000",
    "concepto_ingresos": "Desengrasante P2",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Costo servicio de Bomba",
    "codigo_ingresos": "5000-1200-015-000",
    "concepto_ingresos": "Servicio de bombeo P2",
    "concepto_gerencia": "Costo servicio de bomba",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1200-016-000",
    "concepto_ingresos": "Concreto Premezclado P2",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1200-017-000",
    "concepto_ingresos": "Agregados para plancha P2",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1200-018-000",
    "concepto_ingresos": "Dep Maq y Eq P2",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1200-019-000",
    "concepto_ingresos": "Dep Eq Transporte Trompos P2",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1200-020-000",
    "concepto_ingresos": "Traslado de Equipos P2",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Rentas Inmuebles",
    "codigo_ingresos": "5000-1200-021-000",
    "concepto_ingresos": "Renta de Terreno P2",
    "concepto_gerencia": "Rentas Inmuebles",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1300-001-000",
    "concepto_ingresos": "Herramientas y manto Maq P3",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Correctivo CR",
    "codigo_ingresos": "5000-1300-002-000",
    "concepto_ingresos": "Refacciones y Manto de Eq de Transporte P3",
    "concepto_gerencia": "Mantenimiento Correctivo CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Rentas Equipos",
    "codigo_ingresos": "5000-1300-004-000",
    "concepto_ingresos": "Renta de Maquinaria P3",
    "concepto_gerencia": "Rentas Equipos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1300-006-000",
    "concepto_ingresos": "Casetas viales P3",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1300-007-000",
    "concepto_ingresos": "Manto de Maquinaria P3",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1300-010-000",
    "concepto_ingresos": "Uniformes de Trabajo P3",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1300-011-000",
    "concepto_ingresos": "Manto de Planta P3",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Rentas Equipos",
    "codigo_ingresos": "5000-1300-013-000",
    "concepto_ingresos": "Servicio de Grua P3",
    "concepto_gerencia": "Rentas Equipos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1300-014-000",
    "concepto_ingresos": "Cemento para plancha de P3",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1300-015-000",
    "concepto_ingresos": "Dep Maq y Eq P3",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1300-016-000",
    "concepto_ingresos": "Dep Eq Transporte Trompos P3",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Costo servicio de Bomba",
    "codigo_ingresos": "5000-1300-017-000",
    "concepto_ingresos": "Servicio de Bombeo P3",
    "concepto_gerencia": "Costo servicio de bomba",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1400-001-000",
    "concepto_ingresos": "Dep Maq y Eq MX",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1500-001-000",
    "concepto_ingresos": "Herramientas y manto Maq P4",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Preventivo CR",
    "codigo_ingresos": "5000-1500-002-000",
    "concepto_ingresos": "Refacciones y Manto de Eq de Transporte P4",
    "concepto_gerencia": "Mantenimiento Preventivo CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Rentas Equipos",
    "codigo_ingresos": "5000-1500-004-000",
    "concepto_ingresos": "Renta de Maquinaria P4",
    "concepto_gerencia": "Rentas Equipos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1500-006-000",
    "concepto_ingresos": "Casetas viales P4",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1500-007-000",
    "concepto_ingresos": "Manto de Maquinaria P4",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1500-010-000",
    "concepto_ingresos": "Uniformes de Trabajo P4",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1500-011-000",
    "concepto_ingresos": "Manto de Planta P4",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Costo servicio de Bomba",
    "codigo_ingresos": "5000-1500-015-000",
    "concepto_ingresos": "Servicio de bombeo P4",
    "concepto_gerencia": "Costo servicio de bomba",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1500-020-000",
    "concepto_ingresos": "Traslado de Equipos P4",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-2000-020-000",
    "concepto_ingresos": "Gastos No deducibles P1",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Nómina Administrativos",
    "codigo_ingresos": "5000-2001-000-000",
    "concepto_ingresos": "Sueldos Admon Sil P1",
    "concepto_gerencia": "Nómina Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-2002-000-000",
    "concepto_ingresos": "Gastos Admon P1",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Nómina Administrativos",
    "codigo_ingresos": "5000-3001-000-000",
    "concepto_ingresos": "Sueldos Admon P2",
    "concepto_gerencia": "Nómina Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-3002-000-000",
    "concepto_ingresos": "Gastos Admon P2",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Nómina Administrativos",
    "codigo_ingresos": "5000-4001-000-000",
    "concepto_ingresos": "Sueldos y Salarios Admon P3",
    "concepto_gerencia": "Nómina Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-4002-000-000",
    "concepto_ingresos": "Gastos Admon P3",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Nómina Administrativos",
    "codigo_ingresos": "5000-5001-000-000",
    "concepto_ingresos": "Sueldos y Salarios Admon P4",
    "concepto_gerencia": "Nómina Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-5002-000-000",
    "concepto_ingresos": "Gastos de Admon P4",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-7002-000-000",
    "concepto_ingresos": "Gastos Admon MX",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Nómina Administrativos",
    "codigo_ingresos": "5000-8001-000-000",
    "concepto_ingresos": "Sueldos Ventas Sil P1",
    "concepto_gerencia": "Nómina Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Nómina Administrativos",
    "codigo_ingresos": "5000-8002-000-000",
    "concepto_ingresos": "Gastos de Venta P1",
    "concepto_gerencia": "Nómina Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-9002-000-000",
    "concepto_ingresos": "Gastos Financieros ",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Nómina Administrativos",
    "codigo_ingresos": "5000-1100-012-000",
    "concepto_ingresos": "3% Sobre nomina P1",
    "concepto_gerencia": "Nómina Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-1000-002-002",
    "concepto_ingresos": "Dev y Descuentos S/ Compra P4",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-1001-900-000",
    "concepto_ingresos": "Dev y Descuentos S/Compra P1",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-1002-900-000",
    "concepto_ingresos": "Dev y Descuentos S/Compra P2",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-1003-900-000",
    "concepto_ingresos": "Dev y Descuento S/Compra P3",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Aditivos",
    "codigo_ingresos": "5000-1000-002-008",
    "concepto_ingresos": "Adiciones Especiales Costo Vtas P4",
    "concepto_gerencia": "Aditivos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1300-018-000",
    "concepto_ingresos": "Traslado de Equipos P3",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "4200-1000-000-000",
    "concepto_ingresos": "Dev y Desc S/Venta Silao",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Otros",
    "sub_sub_clasificacion_gerencia": "Otros"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "4200-3000-000-000",
    "concepto_ingresos": "Dev y Desc S/Venta Tijuana P3",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Otros",
    "sub_sub_clasificacion_gerencia": "Otros"
  },
  {
    "categoria_ingresos": "Agua",
    "codigo_ingresos": "5000-1003-001-005",
    "concepto_ingresos": "Agua Costo Vtas P3",
    "concepto_gerencia": "Agua",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo Materias Primas",
    "sub_sub_clasificacion_gerencia": "Materia prima"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1200-005-000",
    "concepto_ingresos": "Electricidad Planta P2",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1200-010-000",
    "concepto_ingresos": "Uniformes de Trabajo P2",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1200-017-000",
    "concepto_ingresos": "Agregados para plancha P2",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Rentas Inmuebles",
    "codigo_ingresos": "5000-1200-021-000",
    "concepto_ingresos": "Renta de Terreno P2",
    "concepto_gerencia": "Rentas Inmuebles",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1300-010-000",
    "concepto_ingresos": "Uniformes de Trabajo P3",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Rentas Equipos",
    "codigo_ingresos": "5000-1300-013-000",
    "concepto_ingresos": "Servicio de Grua P3",
    "concepto_gerencia": "Rentas Equipos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1300-018-000",
    "concepto_ingresos": "Traslado de Equipos P3",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-1100-022-000",
    "concepto_ingresos": "Amortización de Seguros CCR P1",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-1100-023-000",
    "concepto_ingresos": "Amortización de Seguros CC P1",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1200-001-000",
    "concepto_ingresos": "Herramientas y manto Maq P2",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1200-002-000",
    "concepto_ingresos": "Refacciones y Manto de Eq de Transporte P2",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1200-018-000",
    "concepto_ingresos": "Dep Maq y Eq P2",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Producción",
    "codigo_ingresos": "5000-1300-001-000",
    "concepto_ingresos": "Herramientas y manto Maq P3",
    "concepto_gerencia": "Mantenimiento Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Mantenimiento Correctivo CR",
    "codigo_ingresos": "5000-1300-002-000",
    "concepto_ingresos": "Refacciones y Manto de Eq de Transporte P3",
    "concepto_gerencia": "Mantenimiento Correctivo CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo transporte concreto"
  },
  {
    "categoria_ingresos": "Rentas Equipos",
    "codigo_ingresos": "5000-1300-004-000",
    "concepto_ingresos": "Renta de Maquinaria P3",
    "concepto_gerencia": "Rentas Equipos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Servicios",
    "codigo_ingresos": "5000-1300-019-000",
    "concepto_ingresos": "Dep Eq Computo P3",
    "concepto_gerencia": "Servicios",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Servicios",
    "codigo_ingresos": "5000-1300-020-000",
    "concepto_ingresos": "Amortización de Seguros CC P3",
    "concepto_gerencia": "Servicios",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-1500-012-000",
    "concepto_ingresos": "Antidopig P4",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1500-017-000",
    "concepto_ingresos": "Agregados para plancha P4",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Producción",
    "codigo_ingresos": "5000-1500-018-000",
    "concepto_ingresos": "Dep Maq y Eq P4",
    "concepto_gerencia": "Otros gastos Producción",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos CR",
    "codigo_ingresos": "5000-1500-019-000",
    "concepto_ingresos": "Dep Eq Transporte Trompos P4",
    "concepto_gerencia": "Otros gastos CR",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  {
    "categoria_ingresos": "Otros gastos Administrativos",
    "codigo_ingresos": "5000-1500-021-000",
    "concepto_ingresos": "Amortización de Seguros CC P4",
    "concepto_gerencia": "Otros gastos Administrativos",
    "clasificacion_gerencia": "Egresos",
    "sub_clasificacion_gerencia": "Costo operativo",
    "sub_sub_clasificacion_gerencia": "Costo Fijo"
  },
  // ... rest of the classifications
];

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

function processBalanzaData(data: BalanzaRow[]): DebugDataRow[] {
  const processed: DebugDataRow[] = [];

  data.forEach(row => {
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
      return; // Skip this iteration
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
  });

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
        const processedData = processBalanzaData(rawData);

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