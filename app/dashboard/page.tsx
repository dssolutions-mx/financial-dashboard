"use client"

import React, { useState } from "react"
import FinancialDashboard from "@/components/financial/financial-dashboard"
import FamilyBasedClassificationDashboard from "@/components/classification/FamilyBasedClassificationDashboard"
import ClassificationRulesManager from "@/components/classification/ClassificationRulesManager"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DebugDataRow } from "@/lib/services/excel-processor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Database, BarChart3, Settings2 } from "lucide-react"

export default function DashboardPage() {
  const [data, setData] = useState<DebugDataRow[]>([])
  const [activeTab, setActiveTab] = useState("financial")
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)

  const handleDataUpdate = (newData: DebugDataRow[]) => {
    setData(newData)
  }

  const handleReportIdChange = (reportId: string | null) => {
    setSelectedReportId(reportId)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Dashboard Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Sistema de Gestión Financiera
            </CardTitle>
            <CardDescription>
              Análisis financiero integral con clasificación inteligente familia por familia
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Enhanced Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Dashboard Financiero
              <Badge variant="secondary" className="ml-2">Tradicional</Badge>
            </TabsTrigger>
            <TabsTrigger value="classification" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Clasificación Inteligente
              <Badge variant="default" className="ml-2 bg-blue-600">Avanzado</Badge>
            </TabsTrigger>
          </TabsList>
          
          {/* Financial Dashboard Tab */}
          <TabsContent value="financial" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Dashboard Financiero Tradicional
                </CardTitle>
                <CardDescription>
                  Análisis por plantas, categorías y volúmenes con gestión de ventas en efectivo
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <FinancialDashboard 
                  initialData={data} 
                  onDataUpdate={handleDataUpdate}
                  onReportIdChange={handleReportIdChange}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Enhanced Classification Tab */}
          <TabsContent value="classification" className="mt-6">
            <Tabs defaultValue="dashboard" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dashboard">Dashboard de Análisis</TabsTrigger>
                <TabsTrigger value="rules">Gestión de Reglas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="dashboard" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings2 className="h-5 w-5" />
                      Sistema de Clasificación Inteligente
                    </CardTitle>
                    <CardDescription>
                      Validación familia por familia con detección automática de problemas y sugerencias inteligentes
                    </CardDescription>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        🔍 Detección de Sobre-clasificación
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        👥 Análisis de Hermanos Mixtos
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        🎯 Sugerencias Contextuales
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <FamilyBasedClassificationDashboard reportId={selectedReportId || undefined} />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="rules" className="mt-6">
                <ClassificationRulesManager />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Quick Stats Bar */}
        {data.length > 0 && (
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{data.length}</div>
                  <div className="text-xs text-gray-500">Registros Cargados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {data.filter(row => row.Tipo === 'Ingresos').length}
                  </div>
                  <div className="text-xs text-gray-500">Ingresos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {data.filter(row => row.Tipo === 'Egresos').length}
                  </div>
                  <div className="text-xs text-gray-500">Egresos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {data.filter(row => row.Clasificacion === 'Sin Clasificación' || !row.Clasificacion).length}
                  </div>
                  <div className="text-xs text-gray-500">Sin Clasificar</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700">
                  {activeTab === 'financial' ? 'Vista Tradicional' : 'Análisis Inteligente'}
                </div>
                <div className="text-xs text-gray-500">
                  {activeTab === 'financial' 
                    ? 'Cambiar a clasificación inteligente para análisis avanzado' 
                    : 'Validación familia por familia activa'
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
} 