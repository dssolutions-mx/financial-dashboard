"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  getCategoria1ForTipo,
  getSubCategoriasForCategoria1,
  getClasificacionesForSubCategoria,
  getClassificationByCode,
} from "@/lib/services/classification-service-client"

interface ReclassificationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (newClassification: any) => void
  accountCode: string
  accountName: string
}

export function ReclassificationModal({
  isOpen,
  onClose,
  onSave,
  accountCode,
  accountName,
}: ReclassificationModalProps) {
  const [tipo, setTipo] = useState("")
  const [categoria1, setCategoria1] = useState("")
  const [subCategoria, setSubCategoria] = useState("")
  const [clasificacion, setClasificacion] = useState("")
  const [categorias1, setCategorias1] = useState<string[]>([])
  const [subCategorias, setSubCategorias] = useState<string[]>([])
  const [clasificaciones, setClasificaciones] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Función para cargar opciones iniciales cuando se conoce el tipo
  const loadInitialOptions = async (tipoValue: string) => {
    try {
      // Cargar las opciones básicas de tipos (Ingresos/Egresos)
      if (!tipoValue) return

      console.log("Cargando opciones para tipo:", tipoValue)
      
      // Paso 1: Cargar categorías para el tipo seleccionado
      const categoriasOptions = await getCategoria1ForTipo(tipoValue)
      console.log("Categorías disponibles:", categoriasOptions)
      setCategorias1(categoriasOptions)

      if (categoria1) {
        // Paso 2: Si ya hay una categoría seleccionada, cargar subcategorías
        const subCategoriasOptions = await getSubCategoriasForCategoria1(tipoValue, categoria1)
        console.log("Subcategorías disponibles:", subCategoriasOptions)
        setSubCategorias(subCategoriasOptions)

        // Paso 3: Si hay una subcategoría, cargar clasificaciones
        if (subCategoria) {
          const clasificacionesOptions = await getClasificacionesForSubCategoria(tipoValue, categoria1, subCategoria)
          console.log("Clasificaciones disponibles:", clasificacionesOptions)
          setClasificaciones(clasificacionesOptions)
        }
      }
    } catch (error) {
      console.error("Error cargando opciones iniciales:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las opciones de clasificación",
        variant: "destructive",
      })
    }
  }

  // Efecto para cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && accountCode) {
      setIsLoading(true)
      
      // Reiniciar estados
      setCategorias1([])
      setSubCategorias([])
      setClasificaciones([])
      
      // Obtener clasificación actual
      getClassificationByCode(accountCode)
        .then(async (classification) => {
          if (classification) {
            console.log("Clasificación obtenida:", classification)
            
            // CORRECCIÓN: Mapeo correcto de campos para clasificaciones existentes
            // Los datos ya están clasificados correctamente como mencionó el usuario
            
            // El mapeo REAL es:
            // tipo -> Ingresos/Egresos (no viene en el objeto classification)
            // categoria1 -> category_ingresos
            // subCategoria -> clasificacion_gerencia (confuso, pero así está estructurado)
            // clasificacion -> sub_clasificacion_gerencia (nivel más detallado)
            
            // NOTA: sub_sub_clasificacion_gerencia se usa como respaldo si existe
            
            // Para determinar el tipo correctamente:
            let tipoReal = ""
            if (accountCode.startsWith('4')) {
                tipoReal = "Ingresos"
            } else if (accountCode.startsWith('5')) {
                tipoReal = "Egresos"
            } else {
                tipoReal = "Ingresos" // Valor por defecto si no podemos determinar
            }
            
            console.log("CAMPOS DE CLASIFICACIÓN (ORIGINAL):", {
              accountCode,
              categoria_ingresos: classification.categoria_ingresos,
              clasificacion_gerencia: classification.clasificacion_gerencia,
              sub_clasificacion_gerencia: classification.sub_clasificacion_gerencia,
              sub_sub_clasificacion_gerencia: classification.sub_sub_clasificacion_gerencia
            })
            
            // Mapeo correcto de los campos
            const newTipo = tipoReal
            const newCategoria1 = classification.categoria_ingresos || ""
            const newSubCategoria = classification.clasificacion_gerencia || ""
            const newClasificacion = classification.sub_clasificacion_gerencia || classification.sub_sub_clasificacion_gerencia || ""
            
            console.log("VALORES ESTABLECIDOS:", {
              newTipo,
              newCategoria1,
              newSubCategoria,
              newClasificacion
            })
            
            // Actualizar estados en orden
            setTipo(newTipo)
            setCategoria1(newCategoria1)
            setSubCategoria(newSubCategoria)
            setClasificacion(newClasificacion)
            
            // Cargar opciones para los selectores
            if (newTipo) {
              // Obtener categorías
              const cats = await getCategoria1ForTipo(newTipo)
              setCategorias1(cats)
              
              if (newCategoria1) {
                // Obtener subcategorías
                const subcats = await getSubCategoriasForCategoria1(newTipo, newCategoria1)
                setSubCategorias(subcats)
                
                if (newSubCategoria) {
                  // Obtener clasificaciones
                  const clasifs = await getClasificacionesForSubCategoria(
                    newTipo, 
                    newCategoria1, 
                    newSubCategoria
                  )
                  setClasificaciones(clasifs)
                }
              }
            } else {
              // Si no hay tipo, cargar al menos las opciones básicas (Ingresos/Egresos)
              setCategorias1(['Sin Categoría'])
              setSubCategorias(['Sin Subcategoría'])
              setClasificaciones(['Sin Clasificación'])
            }
          } else {
            console.log("No se encontró clasificación para el código:", accountCode)
            
            // Como mencionó el usuario, este modal solo trabaja con datos ya clasificados
            // Por lo tanto, simplemente mostramos un mensaje de error
            toast({
              title: "Error",
              description: "No se encontró clasificación existente para esta cuenta. No se puede reclasificar.",
              variant: "destructive",
            })
            
            // Establecer valores vacíos
            setTipo("")
            setCategoria1("")
            setSubCategoria("")
            setClasificacion("")
            setCategorias1([])
            setSubCategorias([])
            setClasificaciones([])
          }
        })
        .catch(err => {
          console.error("Error al obtener clasificación:", err)
          toast({
            title: "Error",
            description: "No se pudo cargar la clasificación actual",
            variant: "destructive",
          })
          // Valores por defecto
          setTipo("")
          setCategoria1("")
          setSubCategoria("")
          setClasificacion("")
          setCategorias1(['Sin Categoría'])
          setSubCategorias(['Sin Subcategoría'])
          setClasificaciones(['Sin Clasificación'])
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [isOpen, accountCode, toast])

  // Efecto cuando cambia el tipo - debería cargar inmediatamente las categorías
  useEffect(() => {
    if (tipo) {
      console.log(`Cargando categorías para tipo: "${tipo}"`)
      setIsLoading(true)
      
      // Validar que el tipo sea válido (Ingresos/Egresos)
      if (tipo !== "Ingresos" && tipo !== "Egresos") {
        console.error(`Tipo inválido: "${tipo}". Debe ser "Ingresos" o "Egresos"`)
        toast({
          title: "Error",
          description: `El tipo "${tipo}" no es válido. Use "Ingresos" o "Egresos".`,
          variant: "destructive",
        })
        
        // Reiniciar a un tipo válido por defecto
        if (accountCode.startsWith('4')) {
          setTipo("Ingresos")
        } else if (accountCode.startsWith('5')) {
          setTipo("Egresos")
        } else {
          setTipo("Ingresos") // Valor por defecto
        }
        
        setIsLoading(false)
        return
      }
      
      // Si el tipo es válido, cargar las categorías
      getCategoria1ForTipo(tipo)
        .then(options => {
          console.log(`Categorías obtenidas para ${tipo}:`, options)
          setCategorias1(options)
          
          // Si la categoría actual no está en las opciones o está vacía, reiniciarla
          if (categoria1 && !options.includes(categoria1)) {
            console.log(`La categoría "${categoria1}" no está en las opciones disponibles, reiniciando valores`)
            setCategoria1("")
            setSubCategoria("")
            setClasificacion("")
          }
        })
        .catch(err => {
          console.error(`Error cargando categorías para ${tipo}:`, err)
          setCategorias1(['Sin Categoría'])
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      console.log("No se ha seleccionado un tipo, reiniciando valores")
      setCategorias1([])
      setSubCategorias([])
      setClasificaciones([])
      setCategoria1("")
      setSubCategoria("")
      setClasificacion("")
    }
  }, [tipo, accountCode])

  // Efecto cuando cambia la categoría
  useEffect(() => {
    if (tipo && categoria1) {
      getSubCategoriasForCategoria1(tipo, categoria1)
        .then(options => {
          console.log(`Subcategorías para ${tipo}/${categoria1}:`, options)
          setSubCategorias(options)
          
          // Si la subcategoría actual no está en las opciones, reiniciarla
          if (subCategoria && !options.includes(subCategoria)) {
            setSubCategoria("")
            setClasificacion("")
          }
        })
        .catch(err => {
          console.error(`Error cargando subcategorías para ${tipo}/${categoria1}:`, err)
          setSubCategorias(['Sin Subcategoría'])
        })
    } else {
      setSubCategorias([])
      setClasificaciones([])
    }
  }, [tipo, categoria1, subCategoria])

  // Efecto cuando cambia la subcategoría
  useEffect(() => {
    if (tipo && categoria1 && subCategoria) {
      getClasificacionesForSubCategoria(tipo, categoria1, subCategoria)
        .then(options => {
          console.log(`Clasificaciones para ${tipo}/${categoria1}/${subCategoria}:`, options)
          setClasificaciones(options)
          
          // Si la clasificación actual no está en las opciones, reiniciarla
          if (clasificacion && !options.includes(clasificacion)) {
            setClasificacion("")
          }
        })
        .catch(err => {
          console.error(`Error cargando clasificaciones para ${tipo}/${categoria1}/${subCategoria}:`, err)
          setClasificaciones(['Sin Clasificación'])
        })
    } else {
      setClasificaciones([])
    }
  }, [tipo, categoria1, subCategoria, clasificacion])

  const handleSave = () => {
    // Validar que tengamos todos los campos requeridos
    const validationErrors = []
    
    if (!tipo) validationErrors.push("Tipo")
    if (!categoria1) validationErrors.push("Categoría") 
    if (!subCategoria) validationErrors.push("Subcategoría")
    if (!clasificacion) validationErrors.push("Clasificación")
    
    if (validationErrors.length > 0) {
      const errorFields = validationErrors.join(", ")
      toast({
        title: "Campos incompletos",
        description: `Por favor, seleccione un valor para: ${errorFields}`,
        variant: "destructive",
      })
      return
    }

    // Si todo está correcto, guardar los cambios
    console.log("Guardando clasificación:", {
      tipo,
      categoria1,
      subCategoria,
      clasificacion
    })
    
    onSave({
      tipo,
      management_category: categoria1,
      classification: subCategoria,
      sub_classification: clasificacion,
    })
  }

  // Para depuración
  console.log("Estado actual del modal:", {
    tipo,
    categoria1,
    subCategoria,
    clasificacion,
    "opciones_categoria1": categorias1,
    "opciones_subcategoria": subCategorias, 
    "opciones_clasificacion": clasificaciones
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-bold text-primary">Reclasificar Cuenta</DialogTitle>
          <DialogDescription className="text-gray-600">
            Reclasificando <span className="font-medium">{accountName}</span> ({accountCode})
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando datos de clasificación...</p>
          </div>
        ) : (
          <div className="grid gap-6 py-6">
            {/* Tipo selector */}
            <div className="grid grid-cols-1 items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <Select 
                value={tipo} 
                onValueChange={(value) => {
                  console.log("Cambiando tipo a:", value)
                  setTipo(value)
                  // Reiniciar valores dependientes
                  setCategoria1("")
                  setSubCategoria("")
                  setClasificacion("")
                }}
              >
                <SelectTrigger className="w-full rounded-md border-gray-300 focus:border-primary">
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ingresos">Ingresos</SelectItem>
                  <SelectItem value="Egresos">Egresos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categoría selector */}
            <div className="grid grid-cols-1 items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Categoría</label>
              <Select 
                value={categoria1} 
                onValueChange={(value) => {
                  console.log("Cambiando categoría a:", value)
                  setCategoria1(value)
                  // Reiniciar valores dependientes
                  setSubCategoria("")
                  setClasificacion("")
                }}
                disabled={!tipo || categorias1.length <= 1}
              >
                <SelectTrigger className="w-full rounded-md border-gray-300 focus:border-primary">
                  <SelectValue placeholder="Seleccione categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias1.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!tipo && (
                <p className="text-xs text-red-500">Seleccione un tipo primero</p>
              )}
              {tipo && categorias1.length <= 1 && (
                <p className="text-xs text-amber-500">No hay categorías disponibles para este tipo</p>
              )}
            </div>

            {/* Subcategoría selector */}
            <div className="grid grid-cols-1 items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Subcategoría</label>
              <Select 
                value={subCategoria} 
                onValueChange={(value) => {
                  console.log("Cambiando subcategoría a:", value)
                  setSubCategoria(value)
                  // Reiniciar valores dependientes
                  setClasificacion("")
                }}
                disabled={!categoria1 || subCategorias.length <= 1}
              >
                <SelectTrigger className="w-full rounded-md border-gray-300 focus:border-primary">
                  <SelectValue placeholder="Seleccione subcategoría" />
                </SelectTrigger>
                <SelectContent>
                  {subCategorias.map((subcat) => (
                    <SelectItem key={subcat} value={subcat}>
                      {subcat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!categoria1 && (
                <p className="text-xs text-red-500">Seleccione una categoría primero</p>
              )}
              {categoria1 && subCategorias.length <= 1 && (
                <p className="text-xs text-amber-500">No hay subcategorías disponibles para esta categoría</p>
              )}
            </div>

            {/* Clasificación selector */}
            <div className="grid grid-cols-1 items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Clasificación</label>
              <Select 
                value={clasificacion} 
                onValueChange={(value) => {
                  console.log("Cambiando clasificación a:", value)
                  setClasificacion(value)
                }}
                disabled={!subCategoria || clasificaciones.length <= 1}
              >
                <SelectTrigger className="w-full rounded-md border-gray-300 focus:border-primary">
                  <SelectValue placeholder="Seleccione clasificación" />
                </SelectTrigger>
                <SelectContent>
                  {clasificaciones.map((clasif) => (
                    <SelectItem key={clasif} value={clasif}>
                      {clasif}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!subCategoria && (
                <p className="text-xs text-red-500">Seleccione una subcategoría primero</p>
              )}
              {subCategoria && clasificaciones.length <= 1 && (
                <p className="text-xs text-amber-500">No hay clasificaciones disponibles para esta subcategoría</p>
              )}
            </div>
        </div>
        )}
        <DialogFooter className="flex justify-end gap-2 border-t pt-4">
          <Button onClick={onClose} variant="outline" className="hover:bg-gray-100">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-primary hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? "Procesando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
