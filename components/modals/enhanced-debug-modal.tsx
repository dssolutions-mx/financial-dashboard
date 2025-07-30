"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Save, 
  Filter,
  Target,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  RefreshCw,
  Info,
  Edit,
  Check,
  ChevronDown,
  ChevronRight,
  Menu,
  Smartphone,
  Calculator,
  AlertCircle
} from "lucide-react"
import { 
  CLASSIFICATION_HIERARCHY,
  getSubCategoriasForTipo,
  getClasificacionesForSubCategoria,
  getCategoria1ForClasificacion,
  suggestClassification
} from "@/lib/services/classification-service"
import { ValidationSummary } from "@/lib/services/validation-service"
import { improvedHierarchyDetector } from "@/lib/services/enhanced-hierarchy-detector.service"

export interface DebugDataRow {
  id?: string
  Codigo: string
  Concepto: string
  Abonos: number | null
  Cargos: number | null
  Monto: number
  Planta: string
  Tipo: string
  'Sub categoria': string
  Clasificacion: string
  'Categoria 1': string
}

interface EnhancedDebugModalProps {
  isOpen: boolean
  onClose: () => void
  data: DebugDataRow[]
  onDataChange: (newData: DebugDataRow[]) => void
  validationSummary?: ValidationSummary | null
  onReturnToValidation?: () => void
}

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// EXACTO: Función que replica exactamente la lógica del Excel processor
const formatCurrencyWithContext = (amount: number, tipo?: string, codigo?: string, concepto?: string) => {
  // SIMPLE: Mostrar exactamente el monto como viene del Excel processor
  // El Excel processor ya calcula correctamente:
  // - Egresos: cargos - abonos (positivo = gasto, negativo = devolución)
  // - Ingresos: abonos - cargos (positivo = venta, negativo = devolución)
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatCurrencyShort = (amount: number) => {
  const absAmount = Math.abs(amount)
  if (absAmount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`
  } else if (absAmount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`
  }
  return formatCurrency(amount)
}

// Hierarchical Account Structure
interface HierarchicalAccount {
  codigo: string
  concepto: string
  monto: number
  tipo: string
  categoria1: string
  subCategoria: string
  clasificacion: string
  planta: string
  level: number
  children: HierarchicalAccount[]
  parent?: HierarchicalAccount
  isClassified: boolean
  classifiedAmount: number
  unclassifiedAmount: number
  validationStatus: 'valid' | 'invalid' | 'partial' | 'unknown'
  validationMessage: string
  originalRow: DebugDataRow
}

// MEJORADO: Usar el algoritmo mejorado de jerarquía
const getAccountLevel = (codigo: string): number => {
  try {
    const accountCode = { codigo, concepto: '', monto: 0, tipo: '' }
    const hierarchyResults = improvedHierarchyDetector.buildHierarchy([accountCode])
    return hierarchyResults[0]?.level || 4
  } catch (error) {
    console.warn(`Error al determinar nivel para ${codigo}:`, error)
    return 4 // Default to detail level
  }
}

const getParentCode = (codigo: string): string | null => {
  try {
    const accountCode = { codigo, concepto: '', monto: 0, tipo: '' }
    const hierarchyResults = improvedHierarchyDetector.buildHierarchy([accountCode])
    return hierarchyResults[0]?.parent || null
  } catch (error) {
    console.warn(`Error al determinar padre para ${codigo}:`, error)
    return null
  }
}

const isDetailAccount = (codigo: string): boolean => {
  return getAccountLevel(codigo) === 4
}

// Helper function to check if row is a hierarchy parent row
const isHierarchyRow = (codigo: string): boolean => {
  // ONLY the main total accounts are hierarchy (not editable)
  if (codigo === '4100-0000-000-000' || codigo === '5000-0000-000-000') return true
  
  // Virtual parents (created for missing hierarchy accounts)
  if (codigo.startsWith('virtual-')) return true
  
  // ALL other accounts (Level 2, 3, 4) can be classified and edited
  return false
}

// Classification status checker - allows unclassified items
const getClassificationStatus = (row: DebugDataRow) => {
  const hasValidTipo = row.Tipo && row.Tipo !== "Indefinido"
  const hasValidCategoria1 = row['Categoria 1'] && row['Categoria 1'] !== "Sin Categoría"
  
  // Check classification first, regardless of hierarchy
  if (hasValidTipo && hasValidCategoria1) {
    return { status: 'classified', message: 'Clasificado', color: 'green', icon: '✅' }
  } else if (hasValidTipo && !hasValidCategoria1) {
    return { status: 'partial', message: 'Parcial', color: 'yellow', icon: '⚡' }
  } else if (!hasValidTipo) {
    return { status: 'untyped', message: 'Sin tipo', color: 'red', icon: '❌' }
    } else {
    return { status: 'unclassified', message: 'Sin clasificar', color: 'gray', icon: '❓' }
  }
}

const isClassified = (row: DebugDataRow): boolean => {
  const status = getClassificationStatus(row)
  return status.status === 'classified'
}

// MEJORADO: Build hierarchical structure using improved hierarchy detector
const buildHierarchicalStructure = (data: DebugDataRow[]): HierarchicalAccount[] => {
  try {
    // Apply improved hierarchy detection
    console.log('=== DEBUG: Applying improved hierarchy ===')
    console.log('Input data length:', data.length)
    
    // TEMPORARY: Test if improved hierarchy is causing issues
    let hierarchyResults: any[] = []
    let correctionReport: any = { corrections: [], summary: { totalAccounts: data.length, correctedAccounts: 0, familyBasedCorrections: 0, hybridCorrections: 0 } }
    let enhancedData: any[] = []
    
    try {
      const result = improvedHierarchyDetector.applyImprovedHierarchy(data)
      hierarchyResults = result.hierarchyResults
      correctionReport = result.correctionReport
      enhancedData = result.enhancedData
      
      console.log('Hierarchy results length:', hierarchyResults.length)
      console.log('Enhanced data length:', enhancedData.length)
      
      // NUEVO: Test simple para verificar la lógica de jerarquía
      const testAccounts = ['5000-0000-000-000', '5000-2000-000-000', '5000-1001-001-001', '5000-1004-100-000']
      console.log('🧪 TEST SIMPLE PARA CUENTAS REALES DEL DATASET')
      improvedHierarchyDetector.testNumericSequenceDetection(testAccounts)
      
      // NUEVO: Test para cuenta con padre intermedio faltante
      const testMissingParent = ['5000-1000-002-003', '5000-1004-100-000']
      console.log('🧪 TEST PARA PADRE INTERMEDIO FALTANTE')
      improvedHierarchyDetector.testNumericSequenceDetection(testMissingParent)
      
    } catch (hierarchyError) {
      console.error('Error with improved hierarchy, using fallback:', hierarchyError)
      // Use original data as fallback
      enhancedData = data
      hierarchyResults = []
      correctionReport = { corrections: [], summary: { totalAccounts: data.length, correctedAccounts: 0, familyBasedCorrections: 0, hybridCorrections: 0 } }
    }
    
    // Log correction report for debugging
    console.log('=== MEJORADO: Reporte de Correcciones de Jerarquía ===')
    console.log(`Total cuentas: ${correctionReport.summary.totalAccounts}`)
    console.log(`Cuentas corregidas: ${correctionReport.summary.correctedAccounts}`)
    console.log(`Correcciones por familia: ${correctionReport.summary.familyBasedCorrections}`)
    console.log(`Correcciones híbridas: ${correctionReport.summary.hybridCorrections}`)
    
    if (correctionReport.corrections.length > 0) {
      console.log('Correcciones aplicadas:')
      correctionReport.corrections.forEach((c: any) => {
        console.log(`  ${c.codigo}: Nivel ${c.oldLevel} → ${c.newLevel} (${c.detectedBy})`)
      })
    }
    
    const accountMap = new Map<string, HierarchicalAccount>()
    
    // Create all accounts first using enhanced data
    console.log('=== DEBUG: Creating accounts from enhanced data ===')
    console.log('Enhanced data sample:', enhancedData.slice(0, 3))
    
    enhancedData.forEach(row => {
      const level = row._hierarchyLevel || getAccountLevel(row.Codigo)
      const status = getClassificationStatus(row)
      const isHierarchy = isHierarchyRow(row.Codigo)
      const amount = row.Monto // Preserve original amount with sign
      
      // ALL accounts can be classified - remove hierarchy blocking
      const isDirectlyClassified = status.status === 'classified'
      
      // DEBUG: Log sistemático para TODAS las cuentas de egresos (clasificadas y no clasificadas)
      if (row.Tipo === 'Egresos') {
        console.log(`[DEBUG SISTEMÁTICO EXCEL] ${row.Codigo}:`, {
          concepto: row.Concepto,
          montoOriginal: amount,
          cargos: row.Cargos || 0,
          abonos: row.Abonos || 0,
          calcExcel: `${row.Cargos || 0} - ${row.Abonos || 0} = ${(row.Cargos || 0) - (row.Abonos || 0)}`,
          signoResultante: amount > 0 ? 'POSITIVO' : 'NEGATIVO',
          isClassified: isDirectlyClassified,
          hierarchyLevel: level,
          hierarchyFamily: row._hierarchyFamily,
          hierarchyParent: row._hierarchyParent,
          hierarchyDetectedBy: row._hierarchyDetectedBy
        })
      }
      
      accountMap.set(row.Codigo, {
        codigo: row.Codigo,
        concepto: row.Concepto,
        monto: amount,
        tipo: row.Tipo || 'Indefinido',
        categoria1: row['Categoria 1'] || 'Sin Categoría',
        subCategoria: row['Sub categoria'] || 'Sin Subcategoría',
        clasificacion: row.Clasificacion || 'Sin Clasificación',
        planta: row.Planta,
        level,
        children: [],
        isClassified: isDirectlyClassified,
        classifiedAmount: isDirectlyClassified ? amount : 0,
        unclassifiedAmount: isDirectlyClassified ? 0 : amount,
        validationStatus: 'unknown',
        validationMessage: '',
        originalRow: row
      })
    })
    
    // Build parent-child relationships using improved hierarchy
    console.log('=== DEBUG: Building parent-child relationships ===')
    let accountsWithParents = 0
    let accountsWithoutParents = 0
    
    accountMap.forEach(account => {
      const hierarchyResult = hierarchyResults.find(h => h.account.codigo === account.codigo)
      const parentCode = hierarchyResult?.parent || getParentCode(account.codigo)
      
      if (parentCode) {
        accountsWithParents++
        console.log(`Account ${account.codigo} has parent: ${parentCode}`)
      } else {
        accountsWithoutParents++
        console.log(`Account ${account.codigo} has NO parent`)
      }
      
      if (parentCode && accountMap.has(parentCode)) {
        const parent = accountMap.get(parentCode)!
        parent.children.push(account)
        account.parent = parent
      } else if (parentCode && !accountMap.has(parentCode)) {
        // MEJORADO: Crear padre virtual usando información del algoritmo mejorado
        const hierarchyParent = hierarchyResults.find(h => h.account.codigo === parentCode)
        const level = hierarchyParent?.level || getAccountLevel(parentCode)
        const parts = parentCode.split('-')
        
        // Determinar el concepto basado en la estructura jerárquica mejorada
        let concepto = ''
        let tipoVirtual = 'Indefinido'
        
        // NUEVO: Determinar tipo según el código de la cuenta
        if (parts[0] === '4100') {
          tipoVirtual = 'Ingresos'
        } else if (parts[0] === '5000') {
          tipoVirtual = 'Egresos'
        } else {
          // Heredar el tipo del hijo si es posible
          tipoVirtual = account.tipo || 'Indefinido'
        }
        
        if (level === 1) {
          concepto = `Total ${parts[0] === '5000' ? 'Egresos' : 'Ingresos'}`
        } else if (level === 2) {
          concepto = `Subtotal ${parts[0]}-${parts[1]}`
        } else if (level === 3) {
          concepto = `Categoría ${parts[0]}-${parts[1]}-${parts[2]}`
        }
        
        const virtualParent: HierarchicalAccount = {
          codigo: parentCode,
          concepto: concepto,
          monto: 0, // Se calculará correctamente después
          tipo: tipoVirtual,
          categoria1: 'Sin Categoría',
          subCategoria: 'Sin Subcategoría',
          clasificacion: 'Sin Clasificación',
          planta: account.planta || '',
          level: level,
          children: [account],
          isClassified: false,
          classifiedAmount: 0,
          unclassifiedAmount: 0,
          validationStatus: 'unknown',
          validationMessage: `Cuenta virtual - ${hierarchyParent?.parentType || 'jerarquía inconsistente'}`,
          originalRow: {
            id: `virtual-${parentCode}`,
            Codigo: parentCode,
            Concepto: concepto,
            Abonos: 0,
            Cargos: 0,
            Monto: 0,
            Planta: account.planta || '',
            Tipo: tipoVirtual,
            'Sub categoria': 'Sin Subcategoría',
            Clasificacion: 'Sin Clasificación',
            'Categoria 1': 'Sin Categoría'
          }
        }
        
        // PROTECCIÓN: No sobrescribir cuentas reales existentes
        if (!accountMap.has(parentCode)) {
          accountMap.set(parentCode, virtualParent)
          account.parent = virtualParent
        } else {
          // Si la cuenta real ya existe, usarla como padre
          const existingParent = accountMap.get(parentCode)!
          existingParent.children.push(account)
          account.parent = existingParent
        }
      }
    })
    
    // NUEVO: Calcular montos para cuentas virtuales después de crear toda la estructura
    accountMap.forEach(account => {
      if (account.originalRow.id?.startsWith('virtual-') && account.children.length > 0) {
        const childrenSum = account.children.reduce((sum, child) => sum + child.monto, 0)
        
        console.log(`[DEBUG SISTEMÁTICO] Cuenta virtual ${account.codigo}:`, {
          concepto: account.concepto,
          childrenSum,
          children: account.children.map(child => ({
            codigo: child.codigo,
            monto: child.monto,
            tipo: child.tipo,
            esVirtual: child.originalRow.id?.startsWith('virtual-')
          })),
          signoResultante: childrenSum > 0 ? 'POSITIVO' : 'NEGATIVO'
        })
        
        account.monto = childrenSum
        account.unclassifiedAmount = account.monto
        
        // CORREGIDO: Actualizar también el Monto en originalRow para consistencia
        if (account.originalRow.id?.startsWith('virtual-')) {
          account.originalRow.Monto = account.monto
        }
      }
    })
    
    // Sort children by code for consistent display
    accountMap.forEach(account => {
      account.children.sort((a, b) => a.codigo.localeCompare(b.codigo))
    })
    
    console.log(`=== DEBUG: Parent-child relationship summary ===`)
    console.log(`Accounts with parents: ${accountsWithParents}`)
    console.log(`Accounts without parents: ${accountsWithoutParents}`)
    console.log(`Total accounts processed: ${accountsWithParents + accountsWithoutParents}`)
    
    // SIMPLIFIED: Calculate aggregates without recursion
    const allAccounts = Array.from(accountMap.values())
    
    // Sort by level (leaf nodes first)
    allAccounts.sort((a, b) => b.level - a.level)
    
    // Process each account once
    allAccounts.forEach(account => {
      // Set validation status for leaf nodes
      if (account.children.length === 0) {
        if (account.isClassified) {
          account.validationStatus = 'valid'
          account.validationMessage = 'Clasificado correctamente'
        } else {
          account.validationStatus = 'invalid'
          account.validationMessage = 'Requiere clasificación'
        }
        return
      }
      
      // For non-leaf nodes, calculate from children
      if (account.isClassified) {
        account.validationStatus = 'valid'
        account.validationMessage = `Clasificado directamente: ${formatCurrencyWithContext(account.monto, account.tipo, account.codigo, account.concepto)}`
        return
      }
      
      // Calculate from children
      const childrenClassified = account.children.reduce((sum, child) => sum + child.classifiedAmount, 0)
      const childrenUnclassified = account.children.reduce((sum, child) => sum + child.unclassifiedAmount, 0)
      
      account.classifiedAmount = childrenClassified
      account.unclassifiedAmount = childrenUnclassified
      
      // Validation logic
      const totalAmount = account.monto
      const classifiedAmount = account.classifiedAmount
      const expectedClassifiedAmount = totalAmount < 0 ? Math.abs(classifiedAmount) * -1 : Math.abs(classifiedAmount)
      const unclassifiedAmount = Math.abs(totalAmount - expectedClassifiedAmount)
      const tolerance = 1.00
      
      if (account.isClassified) {
        account.validationStatus = 'valid'
        account.validationMessage = `Clasificado directamente: ${formatCurrencyWithContext(account.monto, account.tipo, account.codigo, account.concepto)}`
      } else if (unclassifiedAmount <= tolerance) {
        account.validationStatus = 'valid'
        account.validationMessage = `Válido: ${formatCurrencyWithContext(expectedClassifiedAmount, account.tipo, account.codigo, account.concepto)} clasificado`
      } else if (classifiedAmount !== 0) {
        account.validationStatus = 'partial'
        account.validationMessage = `Parcial: ${formatCurrencyWithContext(expectedClassifiedAmount, account.tipo, account.codigo, account.concepto)} de ${formatCurrencyWithContext(totalAmount, account.tipo, account.codigo, account.concepto)} (Faltan: ${formatCurrencyWithContext(unclassifiedAmount, account.tipo, account.codigo, account.concepto)})`
      } else {
        account.validationStatus = 'invalid'
        account.validationMessage = `Error contable: ${formatCurrencyWithContext(unclassifiedAmount, account.tipo, account.codigo, account.concepto)} sin clasificar de ${formatCurrencyWithContext(totalAmount, account.tipo, account.codigo, account.concepto)}`
      }
    })
    
    // Debug: Log hierarchy structure
    console.log('MEJORADO: Hierarchy Debug:', {
      totalAccounts: accountMap.size,
      topLevelAccounts: Array.from(accountMap.values()).filter(acc => !acc.parent).map(acc => acc.codigo),
      accountsWithChildren: Array.from(accountMap.values()).filter(acc => acc.children.length > 0).map(acc => ({
        codigo: acc.codigo,
        children: acc.children.map(child => child.codigo)
      }))
    })
    
    // Return top-level accounts (those without parents)
    const topLevelAccounts = Array.from(accountMap.values())
      .filter(account => !account.parent)
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
    
    console.log('=== DEBUG: Hierarchy Results ===')
    console.log('Total accounts in map:', accountMap.size)
    console.log('Top level accounts found:', topLevelAccounts.length)
    console.log('Top level account codes:', topLevelAccounts.map(acc => acc.codigo))
    
    // Safety check: if no top-level accounts, return all accounts as flat structure
    if (topLevelAccounts.length === 0) {
      console.warn('No top-level accounts found, returning flat structure')
      return Array.from(accountMap.values())
        .sort((a, b) => a.codigo.localeCompare(b.codigo))
    }
    

    
    return topLevelAccounts
      
  } catch (error) {
    console.error('Error en buildHierarchicalStructure mejorado:', error)
    // Fallback to original logic if improved hierarchy fails
    return buildHierarchicalStructureFallback(data)
  }
}

// Fallback function using original logic
const buildHierarchicalStructureFallback = (data: DebugDataRow[]): HierarchicalAccount[] => {
  console.warn('Usando lógica de jerarquía original como fallback')
  
  const accountMap = new Map<string, HierarchicalAccount>()
  
  // Create all accounts first
  data.forEach(row => {
    const level = getAccountLevel(row.Codigo)
    const status = getClassificationStatus(row)
    const isHierarchy = isHierarchyRow(row.Codigo)
    const amount = row.Monto
    
    const isDirectlyClassified = status.status === 'classified'
    
    accountMap.set(row.Codigo, {
      codigo: row.Codigo,
      concepto: row.Concepto,
      monto: amount,
      tipo: row.Tipo || 'Indefinido',
      categoria1: row['Categoria 1'] || 'Sin Categoría',
      subCategoria: row['Sub categoria'] || 'Sin Subcategoría',
      clasificacion: row.Clasificacion || 'Sin Clasificación',
      planta: row.Planta,
      level,
      children: [],
      isClassified: isDirectlyClassified,
      classifiedAmount: isDirectlyClassified ? amount : 0,
      unclassifiedAmount: isDirectlyClassified ? 0 : amount,
      validationStatus: 'unknown',
      validationMessage: '',
      originalRow: row
    })
  })
  
  // Build parent-child relationships
  accountMap.forEach(account => {
    const parentCode = getParentCode(account.codigo)
    if (parentCode && accountMap.has(parentCode)) {
      const parent = accountMap.get(parentCode)!
      parent.children.push(account)
      account.parent = parent
    }
  })
  
  // Sort children by code for consistent display
  accountMap.forEach(account => {
    account.children.sort((a, b) => a.codigo.localeCompare(b.codigo))
  })
  
  // SIMPLIFIED: Calculate aggregates without recursion
  const allAccounts = Array.from(accountMap.values())
  
  // Sort by level (leaf nodes first)
  allAccounts.sort((a, b) => b.level - a.level)
  
  // Process each account once
  allAccounts.forEach(account => {
    // Set validation status for leaf nodes
    if (account.children.length === 0) {
      if (account.isClassified) {
        account.validationStatus = 'valid'
        account.validationMessage = 'Clasificado correctamente'
      } else {
        account.validationStatus = 'invalid'
        account.validationMessage = 'Requiere clasificación'
      }
      return
    }
    
    // For non-leaf nodes, calculate from children
    if (account.isClassified) {
      account.validationStatus = 'valid'
      account.validationMessage = `Clasificado directamente: ${formatCurrencyWithContext(account.monto, account.tipo, account.codigo, account.concepto)}`
      return
    }
    
    // Calculate from children
    const childrenClassified = account.children.reduce((sum, child) => sum + child.classifiedAmount, 0)
    const childrenUnclassified = account.children.reduce((sum, child) => sum + child.unclassifiedAmount, 0)
    
    account.classifiedAmount = childrenClassified
    account.unclassifiedAmount = childrenUnclassified
    
    // Validation logic
    const totalAmount = account.monto
    const classifiedAmount = account.classifiedAmount
    const expectedClassifiedAmount = totalAmount < 0 ? Math.abs(classifiedAmount) * -1 : Math.abs(classifiedAmount)
    const unclassifiedAmount = Math.abs(totalAmount - expectedClassifiedAmount)
    const tolerance = 1.00
    
    if (account.isClassified) {
      account.validationStatus = 'valid'
      account.validationMessage = `Clasificado directamente: ${formatCurrencyWithContext(account.monto, account.tipo, account.codigo, account.concepto)}`
    } else if (unclassifiedAmount <= tolerance) {
      account.validationStatus = 'valid'
      account.validationMessage = `Válido: ${formatCurrencyWithContext(expectedClassifiedAmount, account.tipo, account.codigo, account.concepto)} clasificado`
    } else if (classifiedAmount !== 0) {
      account.validationStatus = 'partial'
      account.validationMessage = `Parcial: ${formatCurrencyWithContext(expectedClassifiedAmount, account.tipo, account.codigo, account.concepto)} de ${formatCurrencyWithContext(totalAmount, account.tipo, account.codigo, account.concepto)} (Faltan: ${formatCurrencyWithContext(unclassifiedAmount, account.tipo, account.codigo, account.concepto)})`
    } else {
      account.validationStatus = 'invalid'
      account.validationMessage = `Error contable: ${formatCurrencyWithContext(unclassifiedAmount, account.tipo, account.codigo, account.concepto)} sin clasificar de ${formatCurrencyWithContext(totalAmount, account.tipo, account.codigo, account.concepto)}`
    }
  })
  
  return Array.from(accountMap.values())
    .filter(account => !account.parent)
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
}

// Inline editor component
const InlineEditor = React.memo(({ 
  account, 
  onUpdate,
  onCancel
}: { 
  account: HierarchicalAccount
  onUpdate: (updates: Partial<DebugDataRow>) => void
  onCancel: () => void
}) => {
  const [localRow, setLocalRow] = useState<DebugDataRow>({ ...account.originalRow })
  
  const correctType = localRow.Tipo && localRow.Tipo !== "Indefinido" 
    ? localRow.Tipo 
    : localRow.Codigo.startsWith('4') ? 'Ingresos' : 'Egresos'

  const subCategorias = useMemo(() => 
    getSubCategoriasForTipo(correctType || ""), [correctType]
  )
  
  const categorias1 = useMemo(() => 
    getCategoria1ForClasificacion(correctType || "", localRow['Sub categoria'] || "", localRow.Clasificacion || ""), 
    [correctType, localRow['Sub categoria'], localRow.Clasificacion]
  )

  const handleQuickSave = useCallback(() => {
    onUpdate({
      Tipo: localRow.Tipo,
      'Sub categoria': localRow['Sub categoria'],
      Clasificacion: localRow.Clasificacion,
      'Categoria 1': localRow['Categoria 1']
    })
  }, [localRow, onUpdate])

  const handleFieldChange = useCallback((field: keyof DebugDataRow, value: string) => {
    const updates: Partial<DebugDataRow> = { [field]: value }
    
    if (field === 'Tipo') {
      updates['Sub categoria'] = 'Sin Subcategoría'
      updates.Clasificacion = 'Sin Clasificación'
      updates['Categoria 1'] = 'Sin Categoría'
    } else if (field === 'Sub categoria') {
      updates.Clasificacion = 'Sin Clasificación'
      updates['Categoria 1'] = 'Sin Categoría'
    } else if (field === 'Clasificacion') {
      updates['Categoria 1'] = 'Sin Categoría'
    }
    
    setLocalRow(prev => ({ ...prev, ...updates }))
  }, [])

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-3 my-1">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
          Editando: {account.concepto.substring(0, 40)}...
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 px-2">
            <X className="h-3 w-3" />
          </Button>
          <Button size="sm" onClick={handleQuickSave} className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white">
            <Check className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <Select value={localRow.Tipo} onValueChange={(value) => handleFieldChange('Tipo', value)}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Ingresos">Ingresos</SelectItem>
            <SelectItem value="Egresos">Egresos</SelectItem>
            <SelectItem value="Indefinido">Sin Tipo</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={localRow['Sub categoria']} 
          onValueChange={(value) => handleFieldChange('Sub categoria', value)}
          disabled={!correctType || correctType === "Indefinido"}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Sub categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Sin Subcategoría">Sin Subcategoría</SelectItem>
            {subCategorias.map(subcat => (
              <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select 
          value={localRow.Clasificacion} 
          onValueChange={(value) => handleFieldChange('Clasificacion', value)}
          disabled={!localRow['Sub categoria'] || localRow['Sub categoria'] === "Sin Subcategoría"}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Clasificación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Sin Clasificación">Sin Clasificación</SelectItem>
            {getClasificacionesForSubCategoria(correctType || "", localRow['Sub categoria'] || "").map(clasif => (
              <SelectItem key={clasif} value={clasif}>{clasif}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select 
          value={localRow['Categoria 1']} 
          onValueChange={(value) => handleFieldChange('Categoria 1', value)}
          disabled={!localRow.Clasificacion || localRow.Clasificacion === "Sin Clasificación"}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Categoría 1" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Sin Categoría">Sin Categoría</SelectItem>
            {categorias1.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
})

InlineEditor.displayName = 'InlineEditor'

// Hierarchical account row component
const HierarchicalAccountRow = React.memo(({
  account,
  level = 0,
  expandedAccounts,
  onToggleExpand,
  editingAccountId,
  onEdit,
  onUpdate,
  onCancelEdit
}: {
  account: HierarchicalAccount
  level?: number
  expandedAccounts: Set<string>
  onToggleExpand: (codigo: string) => void
  editingAccountId: string | null
  onEdit: (codigo: string) => void
  onUpdate: (codigo: string, updates: Partial<DebugDataRow>) => void
  onCancelEdit: () => void
}) => {
  const isExpanded = expandedAccounts.has(account.codigo)
  const isEditing = editingAccountId === account.codigo
  const hasChildren = account.children.length > 0
  const isDetail = isDetailAccount(account.codigo)
  const isHierarchy = isHierarchyRow(account.codigo)
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'bg-green-50 border-green-200 text-green-800'
      case 'partial': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'invalid': return 'bg-red-50 border-red-200 text-red-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'partial': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'invalid': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return <Calculator className="h-4 w-4 text-gray-600" />
    }
  }

  const getClassificationStatusColor = (status: string) => {
    switch (status) {
      case 'classified': return 'bg-green-50 border-green-200 text-green-700'
      case 'hierarchy': return 'bg-blue-50 border-blue-200 text-blue-700'
      case 'partial': return 'bg-yellow-50 border-yellow-200 text-yellow-700'
      case 'untyped': return 'bg-red-50 border-red-200 text-red-700'
      default: return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  if (isEditing) {
    return (
      <div style={{ paddingLeft: `${level * 20}px` }}>
        <InlineEditor
          account={account}
          onUpdate={(updates) => onUpdate(account.codigo, updates)}
          onCancel={onCancelEdit}
        />
      </div>
    )
  }

  return (
    <>
      {/* Main Row - Excel-like appearance */}
      <div 
        className={`
          grid grid-cols-12 gap-2 items-center py-3 px-4 border-b border-gray-200
          ${level === 0 ? 'bg-blue-50 border-l-4 border-l-blue-500 font-medium' : ''}
          ${level === 1 ? 'bg-green-50 border-l-4 border-l-green-500' : ''}
          ${level === 2 ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''}
          ${level === 3 ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''}
          ${isHierarchy ? 'bg-blue-100 border-l-4 border-l-blue-600 font-semibold' : ''}
        `}
        style={{ paddingLeft: `${level * 20 + 16}px` }}
      >
        {/* Expand/Collapse Button */}
        <div className="col-span-1 flex items-center border-r border-gray-200 pr-2">
          {hasChildren ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleExpand(account.codigo)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <div className="w-6" />
          )}
        </div>

        {/* Level Badge */}
        <div className="col-span-1 border-r border-gray-200 pr-2">
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
            Nivel {account.level}
          </span>
        </div>

        {/* Account Code */}
        <div className="col-span-2 border-r border-gray-200 pr-2">
          <span className="font-mono text-xs text-gray-600" title={account.codigo}>
            {account.codigo}
          </span>
        </div>

        {/* Account Name */}
        <div className="col-span-4 border-r border-gray-200 pr-2">
          <span className="text-sm text-gray-900 truncate block" title={account.concepto}>
            {account.concepto}
          </span>
        </div>

        {/* Main Value (Black) - Most Important */}
        <div className="col-span-2 text-right border-r border-gray-200 pr-2">
          <div className="text-sm font-semibold text-gray-900">
            {formatCurrencyWithContext(account.originalRow.Monto, account.tipo, account.codigo, account.concepto)}
          </div>
        </div>

        {/* Classified Value (Green) - Second Most Important */}
        <div className="col-span-2 text-right border-r border-gray-200 pr-2">
          {account.classifiedAmount !== 0 ? (
            <div className="text-sm font-medium text-green-700">
              {formatCurrencyWithContext(account.classifiedAmount, account.tipo, account.codigo, account.concepto)}
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">
              Sin clasificar
            </div>
          )}
        </div>

        {/* Validation Status */}
        <div className="col-span-1 flex items-center justify-end gap-2">
          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(account.validationStatus)}`}>
            {account.validationStatus === 'valid' ? '✅ Válido' : account.validationStatus === 'partial' ? '⚠️ Parcial' : '❌ Inválido'}
          </span>
        </div>

        {/* Edit Button */}
        <div className="col-span-1 flex items-center justify-end">
          {!isHierarchy && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(account.codigo)}
              className="h-6 px-2"
              title="Editar clasificación"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          {isHierarchy && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
              Total Control
            </span>
          )}
        </div>
      </div>

      {/* Validation Message Row - Only show if there's a message */}
      {account.validationMessage && (
        <div 
          className="px-4 py-2 text-xs text-gray-600 bg-gray-50 border-b border-gray-100"
          style={{ paddingLeft: `${level * 20 + 32}px` }}
        >
          <div className="flex items-center gap-2">
            <Info className="h-3 w-3 text-gray-500" />
            <span>{account.validationMessage}</span>
            {account.children.length > 0 && (
              <span className="text-gray-500">
              (Hijos: {account.children.length})
            </span>
            )}
          </div>
        </div>
      )}

      {/* Virtual Account Indicator */}
      {account.originalRow.id?.startsWith('virtual-') && (
        <div 
          className="px-4 py-1 text-xs text-purple-600 bg-purple-50 border-b border-purple-100"
          style={{ paddingLeft: `${level * 20 + 32}px` }}
        >
          🏗️ Cuenta virtual - jerarquía inconsistente
        </div>
      )}
          
      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {account.children
            .sort((a, b) => a.codigo.localeCompare(b.codigo))
            .map(child => (
              <HierarchicalAccountRow
                key={child.codigo}
                account={child}
                level={level + 1}
                expandedAccounts={expandedAccounts}
                onToggleExpand={onToggleExpand}
                editingAccountId={editingAccountId}
                onEdit={onEdit}
                onUpdate={onUpdate}
                onCancelEdit={onCancelEdit}
              />
            ))}
        </div>
      )}
    </>
  )
})

HierarchicalAccountRow.displayName = 'HierarchicalAccountRow'

export default function EnhancedDebugModal({ 
  isOpen, 
  onClose, 
  data, 
  onDataChange,
  validationSummary,
  onReturnToValidation
}: EnhancedDebugModalProps) {
  
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<string>('all')

  // Build hierarchical structure
  const hierarchicalAccounts = useMemo(() => {
    console.log('=== DEBUG: Building hierarchical structure ===')
    console.log('Input data length:', data.length)
    
    // NUEVO: Test simple para verificar la lógica de jerarquía
    const testAccounts = ['5000-0000-000-000', '5000-2000-000-000', '5000-1001-001-001', '5000-1004-100-000']
    console.log('🧪 TEST SIMPLE PARA CUENTAS REALES DEL DATASET')
    improvedHierarchyDetector.testNumericSequenceDetection(testAccounts)
    
    // NUEVO: Test para cuenta con padre intermedio faltante
    const testMissingParent = ['5000-1000-002-003', '5000-1004-100-000']
    console.log('🧪 TEST PARA PADRE INTERMEDIO FALTANTE')
    improvedHierarchyDetector.testNumericSequenceDetection(testMissingParent)
    
    return buildHierarchicalStructure(data)
  }, [data])

  // Filter accounts based on search and filter
  const filteredAccounts = useMemo(() => {
    console.log('=== DEBUG: Filtering accounts ===')
    console.log('Initial hierarchical accounts:', hierarchicalAccounts.length)
    console.log('Search term:', searchTerm)
    console.log('Selected filter:', selectedFilter)
    
    let filtered = hierarchicalAccounts

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(account => 
        account.concepto.toLowerCase().includes(searchLower) ||
        account.codigo.toLowerCase().includes(searchLower)
      )
      console.log('After search filter:', filtered.length)
    }

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(account => {
        switch (selectedFilter) {
          case 'invalid':
            return account.validationStatus === 'invalid'
          case 'partial':
            return account.validationStatus === 'partial'
          case 'valid':
            return account.validationStatus === 'valid'
          case 'control':
            return isHierarchyRow(account.codigo)
          case 'unclassified':
            return account.classifiedAmount === 0 && !isHierarchyRow(account.codigo)
          default:
            return true
        }
      })
      console.log('After status filter:', filtered.length)
    }

    console.log('Final filtered accounts:', filtered.length)
    console.log('Filtered account codes:', filtered.map(acc => acc.codigo))
    
    return filtered
  }, [hierarchicalAccounts, searchTerm, selectedFilter])

  // Calculate overall statistics
  const stats = useMemo(() => {
    const allAccounts: HierarchicalAccount[] = []
    
    const collectAccounts = (accounts: HierarchicalAccount[]) => {
      accounts.forEach(account => {
        allAccounts.push(account)
        collectAccounts(account.children)
      })
    }
    
    collectAccounts(hierarchicalAccounts)
    
    const detailAccounts = allAccounts.filter(acc => isDetailAccount(acc.codigo))
    const aggregationAccounts = allAccounts.filter(acc => !isDetailAccount(acc.codigo))
    
    return {
      totalAccounts: allAccounts.length,
      detailAccounts: detailAccounts.length,
      aggregationAccounts: aggregationAccounts.length,
      classifiedDetails: detailAccounts.filter(acc => acc.isClassified).length,
      validAggregations: aggregationAccounts.filter(acc => acc.validationStatus === 'valid').length,
      totalClassifiedAmount: detailAccounts.reduce((sum, acc) => sum + acc.classifiedAmount, 0),
      totalUnclassifiedAmount: detailAccounts.reduce((sum, acc) => sum + acc.unclassifiedAmount, 0)
    }
  }, [hierarchicalAccounts])

  const handleAccountUpdate = useCallback(async (codigo: string, updates: Partial<DebugDataRow>) => {
    const newData = data.map(row => {
      if (row.Codigo === codigo) {
        return { ...row, ...updates }
      }
      return row
    })
    
    onDataChange(newData)
    setEditingAccountId(null)
  }, [data, onDataChange])

  const handleToggleExpand = useCallback((codigo: string) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(codigo)) {
        newSet.delete(codigo)
      } else {
        newSet.add(codigo)
      }
      return newSet
    })
  }, [])

  const expandAll = useCallback(() => {
    const allCodes = new Set<string>()
    const collectCodes = (accounts: HierarchicalAccount[]) => {
      accounts.forEach(account => {
        if (account.children.length > 0) {
          allCodes.add(account.codigo)
        }
        collectCodes(account.children)
      })
    }
    collectCodes(hierarchicalAccounts)
    setExpandedAccounts(allCodes)
  }, [hierarchicalAccounts])

  const collapseAll = useCallback(() => {
    setExpandedAccounts(new Set())
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-h-[100vh] md:max-h-[95vh] max-w-full md:max-w-7xl overflow-hidden flex flex-col p-0 md:p-6">
        <div className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="flex-shrink-0 p-4 md:p-0 border-b md:border-0">
            <DialogTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-blue-600" />
                <span>Validación de Valores Clasificados</span>
              </div>
              <Badge variant={stats.validAggregations === stats.aggregationAccounts ? "default" : "destructive"}>
                {stats.validAggregations}/{stats.aggregationAccounts} Válidos
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Verificar que los valores clasificados coincidan con los valores principales para llegar al Total de Control
            </DialogDescription>
          </DialogHeader>

          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-3 mb-4 p-4 md:p-0">
              <div className="flex-1">
                <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                  placeholder="Buscar cuenta o concepto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📋 Todas las cuentas</SelectItem>
                  <SelectItem value="invalid">❌ Con discrepancias</SelectItem>
                  <SelectItem value="partial">⚠️ Parcialmente válidas</SelectItem>
                  <SelectItem value="valid">✅ Válidas</SelectItem>
                  <SelectItem value="control">🎯 Totales de Control</SelectItem>
                  <SelectItem value="unclassified">📝 Sin clasificar</SelectItem>
                </SelectContent>
              </Select>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expandir Todo
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Colapsar Todo
                </Button>
            </div>
                                </div>

          {/* Hierarchical Tree View - Excel-like */}
          <div className="flex-1 border rounded-lg bg-white overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 items-center py-2 px-4 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 font-medium">
              <div className="col-span-1"></div>
              <div className="col-span-1">Nivel</div>
              <div className="col-span-2">Código</div>
              <div className="col-span-4">Concepto</div>
              <div className="col-span-2 text-right">Principal</div>
              <div className="col-span-2 text-right">Clasificado</div>
            </div>
            
            {/* Table Content */}
            <div className="h-full overflow-y-auto">
              <div className="min-h-[400px]">
                {filteredAccounts.map(account => (
                  <HierarchicalAccountRow
                    key={account.codigo}
                    account={account}
                    level={0}
                    expandedAccounts={expandedAccounts}
                    onToggleExpand={handleToggleExpand}
                    editingAccountId={editingAccountId}
                    onEdit={setEditingAccountId}
                    onUpdate={handleAccountUpdate}
                    onCancelEdit={() => setEditingAccountId(null)}
                  />
                ))}
                
                {filteredAccounts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron cuentas con los filtros aplicados
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 flex justify-between gap-3 p-4 md:p-0 md:pt-4">
            <div className="text-xs text-gray-500">
              {filteredAccounts.length} cuentas • {stats.validAggregations}/{stats.aggregationAccounts} válidas
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              {onReturnToValidation && (
                <Button onClick={onReturnToValidation}>
                  <Save className="h-4 w-4 mr-2" />
                  Volver a Validación
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
} 