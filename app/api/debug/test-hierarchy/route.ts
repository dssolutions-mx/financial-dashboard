import { NextResponse } from 'next/server'
import { improvedHierarchyDetector } from '@/lib/services/enhanced-hierarchy-detector.service'

// Datos problemáticos mencionados por el usuario
const problematicAccounts = [
  { codigo: '5000-2000-000-000', concepto: 'Gastos de Administracion Sil P1', monto: -511203.51, tipo: 'Egresos' },
  { codigo: '5000-2000-020-000', concepto: 'Gastos No deducibles P1', monto: 2744.32, tipo: 'Egresos' },
  { codigo: '5000-2001-000-000', concepto: 'Sueldos Admon Sil P1', monto: 304411.69, tipo: 'Egresos' },
  { codigo: '5000-2001-000-001', concepto: 'Sueldos y Salarios Admon P1', monto: -165672.00, tipo: 'Egresos' },
  { codigo: '5000-2001-017-000', concepto: 'Imss Admon P1', monto: -15911.03, tipo: 'Egresos' },
  { codigo: '5000-2001-020-000', concepto: 'Bono de Gasolina Admon P1', monto: -13645.00, tipo: 'Egresos' },
  { codigo: '5000-2002-000-000', concepto: 'Gastos Admon P1', monto: 204047.50, tipo: 'Egresos' },
  { codigo: '5000-2002-001-000', concepto: 'Dominio Correo P1', monto: -4176.00, tipo: 'Egresos' }
]

export async function GET() {
  try {
    // Ejecutar análisis con algoritmo mejorado
    const hierarchy = improvedHierarchyDetector.buildHierarchy(problematicAccounts)
    const correctionReport = improvedHierarchyDetector.generateCorrectionReport(problematicAccounts)

    // Simular algoritmo original para comparación
    const originalLevels = problematicAccounts.map(acc => {
      const parts = acc.codigo.split('-')
      let level = 4
      if (parts[3] === '000') level = 3
      if (parts[2] === '000' && parts[3] === '000') level = 2
      if (parts[1] === '0000' && parts[2] === '000' && parts[3] === '000') level = 1
      return { codigo: acc.codigo, level }
    })

    // Comparar resultados
    const comparison = originalLevels.map(original => {
      const improved = hierarchy.find(h => h.account.codigo === original.codigo)
      return {
        codigo: original.codigo,
        originalLevel: original.level,
        improvedLevel: improved?.level || 4,
        difference: improved ? improved.level - original.level : 0,
        family: improved?.family || '',
        parent: improved?.parent || null,
        parentType: improved?.parentType || 'ROOT',
        detectedBy: improved?.detectedBy || 'ZERO_PATTERN',
        warnings: improved?.warnings || []
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        hierarchy,
        correctionReport,
        comparison,
        summary: {
          totalAccounts: problematicAccounts.length,
          correctedAccounts: correctionReport.summary.correctedAccounts,
          familyBasedCorrections: correctionReport.summary.familyBasedCorrections,
          hybridCorrections: correctionReport.summary.hybridCorrections
        }
      }
    })

  } catch (error) {
    console.error('Error testing improved hierarchy:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al probar el algoritmo mejorado de jerarquía',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 