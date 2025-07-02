// Definición de la estructura jerárquica para clasificación de datos financieros

export interface ClassificationNode {
  value: string
  label: string
  children?: ClassificationNode[]
}

export interface ClassificationHierarchy {
  [tipo: string]: {
    [subCategoria: string]: {
      [clasificacion: string]: string[]
    }
  }
}

// Estructura jerárquica completa para la clasificación
// Esta estructura coincide EXACTAMENTE con los datos del dashboard y excel-processor.ts
// Formato: Tipo -> Sub categoria -> Clasificacion -> [Categoria 1]
export const CLASSIFICATION_HIERARCHY: ClassificationHierarchy = {
  "Ingresos": {
    "Ventas": {
      "Ventas Concreto": [
        "Ventas Concreto"
      ],
      "Ventas": [
        "Ventas Productos Alternativos"
      ]
    },
    "Ventas Bombeo": {
      "Ventas Bombeo": [
        "Ventas Bombeo"
      ]
    },
    "Otros": {
      "Otros": [
        "Otros Ingresos",
        "Ingresos Financieros"
      ]
    }
  },
  "Egresos": {
    "Costo Materias Primas": {
      "Materia prima": [
        "Cemento",
        "Agregado Grueso", 
        "Agregado Fino",
        "Aditivos",
        "Agua",
        "Adiciones especiales"
      ]
    },
    "Costo operativo": {
      "Costo transporte concreto": [
        "Diesel CR",
        "Servicios",
        "Mantenimiento Preventivo CR",
        "Otros gastos CR",
        "Mantenimiento Correctivo CR",
        "Costo servicio de bomba",
        "Fletes"
      ],
      "Costo Fijo": [
        "Nómina Producción",
        "Nómina Operadores CR",
        "Nómina Administrativos",
        "Mantenimiento Producción",
        "Rentas Equipos",
        "Rentas Inmuebles",
        "Otros gastos Producción",
        "Otros gastos Administrativos"
      ]
    }
  }
}

// Función para obtener las subcategorías disponibles según el tipo
export function getSubCategoriasForTipo(tipo: string): string[] {
  const hierarchy = CLASSIFICATION_HIERARCHY[tipo]
  if (!hierarchy) return ["Sin Subcategoría"]
  
  return ["Sin Subcategoría", ...Object.keys(hierarchy)]
}

// Función para obtener las clasificaciones disponibles según tipo y subcategoría
export function getClasificacionesForSubCategoria(tipo: string, subCategoria: string): string[] {
  const hierarchy = CLASSIFICATION_HIERARCHY[tipo]
  if (!hierarchy || !hierarchy[subCategoria]) return ["Sin Clasificación"]
  
  return ["Sin Clasificación", ...Object.keys(hierarchy[subCategoria])]
}

// Función para obtener las categorías 1 disponibles según tipo, subcategoría y clasificación
export function getCategoria1ForClasificacion(tipo: string, subCategoria: string, clasificacion: string): string[] {
  const hierarchy = CLASSIFICATION_HIERARCHY[tipo]
  if (!hierarchy || !hierarchy[subCategoria] || !hierarchy[subCategoria][clasificacion]) {
    return ["Sin Categoría"]
  }
  
  return ["Sin Categoría", ...hierarchy[subCategoria][clasificacion]]
}

// Función para validar si una combinación es válida
export function isValidClassification(
  tipo: string, 
  subCategoria: string, 
  clasificacion: string, 
  categoria1: string
): boolean {
  const availableCategoria1 = getCategoria1ForClasificacion(tipo, subCategoria, clasificacion)
  return availableCategoria1.includes(categoria1)
}

// Función para sugerir una clasificación automática basada en palabras clave
export function suggestClassification(concepto: string, codigo: string): {
  tipo?: string
  subCategoria?: string
  clasificacion?: string
  categoria1?: string
} {
  const conceptoLower = concepto.toLowerCase()
  const codigoPrefix = codigo.substring(0, 4)
  
  // Determinar tipo basado en código
  let tipo = ""
  if (codigoPrefix === "4100") {
    tipo = "Ingresos"
  } else if (codigoPrefix === "5000") {
    tipo = "Egresos"
  }
  
  if (!tipo) return {}
  
  // Sugerencias específicas basadas en palabras clave
  const suggestions: any = {}
  suggestions.tipo = tipo
  
  if (tipo === "Ingresos") {
    if (conceptoLower.includes("concreto") && !conceptoLower.includes("bombeo")) {
      suggestions.subCategoria = "Ventas"
      suggestions.clasificacion = "Ventas"
      suggestions.categoria1 = "Ventas Concreto"
    } else if (conceptoLower.includes("bombeo")) {
      suggestions.subCategoria = "Ventas Bombeo"
      suggestions.clasificacion = "Ventas Bombeo"
      suggestions.categoria1 = "Ventas Bombeo"
    } else if (conceptoLower.includes("fibra") || conceptoLower.includes("agregado") || conceptoLower.includes("vacio")) {
      suggestions.subCategoria = "Ventas"
      suggestions.clasificacion = "Ventas"
      suggestions.categoria1 = "Ventas Productos Alternativos"
    } else if (conceptoLower.includes("interes") || conceptoLower.includes("financier") || conceptoLower.includes("cambiar")) {
      suggestions.subCategoria = "Otros"
      suggestions.clasificacion = "Otros"
      suggestions.categoria1 = "Ingresos Financieros"
    } else if (conceptoLower.includes("arrendamiento") || conceptoLower.includes("mano de obra")) {
      suggestions.subCategoria = "Otros"
      suggestions.clasificacion = "Otros"
      suggestions.categoria1 = "Otros Ingresos"
    }
  } else if (tipo === "Egresos") {
    if (conceptoLower.includes("cemento")) {
      suggestions.subCategoria = "Costo Materias Primas"
      suggestions.clasificacion = "Materia prima"
      suggestions.categoria1 = "Cemento"
    } else if (conceptoLower.includes("agregado grueso") || conceptoLower.includes("grava")) {
      suggestions.subCategoria = "Costo Materias Primas"
      suggestions.clasificacion = "Materia prima"
      suggestions.categoria1 = "Agregado Grueso"
    } else if (conceptoLower.includes("agregado fino") || conceptoLower.includes("arena")) {
      suggestions.subCategoria = "Costo Materias Primas"
      suggestions.clasificacion = "Materia prima"
      suggestions.categoria1 = "Agregado Fino"
    } else if (conceptoLower.includes("aditivo")) {
      suggestions.subCategoria = "Costo Materias Primas"
      suggestions.clasificacion = "Materia prima"
      suggestions.categoria1 = "Aditivos"
    } else if (conceptoLower.includes("agua")) {
      suggestions.subCategoria = "Costo Materias Primas"
      suggestions.clasificacion = "Materia prima"
      suggestions.categoria1 = "Agua"
    } else if (conceptoLower.includes("diesel") || conceptoLower.includes("combustible")) {
      suggestions.subCategoria = "Costo operativo"
      suggestions.clasificacion = "Costo transporte concreto"
      suggestions.categoria1 = "Diesel CR"
    } else if (conceptoLower.includes("flete") || conceptoLower.includes("transporte")) {
      suggestions.subCategoria = "Costo operativo"
      suggestions.clasificacion = "Costo transporte concreto"
      suggestions.categoria1 = "Fletes"
    } else if (conceptoLower.includes("nomina") && conceptoLower.includes("produccion")) {
      suggestions.subCategoria = "Costo operativo"
      suggestions.clasificacion = "Costo Fijo"
      suggestions.categoria1 = "Nómina Producción"
    } else if (conceptoLower.includes("nomina") && (conceptoLower.includes("admin") || conceptoLower.includes("gerenc"))) {
      suggestions.subCategoria = "Costo operativo"
      suggestions.clasificacion = "Costo Fijo"
      suggestions.categoria1 = "Nómina Administrativos"
    }
  }
  
  return suggestions
} 