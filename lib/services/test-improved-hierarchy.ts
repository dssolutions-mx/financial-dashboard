/**
 * Test file para demostrar el algoritmo mejorado de jerarquía
 * Usa los datos problemáticos mencionados por el usuario
 */

import { improvedHierarchyDetector, AccountCode } from './enhanced-hierarchy-detector.service'

// Datos problemáticos mencionados por el usuario
const problematicAccounts: AccountCode[] = [
  { codigo: '5000-2000-000-000', concepto: 'Gastos de Administracion Sil P1', monto: -511203.51, tipo: 'Egresos' },
  { codigo: '5000-2000-020-000', concepto: 'Gastos No deducibles P1', monto: 2744.32, tipo: 'Egresos' },
  { codigo: '5000-2001-000-000', concepto: 'Sueldos Admon Sil P1', monto: 304411.69, tipo: 'Egresos' },
  { codigo: '5000-2001-000-001', concepto: 'Sueldos y Salarios Admon P1', monto: -165672.00, tipo: 'Egresos' },
  { codigo: '5000-2001-017-000', concepto: 'Imss Admon P1', monto: -15911.03, tipo: 'Egresos' },
  { codigo: '5000-2001-020-000', concepto: 'Bono de Gasolina Admon P1', monto: -13645.00, tipo: 'Egresos' },
  { codigo: '5000-2002-000-000', concepto: 'Gastos Admon P1', monto: 204047.50, tipo: 'Egresos' },
  { codigo: '5000-2002-001-000', concepto: 'Dominio Correo P1', monto: -4176.00, tipo: 'Egresos' }
]

// Función para ejecutar el test
export function testImprovedHierarchy() {
  console.log('=== TEST: Algoritmo Mejorado de Jerarquía ===')
  console.log('Cuentas problemáticas:')
  problematicAccounts.forEach(acc => {
    console.log(`  ${acc.codigo}: ${acc.concepto}`)
  })
  console.log('')

  // Ejecutar análisis
  const hierarchy = improvedHierarchyDetector.buildHierarchy(problematicAccounts)
  const correctionReport = improvedHierarchyDetector.generateCorrectionReport(problematicAccounts)

  console.log('=== JERARQUÍA CORREGIDA ===')
  hierarchy.forEach(h => {
    console.log(`${h.account.codigo} (${h.account.concepto})`)
    console.log(`  Nivel: ${h.level} | Familia: ${h.family} | Padre: ${h.parent || 'RAÍZ'}`)
    console.log(`  Tipo de parentesco: ${h.parentType}`)
    console.log(`  Detectado por: ${h.detectedBy}`)
    console.log(`  Hijos: [${h.children.join(', ')}]`)
    if (h.warnings.length > 0) {
      console.log(`  ⚠️  Advertencias: ${h.warnings.join('; ')}`)
    }
    console.log('---')
  })

  console.log('\n=== REPORTE DE CORRECCIONES ===')
  correctionReport.corrections.forEach(c => {
    console.log(`${c.codigo}: Nivel ${c.oldLevel} → ${c.newLevel}`)
    console.log(`  Método: ${c.detectedBy}`)
    console.log(`  Razón: ${c.reason}`)
  })

  console.log('\n=== RESUMEN ===')
  console.log(`Total cuentas: ${correctionReport.summary.totalAccounts}`)
  console.log(`Cuentas corregidas: ${correctionReport.summary.correctedAccounts}`)
  console.log(`Correcciones por familia: ${correctionReport.summary.familyBasedCorrections}`)
  console.log(`Correcciones híbridas: ${correctionReport.summary.hybridCorrections}`)

  return {
    hierarchy,
    correctionReport
  }
}

// Función para comparar algoritmos
export function compareAlgorithms() {
  console.log('=== COMPARACIÓN: Algoritmo Original vs Mejorado ===')
  
  // Simular algoritmo original (patrón de ceros)
  const originalLevels = problematicAccounts.map(acc => {
    const parts = acc.codigo.split('-')
    let level = 4
    if (parts[3] === '000') level = 3
    if (parts[2] === '000' && parts[3] === '000') level = 2
    if (parts[1] === '0000' && parts[2] === '000' && parts[3] === '000') level = 1
    return { codigo: acc.codigo, level }
  })

  // Algoritmo mejorado
  const improvedLevels = improvedHierarchyDetector.buildHierarchy(problematicAccounts)

  console.log('\nComparación de niveles:')
  console.log('Código\t\t\tOriginal\tMejorado\tDiferencia')
  console.log('-------\t\t\t--------\t---------\t----------')
  
  originalLevels.forEach(original => {
    const improved = improvedLevels.find(h => h.account.codigo === original.codigo)
    const difference = improved ? improved.level - original.level : 0
    const diffSymbol = difference > 0 ? '↗️' : difference < 0 ? '↘️' : '➡️'
    
    console.log(`${original.codigo}\t${original.level}\t\t${improved?.level || 'N/A'}\t\t${diffSymbol} ${Math.abs(difference)}`)
  })

  return {
    originalLevels,
    improvedLevels
  }
}

// Export para uso en desarrollo
if (typeof window !== 'undefined') {
  (window as any).testImprovedHierarchy = testImprovedHierarchy
  ;(window as any).compareAlgorithms = compareAlgorithms
} 