/**
 * Algoritmo mejorado para detección de jerarquías contables
 * Soluciona el problema de cuentas inconsistentes por familia
 */

export interface AccountCode {
  codigo: string;
  concepto: string;
  monto: number;
  tipo: string;
}

export interface HierarchyResult {
  account: AccountCode;
  level: number;
  family: string;
  parent: string | null;
  parentType: 'DIRECT' | 'FAMILY_ROOT' | 'ORPHAN_ADOPTION' | 'ROOT';
  children: string[];
  warnings: string[];
  detectedBy: 'FAMILY_ANALYSIS' | 'ZERO_PATTERN' | 'HYBRID';
}

export class ImprovedHierarchyDetector {
  
  /**
   * Extrae la familia de la cuenta (primeros dos segmentos)
   */
  private extractFamily(codigo: string): string {
    const parts = codigo.split('-');
    return `${parts[0]}-${parts[1]}`;
  }

  /**
   * Extrae los segmentos individuales del código
   */
  private parseAccountCode(codigo: string): {
    nivel1: string;
    nivel2: string;
    nivel3: string;
    nivel4: string;
    family: string;
  } {
    const parts = codigo.split('-');
    if (parts.length !== 4) {
      throw new Error(`Código inválido: ${codigo}`);
    }
    
    return {
      nivel1: parts[0],
      nivel2: parts[1],
      nivel3: parts[2],
      nivel4: parts[3],
      family: `${parts[0]}-${parts[1]}`
    };
  }

  /**
   * Determina el nivel usando análisis de familia + patrón de ceros
   */
  private determineLevel(codigo: string, familyAccounts: Set<string>): {
    level: number;
    detectedBy: 'FAMILY_ANALYSIS' | 'ZERO_PATTERN' | 'HYBRID';
  } {
    const parsed = this.parseAccountCode(codigo);
    
    // PASO 1: Análisis por familia
    const familyAnalysis = this.analyzeByFamily(codigo, familyAccounts);
    
    // PASO 2: Análisis por patrón de ceros (algoritmo original)
    const zeroPatternAnalysis = this.analyzeByZeroPattern(codigo);
    
    // PASO 3: Resolución de conflictos
    return this.resolveConflict(familyAnalysis, zeroPatternAnalysis, parsed);
  }

  /**
   * Análisis por familia - determina nivel basado en la estructura familiar
   * MEJORADO: Incluye detección de secuencias numéricas para jerarquías entre familias
   */
  private analyzeByFamily(codigo: string, familyAccounts: Set<string>): {
    level: number;
    confidence: number;
  } {
    const parsed = this.parseAccountCode(codigo);
    const family = parsed.family;
    
    console.log(`🔍 ANALIZANDO POR FAMILIA: ${codigo}`);
    
    // Nivel 1: Cuentas principales (4100-0000-000-000, 5000-0000-000-000)
    if (parsed.nivel2 === '0000' && parsed.nivel3 === '000' && parsed.nivel4 === '000') {
      console.log(`   ✅ Nivel 1: Cuenta principal`);
      return { level: 1, confidence: 1.0 }; // Cuenta principal
    }
    
    // NUEVO: Detección de secuencias numéricas para jerarquías entre familias
    if (parsed.nivel3 === '000' && parsed.nivel4 === '000' && parsed.nivel2 !== '0000') {
      console.log(`   🔍 Verificando secuencia numérica para: ${codigo}`);
      const sequenceAnalysis = this.analyzeNumericSequence(codigo, familyAccounts);
      if (sequenceAnalysis.isParent) {
        console.log(`   ✅ Nivel 1: Padre de secuencia`);
        return { level: 1, confidence: 0.9 }; // Padre de secuencia (nivel superior)
      } else if (sequenceAnalysis.isChild) {
        console.log(`   ✅ Nivel 2: Hijo de secuencia`);
        return { level: 2, confidence: 0.85 }; // Hijo de secuencia
      } else {
        // NUEVO: Si no es parte de una secuencia, asignar Nivel 2 por defecto
        console.log(`   ✅ Nivel 2: Subtotal de familia (no secuencia)`);
        return { level: 2, confidence: 0.95 }; // Subtotal de familia
      }
    }
    
    // Nivel 3: Subcategorías (4100-1000-001-000, 5000-1000-001-000)
    if (parsed.nivel4 === '000' && parsed.nivel3 !== '000') {
      console.log(`   ✅ Nivel 3: Subcategoría`);
      return { level: 3, confidence: 0.9 }; // Subcategoría
    }
    
    // Nivel 4: Cuentas de detalle (4100-1000-001-001, 5000-1000-001-001)
    console.log(`   ✅ Nivel 4: Cuenta detalle`);
    return { level: 4, confidence: 0.95 }; // Cuenta detalle
  }

  /**
   * NUEVO: Analiza secuencias numéricas para detectar jerarquías entre familias
   * Ejemplo: 5000-2000-000-000 (padre) vs 5000-2001-000-000 (hijo)
   */
  private analyzeNumericSequence(codigo: string, familyAccounts: Set<string>): {
    isParent: boolean;
    isChild: boolean;
    parentCode: string | null;
    confidence: number;
  } {
    const parsed = this.parseAccountCode(codigo);
    const firstSegment = parsed.nivel1;
    const secondSegment = parsed.nivel2;
    
    console.log(`🔍 ANALIZANDO SECUENCIA NUMÉRICA para: ${codigo}`);
    console.log(`   Primer segmento: ${firstSegment}, Segundo segmento: ${secondSegment}`);
    
    // Buscar todas las familias que comparten el primer segmento
    const relatedFamilies = new Set<string>();
    familyAccounts.forEach(accountCode => {
      const accountParts = accountCode.split('-');
      if (accountParts.length >= 2 && accountParts[0] === firstSegment) {
        // NUEVO: Simplificar la lógica - solo verificar que tenga el formato correcto
        if (accountParts[2] === '000' && accountParts[3] === '000') {
          relatedFamilies.add(accountParts[1]);
        }
      }
    });
    
    console.log(`   Familias relacionadas encontradas: ${Array.from(relatedFamilies).join(', ')}`);
    
    if (relatedFamilies.size < 2) {
      console.log(`   ❌ Menos de 2 familias relacionadas, no es secuencia`);
      return { isParent: false, isChild: false, parentCode: null, confidence: 0 };
    }
    
    // Convertir a números y ordenar
    const familyNumbers = Array.from(relatedFamilies)
      .map(f => parseInt(f))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);
    
    console.log(`   Números de familia: ${familyNumbers.join(', ')}`);
    
    if (familyNumbers.length < 2) {
      console.log(`   ❌ Menos de 2 números válidos, no es secuencia`);
      return { isParent: false, isChild: false, parentCode: null, confidence: 0 };
    }
    
    // Detectar si forman una secuencia consecutiva
    const currentNumber = parseInt(secondSegment);
    const isConsecutive = this.isConsecutiveSequence(familyNumbers);
    
    console.log(`   Número actual: ${currentNumber}, ¿Es consecutivo?: ${isConsecutive}`);
    
    if (!isConsecutive) {
      console.log(`   ❌ No es secuencia consecutiva`);
      return { isParent: false, isChild: false, parentCode: null, confidence: 0 };
    }
    
    // Determinar si es padre o hijo
    const minNumber = Math.min(...familyNumbers);
    const maxNumber = Math.max(...familyNumbers);
    
    console.log(`   Rango: ${minNumber} - ${maxNumber}, Número actual: ${currentNumber}`);
    
    // Regla: El número base (menor) es el padre
    if (currentNumber === minNumber) {
      console.log(`   ✅ ES PADRE de secuencia (número base: ${minNumber})`);
      return { 
        isParent: true, 
        isChild: false, 
        parentCode: null, 
        confidence: 0.9 
      };
    } else if (currentNumber > minNumber && currentNumber <= maxNumber) {
      // Buscar el padre (número base)
      const parentCode = `${firstSegment}-${minNumber.toString().padStart(4, '0')}-000-000`;
      console.log(`   ✅ ES HIJO de secuencia, padre: ${parentCode}`);
      return { 
        isParent: false, 
        isChild: true, 
        parentCode: parentCode, 
        confidence: 0.85 
      };
    }
    
    console.log(`   ❌ No cumple criterios de secuencia`);
    return { isParent: false, isChild: false, parentCode: null, confidence: 0 };
  }

  /**
   * NUEVO: Verifica si una secuencia de números es consecutiva
   */
  private isConsecutiveSequence(numbers: number[]): boolean {
    if (numbers.length < 2) return false;
    
    // Ordenar números
    const sorted = [...numbers].sort((a, b) => a - b);
    
    // Verificar si son consecutivos
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i-1] > 1) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Análisis por patrón de ceros (algoritmo original)
   */
  private analyzeByZeroPattern(codigo: string): {
    level: number;
    confidence: number;
  } {
    const parts = codigo.split('-');
    
    // Lógica original del algoritmo
    let level = 4; // Default: cuenta detalle
    let confidence = 0.8;
    
    if (parts[3] === '000') level = 3;
    if (parts[2] === '000' && parts[3] === '000') level = 2;
    if (parts[1] === '0000' && parts[2] === '000' && parts[3] === '000') level = 1;
    
    return { level, confidence };
  }

  /**
   * Resuelve conflictos entre análisis de familia vs patrón de ceros
   */
  private resolveConflict(
    familyAnalysis: { level: number; confidence: number },
    zeroPatternAnalysis: { level: number; confidence: number },
    parsed: any
  ): { level: number; detectedBy: 'FAMILY_ANALYSIS' | 'ZERO_PATTERN' | 'HYBRID' } {
    
    // Si family analysis tiene alta confianza, usarlo
    if (familyAnalysis.confidence >= 0.8) {
      return {
        level: familyAnalysis.level,
        detectedBy: 'FAMILY_ANALYSIS'
      };
    }
    
    // Si family analysis falla, usar zero pattern
    if (familyAnalysis.confidence < 0.5) {
      return {
        level: zeroPatternAnalysis.level,
        detectedBy: 'ZERO_PATTERN'
      };
    }
    
    // Resolución híbrida: priorizar familia para casos específicos
    const isProblematicCase = this.isProblematicCase(parsed);
    
    if (isProblematicCase && familyAnalysis.level !== zeroPatternAnalysis.level) {
      // Para casos problemáticos como 5000-2000-020-000, usar familia
      return {
        level: familyAnalysis.level,
        detectedBy: 'HYBRID'
      };
    }
    
    // Default: usar el de mayor confianza
    return familyAnalysis.confidence >= zeroPatternAnalysis.confidence
      ? { level: familyAnalysis.level, detectedBy: 'FAMILY_ANALYSIS' }
      : { level: zeroPatternAnalysis.level, detectedBy: 'ZERO_PATTERN' };
  }

  /**
   * Detecta casos problemáticos conocidos
   */
  private isProblematicCase(parsed: any): boolean {
    // Casos como 5000-2000-020-000, 5000-2001-017-000, etc.
    // Que terminan en -000 pero no son -000-000
    return (
      parsed.nivel4 === '000' && 
      parsed.nivel3 !== '000' && 
      parseInt(parsed.nivel3) > 0
    );
  }

  /**
   * Determina el padre de una cuenta basado en el nuevo algoritmo
   * MEJORA: Maneja cuentas huérfanas adecuadamente
   */
  private determineParent(codigo: string, allAccounts: Set<string>): {
    parent: string | null;
    parentType: 'DIRECT' | 'FAMILY_ROOT' | 'ORPHAN_ADOPTION' | 'ROOT';
    warnings: string[];
  } {
    const parsed = this.parseAccountCode(codigo);
    const { level } = this.determineLevel(codigo, allAccounts);
    const warnings: string[] = [];
    
    switch (level) {
      case 4: // Cuenta detalle
        // PASO 1: Buscar padre directo nivel 3
        const expectedParentL3 = `${parsed.family}-${parsed.nivel3}-000`;
        console.log(`🔍 DETERMINANDO PADRE para Level 4: ${codigo}`);
        console.log(`   Buscando padre L3: ${expectedParentL3}, ¿Existe?: ${allAccounts.has(expectedParentL3)}`);
        
        if (allAccounts.has(expectedParentL3)) {
          console.log(`   ✅ Asignando padre L3: ${expectedParentL3}`);
          return {
            parent: expectedParentL3,
            parentType: 'DIRECT',
            warnings
          };
        }
        
        // PASO 2: Si no existe padre L3, buscar padre L2 (familia)
        const expectedParentL2 = `${parsed.family}-000-000`;
        console.log(`   Buscando padre L2: ${expectedParentL2}, ¿Existe?: ${allAccounts.has(expectedParentL2)}`);
        
        if (allAccounts.has(expectedParentL2)) {
          console.log(`   ✅ Asignando padre L2: ${expectedParentL2}`);
          warnings.push(`Padre L3 ${expectedParentL3} no existe, asignado a padre L2 ${expectedParentL2}`);
          return {
            parent: expectedParentL2,
            parentType: 'FAMILY_ROOT',
            warnings
          };
        }
        
        // PASO 3: Si no existe padre L2, buscar padre L1 (cuenta principal)
        const parentL1ForL4 = `${parsed.nivel1}-0000-000-000`;
        console.log(`   Buscando padre L1: ${parentL1ForL4}, ¿Existe?: ${allAccounts.has(parentL1ForL4)}`);
        
        if (allAccounts.has(parentL1ForL4)) {
          console.log(`   ✅ Asignando padre L1: ${parentL1ForL4}`);
          warnings.push(`Padres intermedios no existen, asignado a cuenta principal ${parentL1ForL4}`);
          return {
            parent: parentL1ForL4,
            parentType: 'ORPHAN_ADOPTION',
            warnings
          };
        }
        
        // PASO 4: Si no existe padre L1, será raíz
        console.log(`   ❌ Sin padre, será raíz`);
        warnings.push(`Cuenta huérfana: no se encontraron padres en ningún nivel`);
        return {
          parent: null,
          parentType: 'ROOT',
          warnings
        };
        
      case 3: // Sub-categoría
        console.log(`🔍 DETERMINANDO PADRE para Level 3: ${codigo}`);
        const familyRootL3 = `${parsed.family}-000-000`;
        console.log(`   Buscando raíz de familia: ${familyRootL3}, ¿Existe?: ${allAccounts.has(familyRootL3)}`);
        
        if (allAccounts.has(familyRootL3)) {
          console.log(`   ✅ Asignando raíz de familia: ${familyRootL3}`);
          return {
            parent: familyRootL3,
            parentType: 'FAMILY_ROOT',
            warnings
          };
        }
        
        // NUEVO: Buscar otros Level 3 en la misma familia para agrupar
        const otherLevel3InFamily = Array.from(allAccounts).find(account => {
          const accountParts = account.split('-');
          return accountParts[0] === parsed.nivel1 && 
                 accountParts[1] === parsed.nivel2 && 
                 accountParts[2] !== parsed.nivel3 && 
                 accountParts[3] === '000' &&
                 account !== codigo;
        });
        
        if (otherLevel3InFamily) {
          console.log(`   ✅ Agrupando con otro Level 3 en familia: ${otherLevel3InFamily}`);
          warnings.push(`Agrupado con otro Level 3 en familia: ${otherLevel3InFamily}`);
          return {
            parent: otherLevel3InFamily,
            parentType: 'DIRECT',
            warnings
          };
        }
        
        // NUEVO: Si no existe la raíz de familia, buscar padre de nivel 1
        const parentL1ForL3 = `${parsed.nivel1}-0000-000-000`;
        console.log(`   Buscando padre L1: ${parentL1ForL3}, ¿Existe?: ${allAccounts.has(parentL1ForL3)}`);
        
        if (allAccounts.has(parentL1ForL3)) {
          console.log(`   ✅ Asignando padre L1 (adopción): ${parentL1ForL3}`);
          warnings.push(`Padre de familia ${parsed.family} no existe, asignado a cuenta principal ${parentL1ForL3}`);
          return {
            parent: parentL1ForL3,
            parentType: 'ORPHAN_ADOPTION',
            warnings
          };
        }
        
        console.log(`   ❌ Sin padre, será raíz`);
        warnings.push(`Familia ${parsed.family} sin cuenta raíz ni cuenta principal`);
        return {
          parent: null,
          parentType: 'ROOT',
          warnings
        };
        
      case 2: // Cuenta raíz de familia
        // NUEVO: Verificar si es parte de una secuencia numérica
        console.log(`🔍 DETERMINANDO PADRE para Level 2: ${codigo}`);
        const sequenceAnalysis = this.analyzeNumericSequence(codigo, allAccounts);
        console.log(`   Resultado secuencia:`, sequenceAnalysis);
        
        if (sequenceAnalysis.isChild && sequenceAnalysis.parentCode && allAccounts.has(sequenceAnalysis.parentCode)) {
          console.log(`   ✅ Asignando padre por secuencia: ${sequenceAnalysis.parentCode}`);
          warnings.push(`Secuencia numérica detectada: ${codigo} es hijo de ${sequenceAnalysis.parentCode}`);
          return {
            parent: sequenceAnalysis.parentCode,
            parentType: 'DIRECT',
            warnings
          };
        }
        
        // Lógica original para cuentas raíz de familia
        const parentL1ForL2 = `${parsed.nivel1}-0000-000-000`;
        console.log(`   Buscando padre L1: ${parentL1ForL2}, ¿Existe?: ${allAccounts.has(parentL1ForL2)}`);
        
        if (allAccounts.has(parentL1ForL2)) {
          console.log(`   ✅ Asignando padre L1: ${parentL1ForL2}`);
          return {
            parent: parentL1ForL2,
            parentType: 'DIRECT',
            warnings
          };
        }
        
        // NUEVO: Si no existe padre L1, buscar otros Level 2 en la misma familia
        const otherLevel2InFamily = Array.from(allAccounts).find(account => {
          const accountParts = account.split('-');
          return accountParts[0] === parsed.nivel1 && 
                 accountParts[1] !== parsed.nivel2 && 
                 accountParts[2] === '000' && 
                 accountParts[3] === '000' &&
                 account !== codigo;
        });
        
        if (otherLevel2InFamily) {
          console.log(`   ✅ Agrupando con otro Level 2 en familia: ${otherLevel2InFamily}`);
          warnings.push(`Agrupado con otro Level 2 en familia: ${otherLevel2InFamily}`);
          return {
            parent: otherLevel2InFamily,
            parentType: 'DIRECT',
            warnings
          };
        }
        
        console.log(`   ❌ Sin padre, será raíz`);
        return {
          parent: null,
          parentType: 'ROOT',
          warnings
        };
        
      case 1: // Cuenta principal
        return {
          parent: null,
          parentType: 'ROOT',
          warnings
        };
        
      default:
        warnings.push(`Nivel inválido: ${level}`);
        return {
          parent: null,
          parentType: 'ROOT',
          warnings
        };
    }
  }

  /**
   * Procesa todas las cuentas y construye la jerarquía mejorada
   */
  public buildHierarchy(accounts: AccountCode[]): HierarchyResult[] {
    const allCodes = new Set(accounts.map(acc => acc.codigo));
    const results: HierarchyResult[] = [];
    
    // Procesar cada cuenta
    for (const account of accounts) {
      const { level, detectedBy } = this.determineLevel(account.codigo, allCodes);
      const parentInfo = this.determineParent(account.codigo, allCodes);
      const family = this.extractFamily(account.codigo);
      
      results.push({
        account,
        level,
        family,
        parent: parentInfo.parent,
        parentType: parentInfo.parentType,
        children: [], // Se calculará después
        warnings: parentInfo.warnings,
        detectedBy
      });
    }
    
    // Calcular hijos
    for (const result of results) {
      result.children = results
        .filter(r => r.parent === result.account.codigo)
        .map(r => r.account.codigo);
    }
    
    return results;
  }

  /**
   * Genera reporte de correcciones aplicadas
   */
  public generateCorrectionReport(accounts: AccountCode[]): {
    corrections: Array<{
      codigo: string;
      oldLevel: number;
      newLevel: number;
      reason: string;
      detectedBy: string;
    }>;
    summary: {
      totalAccounts: number;
      correctedAccounts: number;
      familyBasedCorrections: number;
      hybridCorrections: number;
    };
  } {
    const allCodes = new Set(accounts.map(acc => acc.codigo));
    const corrections = [];
    
    for (const account of accounts) {
      // Nivel según algoritmo original
      const oldLevel = this.analyzeByZeroPattern(account.codigo).level;
      
      // Nivel según algoritmo mejorado
      const { level: newLevel, detectedBy } = this.determineLevel(account.codigo, allCodes);
      
      if (oldLevel !== newLevel) {
        corrections.push({
          codigo: account.codigo,
          oldLevel,
          newLevel,
          reason: this.generateCorrectionReason(account.codigo, oldLevel, newLevel),
          detectedBy
        });
      }
    }
    
    return {
      corrections,
      summary: {
        totalAccounts: accounts.length,
        correctedAccounts: corrections.length,
        familyBasedCorrections: corrections.filter(c => c.detectedBy === 'FAMILY_ANALYSIS').length,
        hybridCorrections: corrections.filter(c => c.detectedBy === 'HYBRID').length
      }
    };
  }

  private generateCorrectionReason(codigo: string, oldLevel: number, newLevel: number): string {
    const parsed = this.parseAccountCode(codigo);
    
    if (this.isProblematicCase(parsed)) {
      return `Cuenta ${codigo} corregida: termina en -000 pero pertenece a familia ${parsed.family}, debe ser hijo directo de ${parsed.family}-000-000`;
    }
    
    return `Nivel ajustado de ${oldLevel} a ${newLevel} por análisis de familia`;
  }

  /**
   * Convierte DebugDataRow a AccountCode para compatibilidad
   */
  public convertDebugDataToAccountCode(debugData: any[]): AccountCode[] {
    return debugData.map(row => ({
      codigo: row.Codigo,
      concepto: row.Concepto,
      monto: row.Monto,
      tipo: row.Tipo || 'Indefinido'
    }));
  }

  /**
   * Aplica la jerarquía mejorada a los datos de debug
   */
  public applyImprovedHierarchy(debugData: any[]): {
    hierarchyResults: HierarchyResult[];
    correctionReport: any;
    enhancedData: any[];
  } {
    const accountCodes = this.convertDebugDataToAccountCode(debugData);
    const hierarchyResults = this.buildHierarchy(accountCodes);
    const correctionReport = this.generateCorrectionReport(accountCodes);
    
    // Crear datos mejorados con la nueva jerarquía
    const enhancedData = debugData.map(row => {
      const hierarchyResult = hierarchyResults.find(h => h.account.codigo === row.Codigo);
      if (hierarchyResult) {
        return {
          ...row,
          _hierarchyLevel: hierarchyResult.level,
          _hierarchyFamily: hierarchyResult.family,
          _hierarchyParent: hierarchyResult.parent,
          _hierarchyParentType: hierarchyResult.parentType,
          _hierarchyDetectedBy: hierarchyResult.detectedBy,
          _hierarchyWarnings: hierarchyResult.warnings
        };
      }
      return row;
    });
    
    return {
      hierarchyResults,
      correctionReport,
      enhancedData
    };
  }

  /**
   * MÉTODO DE PRUEBA: Verificar la detección de secuencias numéricas
   */
  public testNumericSequenceDetection(testAccounts: string[]): void {
    console.log('🧪 PRUEBA DE DETECCIÓN DE SECUENCIAS NUMÉRICAS');
    console.log('Cuentas de prueba:', testAccounts);
    
    const accountSet = new Set(testAccounts);
    
    testAccounts.forEach(account => {
      console.log(`\n--- Probando cuenta: ${account} ---`);
      const sequenceResult = this.analyzeNumericSequence(account, accountSet);
      console.log('Resultado:', sequenceResult);
      
      const parsed = this.parseAccountCode(account);
      const familyAnalysis = this.analyzeByFamily(account, accountSet);
      console.log('Análisis por familia:', familyAnalysis);
      
      const levelResult = this.determineLevel(account, accountSet);
      console.log('Nivel determinado:', levelResult);
      
      const parentResult = this.determineParent(account, accountSet);
      console.log('Padre determinado:', parentResult);
    });
  }
}

// Export singleton instance
export const improvedHierarchyDetector = new ImprovedHierarchyDetector(); 