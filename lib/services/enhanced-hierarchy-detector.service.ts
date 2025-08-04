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
    // Protección contra valores undefined o null
    if (!codigo) {
      return '0000-0000'; // Valor predeterminado seguro
    }
    
    const parts = codigo.split('-');
    if (parts.length < 2) {
      return `${parts[0] || '0000'}-0000`;
    }
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
    // Protección contra valores undefined o null
    if (!codigo) {
      console.warn(`Código inválido (undefined o null): ${codigo}`);
      // Devolver estructura predeterminada para evitar errores en cascada
      return {
        nivel1: '0000',
        nivel2: '0000',
        nivel3: '000',
        nivel4: '000',
        family: '0000-0000'
      };
    }
    
    const parts = codigo.split('-');
    if (parts.length !== 4) {
      console.warn(`Código con formato inválido: ${codigo}`);
      // Devolver estructura predeterminada para evitar errores en cascada
      return {
        nivel1: parts[0] || '0000',
        nivel2: '0000',
        nivel3: '000',
        nivel4: '000',
        family: `${parts[0] || '0000'}-0000`
      };
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
   * Analiza una cuenta por familia para determinar su nivel jerárquico
   */
  private analyzeByFamily(codigo: string, familyAccounts: Set<string>): {
    level: number;
    confidence: number;
  } {
    const parsed = this.parseAccountCode(codigo);
    const family = parsed.family;
    
    // Nivel 1: Cuentas principales (4100-0000-000-000, 5000-0000-000-000)
    if (parsed.nivel2 === '0000' && parsed.nivel3 === '000' && parsed.nivel4 === '000') {
      return { level: 1, confidence: 1.0 }; // Cuenta principal
    }
    
    // NUEVO: Detección específica de cuentas padre de familia 5000 existentes
    if (parsed.nivel1 === '5000' && parsed.nivel3 === '000' && parsed.nivel4 === '000' && 
        ['2000', '3000', '4000', '5000', '8000', '9000'].includes(parsed.nivel2)) {
      return { level: 2, confidence: 1.0 }; // Padre específico de familia
    }
    
    // NUEVO: Detección de cuentas que pertenecen a familias específicas
    if (parsed.nivel1 === '5000' && parsed.nivel3 === '000' && parsed.nivel4 === '000') {
      const familyNumber = parsed.nivel2.substring(0, 1);
      if (['2', '3', '4', '5', '8', '9'].includes(familyNumber)) {
        // Si es exactamente 2000, 3000, etc. es Level 2 (padre)
        if (parsed.nivel2 === '2000' || parsed.nivel2 === '3000' || parsed.nivel2 === '4000' || 
            parsed.nivel2 === '5000' || parsed.nivel2 === '8000' || parsed.nivel2 === '9000') {
          return { level: 2, confidence: 1.0 }; // Padre específico de familia
        } else {
          // Si es 2001, 2002, etc. es Level 3 (sub-familia)
          return { level: 3, confidence: 0.9 }; // Sub-familia
        }
      }
    }
    
    // NUEVO: Detección de secuencias numéricas para jerarquías entre familias
    if (parsed.nivel3 === '000' && parsed.nivel4 === '000' && parsed.nivel2 !== '0000') {
      const sequenceAnalysis = this.analyzeNumericSequence(codigo, familyAccounts);
      if (sequenceAnalysis.isParent) {
        return { level: 2, confidence: 0.9 }; // Padre por secuencia
      }
    }
    
    // Nivel 3: Sub-categorías (XXX-YYYY-ZZZ-000)
    if (parsed.nivel4 === '000' && parsed.nivel3 !== '000') {
      return { level: 3, confidence: 0.8 }; // Sub-categoría
    }
    
    // Nivel 4: Cuentas detalle (XXX-YYYY-ZZZ-WWW)
    return { level: 4, confidence: 0.7 }; // Cuenta detalle
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
    
    if (relatedFamilies.size < 2) {
      return { isParent: false, isChild: false, parentCode: null, confidence: 0 };
    }
    
    // Convertir a números y ordenar
    const familyNumbers = Array.from(relatedFamilies)
      .map(f => parseInt(f))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);
    
    if (familyNumbers.length < 2) {
      return { isParent: false, isChild: false, parentCode: null, confidence: 0 };
    }
    
    // Detectar si forman una secuencia consecutiva
    const currentNumber = parseInt(secondSegment);
    const isConsecutive = this.isConsecutiveSequence(familyNumbers);
    
    if (!isConsecutive) {
      return { isParent: false, isChild: false, parentCode: null, confidence: 0 };
    }
    
    // Determinar si es padre o hijo
    const minNumber = Math.min(...familyNumbers);
    const maxNumber = Math.max(...familyNumbers);
    
    // Regla: El número base (menor) es el padre
    if (currentNumber === minNumber) {
      return { 
        isParent: true, 
        isChild: false, 
        parentCode: null, 
        confidence: 0.9 
      };
    } else if (currentNumber > minNumber && currentNumber <= maxNumber) {
      // Buscar el padre (número base)
      const parentCode = `${firstSegment}-${minNumber.toString().padStart(4, '0')}-000-000`;
      return { 
        isParent: false, 
        isChild: true, 
        parentCode: parentCode, 
        confidence: 0.85 
      };
    }
    
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
    // Protección contra undefined o null
    if (!codigo) {
      console.warn('analyzeByZeroPattern: código undefined o null');
      return { level: 4, confidence: 0.5 }; // Default seguro
    }
    
    // Validar formato del código antes de dividirlo
    if (!codigo.includes('-')) {
      console.warn(`analyzeByZeroPattern: formato de código inválido: ${codigo}`);
      return { level: 4, confidence: 0.5 }; // Default seguro
    }
    
    const parts = codigo.split('-');
    
    // Validar que hay suficientes partes
    if (parts.length !== 4) {
      console.warn(`analyzeByZeroPattern: código no tiene 4 partes: ${codigo}, tiene ${parts.length}`);
      return { level: 4, confidence: 0.5 }; // Default seguro
    }
    
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
        
        if (allAccounts.has(expectedParentL3)) {
          return {
            parent: expectedParentL3,
            parentType: 'DIRECT',
            warnings
          };
        }
        
        // PASO 2: Si no existe padre L3, buscar padre L2 específico de familia 5000 existente
        if (parsed.nivel1 === '5000') {
          const familyNumber = parsed.nivel2.substring(0, 1); // Get first digit of nivel2
          let specificParentL2 = null;
          
          // Mapeo específico para familia 5000 usando cuentas existentes
          // SOLO mapear si el segundo segmento empieza con 2, 3, 4, 5, 8, 9
          if (familyNumber === '2') {
            specificParentL2 = '5000-2000-000-000'; // Mano de Obra
          } else if (familyNumber === '3') {
            specificParentL2 = '5000-3000-000-000'; // Gastos Indirectos
          } else if (familyNumber === '4') {
            specificParentL2 = '5000-4000-000-000'; // Gastos de Operación
          } else if (familyNumber === '5') {
            specificParentL2 = '5000-5000-000-000'; // Gastos de Operación
          } else if (familyNumber === '8') {
            specificParentL2 = '5000-8000-000-000'; // Gastos Financieros
          } else if (familyNumber === '9') {
            specificParentL2 = '5000-9000-000-000'; // Otros Gastos
          }
          // NO mapear 5000-1xxx a 5000-2000-000-000 - esto es incorrecto
          
          if (specificParentL2 && allAccounts.has(specificParentL2)) {
            warnings.push(`Padre L3 ${expectedParentL3} no existe, asignado a padre L2 específico ${specificParentL2}`);
            return {
              parent: specificParentL2,
              parentType: 'FAMILY_ROOT',
              warnings
            };
          }
        }
        
        // PASO 3: If not specific L2, try general L2 (family)
        const expectedParentL2 = `${parsed.family}-000-000`;
        
        if (allAccounts.has(expectedParentL2)) {
          warnings.push(`Padre L3 ${expectedParentL3} no existe, asignado a padre L2 ${expectedParentL2}`);
          return {
            parent: expectedParentL2,
            parentType: 'FAMILY_ROOT',
            warnings
          };
        }
        
        // PASO 4: Si no existe padre L2, buscar padre L1 (cuenta principal)
        const parentL1ForL4 = `${parsed.nivel1}-0000-000-000`;
        
        if (allAccounts.has(parentL1ForL4)) {
          warnings.push(`Padres intermedios no existen, asignado a cuenta principal ${parentL1ForL4}`);
          return {
            parent: parentL1ForL4,
            parentType: 'ORPHAN_ADOPTION',
            warnings
          };
        }
        
        // PASO 5: Si no existe padre L1, será raíz
        warnings.push(`Cuenta huérfana: no se encontraron padres en ningún nivel`);
        return {
          parent: null,
          parentType: 'ROOT',
          warnings
        };
        
      case 3: // Sub-categoría
        
        // ESPECIAL: Caso específico para cuentas 5000-1000-00X-000 (como 5000-1000-002-000, 5000-1000-003-000)
        if (parsed.nivel1 === '5000' && parsed.nivel2 === '1000' && parsed.nivel4 === '000' && parsed.nivel3 !== '000') {
          const parentL3 = '5000-1000-000-000'; // Padre común para toda la familia 1000
          
          if (allAccounts.has(parentL3)) {
            warnings.push(`Cuenta especial 5000-1000 asignada a padre L3: ${parentL3}`);
            return {
              parent: parentL3,
              parentType: 'FAMILY_ROOT',
              warnings
            };
          } else {
            // Si no existe el padre 5000-1000-000-000, buscar el padre principal 5000-0000-000-000
            const mainParent = '5000-0000-000-000';
            if (allAccounts.has(mainParent)) {
              warnings.push(`Cuenta especial 5000-1000 asignada al padre principal: ${mainParent}`);
              return {
                parent: mainParent,
                parentType: 'FAMILY_ROOT',
                warnings
              };
            }
          }
        }
        
        // NUEVO: Para cuentas 5000, buscar padre específico de familia
        if (parsed.nivel1 === '5000' && parsed.nivel3 === '000' && parsed.nivel4 === '000') {
          const familyNumber = parsed.nivel2.substring(0, 1);
          let specificParentL2 = null;
          
          // Mapeo específico para familia 5000 usando cuentas existentes
          if (familyNumber === '1') {
            specificParentL2 = '5000-1000-000-000'; // Costos de Producción familia 1000
          } else if (familyNumber === '2') {
            specificParentL2 = '5000-2000-000-000'; // Gastos de Administración
          } else if (familyNumber === '3') {
            specificParentL2 = '5000-3000-000-000'; // Gastos Indirectos
          } else if (familyNumber === '4') {
            specificParentL2 = '5000-4000-000-000'; // Gastos de Operación
          } else if (familyNumber === '5') {
            specificParentL2 = '5000-5000-000-000'; // Gastos de Operación
          } else if (familyNumber === '8') {
            specificParentL2 = '5000-8000-000-000'; // Gastos Financieros
          } else if (familyNumber === '9') {
            specificParentL2 = '5000-9000-000-000'; // Otros Gastos
          }
          
          if (specificParentL2 && allAccounts.has(specificParentL2)) {
            warnings.push(`Sub-familia ${codigo} asignada a padre L2 específico ${specificParentL2}`);
            return {
              parent: specificParentL2,
              parentType: 'FAMILY_ROOT',
              warnings
            };
          }
        }
        
        const familyRootL3 = `${parsed.family}-000-000`;
        
        if (allAccounts.has(familyRootL3)) {
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
          warnings.push(`Agrupado con otro Level 3 en familia: ${otherLevel3InFamily}`);
          return {
            parent: otherLevel3InFamily,
            parentType: 'DIRECT',
            warnings
          };
        }
        
        // NUEVO: Si no existe la raíz de familia, buscar padre de nivel 1
        const parentL1ForL3 = `${parsed.nivel1}-0000-000-000`;
        
        if (allAccounts.has(parentL1ForL3)) {
          warnings.push(`Padre de familia ${parsed.family} no existe, asignado a cuenta principal ${parentL1ForL3}`);
          return {
            parent: parentL1ForL3,
            parentType: 'ORPHAN_ADOPTION',
            warnings
          };
        }
        
        warnings.push(`Familia ${parsed.family} sin cuenta raíz ni cuenta principal`);
        return {
          parent: null,
          parentType: 'ROOT',
          warnings
        };
        
      case 2: // Cuenta raíz de familia
        // NUEVO: Verificar si es parte de una secuencia numérica
        const sequenceAnalysis = this.analyzeNumericSequence(codigo, allAccounts);
        
        if (sequenceAnalysis.isChild && sequenceAnalysis.parentCode && allAccounts.has(sequenceAnalysis.parentCode)) {
          warnings.push(`Secuencia numérica detectada: ${codigo} es hijo de ${sequenceAnalysis.parentCode}`);
          return {
            parent: sequenceAnalysis.parentCode,
            parentType: 'DIRECT',
            warnings
          };
        }
        
        // Lógica original para cuentas raíz de familia
        const parentL1ForL2 = `${parsed.nivel1}-0000-000-000`;
        
        if (allAccounts.has(parentL1ForL2)) {
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
          warnings.push(`Agrupado con otro Level 2 en familia: ${otherLevel2InFamily}`);
          return {
            parent: otherLevel2InFamily,
            parentType: 'DIRECT',
            warnings
          };
        }
        
        warnings.push(`Sin padre, será raíz`);
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