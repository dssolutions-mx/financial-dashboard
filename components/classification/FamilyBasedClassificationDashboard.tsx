'use client';

// Enhanced Dynamic Classification System - Phase 3.1
// Family-Based Classification Dashboard

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, DollarSign } from 'lucide-react';
import { SophisticatedBottomUpValidator, FamilyValidationResult, ClassificationIssue } from '@/lib/services/sophisticated-bottom-up-validator.service';

interface AlertsSummary {
  OVER_CLASSIFICATION: number;
  MIXED_LEVEL4_SIBLINGS: number;
  MIXED_LEVEL3_SIBLINGS: number;
  UNDER_CLASSIFICATION: number;
  total_impact: number;
  over_classification_impact: number;
  mixed_siblings_impact: number;
}

interface FamilyDetailedAnalysisProps {
  family: FamilyValidationResult;
  onClose: () => void;
  onApplyFix: (family: FamilyValidationResult, action: string) => Promise<void>;
}

const FamilyDetailedAnalysis: React.FC<FamilyDetailedAnalysisProps> = ({ 
  family, 
  onClose, 
  onApplyFix 
}) => {
  const [isApplyingFix, setIsApplyingFix] = useState(false);

  const handleApplyFix = async (action: string) => {
    setIsApplyingFix(true);
    try {
      await onApplyFix(family, action);
    } finally {
      setIsApplyingFix(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">
                Family Analysis: {family.family_code}
              </h2>
              <p className="text-gray-600">{family.family_name}</p>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>

          {/* Family Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{formatCurrency(family.total_amount)}</div>
                <p className="text-sm text-gray-600">Total Family Amount</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{family.issues.length}</div>
                <p className="text-sm text-gray-600">Active Issues</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(family.financial_impact)}
                </div>
                <p className="text-sm text-gray-600">Financial Impact</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {family.optimal_approach.current_completeness.toFixed(1)}%
                </div>
                <p className="text-sm text-gray-600">Completion Rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Optimal Approach Recommendation */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recommended Approach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Badge variant="outline" className="mb-2">
                    {family.optimal_approach.recommended_approach.replace('_', ' ')}
                  </Badge>
                  <p className="text-gray-700">{family.optimal_approach.reasoning}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Specific Actions:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {family.optimal_approach.specific_actions.map((action, index) => (
                      <li key={index} className="text-gray-600">{action}</li>
                    ))}
                  </ul>
                </div>

                {family.optimal_approach.business_benefits && (
                  <div>
                    <h4 className="font-semibold mb-2">Business Benefits:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {family.optimal_approach.business_benefits.map((benefit, index) => (
                        <li key={index} className="text-gray-600">{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Issues Detail */}
          <Card>
            <CardHeader>
                              <CardTitle>Problemas de Clasificación</CardTitle>
                <CardDescription>
                  Análisis detallado de problemas de clasificación familiar con soluciones accionables
                </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {family.issues.map((issue, index) => (
                  <div 
                    key={issue.error_id}
                    className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{issue.error_type.replace('_', ' ')}</Badge>
                          <Badge variant="destructive">{issue.severity}</Badge>
                          {issue.auto_fix_possible && (
                            <Badge variant="secondary">Auto-fix Available</Badge>
                          )}
                        </div>
                        <h4 className="font-semibold">{issue.error_message}</h4>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {formatCurrency(issue.financial_impact)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {(issue.completeness_percentage || 0).toFixed(1)}% complete
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Business Impact:</p>
                      <p className="text-sm">{issue.business_impact}</p>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Resolution Steps:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {issue.actionable_resolution.map((step, stepIndex) => (
                          <li key={stepIndex}>{step}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Affected Accounts */}
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Affected Accounts:</p>
                      <div className="max-h-32 overflow-y-auto">
                        <div className="grid grid-cols-1 gap-2">
                          {issue.classified_children.map((account, accIndex) => (
                            <div key={accIndex} className="text-xs bg-green-50 p-2 rounded">
                              <span className="font-mono">{account.codigo}</span> - 
                              <span className="ml-1">{account.concepto}</span>
                              <span className="ml-2 font-bold">
                                {formatCurrency(account.amount)}
                              </span>
                              <span className="ml-2 text-green-600">✓ Classified</span>
                            </div>
                          ))}
                          {issue.unclassified_children?.map((account, accIndex) => (
                            <div key={`unclass-${accIndex}`} className="text-xs bg-red-50 p-2 rounded">
                              <span className="font-mono">{account.codigo}</span> - 
                              <span className="ml-1">{account.concepto}</span>
                              <span className="ml-2 font-bold">
                                {formatCurrency(account.amount)}
                              </span>
                              <span className="ml-2 text-red-600">✗ Missing</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {issue.auto_fix_possible && (
                        <Button 
                          size="sm"
                          onClick={() => handleApplyFix(`auto_fix_${issue.error_id}`)}
                          disabled={isApplyingFix}
                        >
                          {isApplyingFix ? 'Applying...' : 'Apply Auto-fix'}
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleApplyFix(`manual_fix_${issue.error_id}`)}
                        disabled={isApplyingFix}
                      >
                        Manual Review
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleApplyFix(`ignore_${issue.error_id}`)}
                        disabled={isApplyingFix}
                      >
                        Ignore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

interface FamilyBasedClassificationDashboardProps {
  reportId?: string;
}

const FamilyBasedClassificationDashboard: React.FC<FamilyBasedClassificationDashboardProps> = ({ reportId }) => {
  const [familyValidations, setFamilyValidations] = useState<FamilyValidationResult[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FamilyValidationResult | null>(null);
  const [alertsSummary, setAlertsSummary] = useState<AlertsSummary>({
    OVER_CLASSIFICATION: 0,
    MIXED_LEVEL4_SIBLINGS: 0,
    MIXED_LEVEL3_SIBLINGS: 0,
    UNDER_CLASSIFICATION: 0,
    total_impact: 0,
    over_classification_impact: 0,
    mixed_siblings_impact: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (reportId) {
      loadFamilyValidations();
    } else {
      setIsLoading(false);
      setFamilyValidations([]);
    }
  }, [reportId]);

  const loadFamilyValidations = async () => {
    if (!reportId) return;
    
    try {
      setIsLoading(true);
      
      const validations = await SophisticatedBottomUpValidator.validateHierarchyFamilies(reportId);
      setFamilyValidations(validations);
      
      // Calculate alerts summary
      const summary = validations.reduce((acc, family) => {
        family.issues.forEach(issue => {
          switch (issue.error_type) {
            case 'OVER_CLASSIFICATION':
              acc.OVER_CLASSIFICATION += 1;
              acc.over_classification_impact += issue.financial_impact;
              break;
            case 'MIXED_LEVEL4_SIBLINGS':
              acc.MIXED_LEVEL4_SIBLINGS += 1;
              acc.mixed_siblings_impact += issue.financial_impact;
              break;
            case 'MIXED_LEVEL3_SIBLINGS':
              acc.MIXED_LEVEL3_SIBLINGS += 1;
              acc.mixed_siblings_impact += issue.financial_impact;
              break;
            case 'UNDER_CLASSIFICATION':
              acc.UNDER_CLASSIFICATION += 1;
              break;
          }
          acc.total_impact += issue.financial_impact;
        });
        return acc;
      }, {
        OVER_CLASSIFICATION: 0,
        MIXED_LEVEL4_SIBLINGS: 0,
        MIXED_LEVEL3_SIBLINGS: 0,
        UNDER_CLASSIFICATION: 0,
        total_impact: 0,
        over_classification_impact: 0,
        mixed_siblings_impact: 0
      });
      
      setAlertsSummary(summary);
    } catch (error) {
      console.error('Error loading family validations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFix = async (family: FamilyValidationResult, action: string) => {
    console.log(`Applying fix for family ${family.family_code}: ${action}`);
    // Implementation would handle the specific fix
    // For now, just reload the data
    await loadFamilyValidations();
    setSelectedFamily(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const criticalFamilies = familyValidations.filter(f => 
    f.issues.some(i => i.severity === 'CRITICAL')
  );

  const mixedSiblingFamilies = familyValidations.filter(f =>
    f.issues.some(i => i.error_type.includes('MIXED'))
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading family validation analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Executive Summary with Real Data Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
                          Análisis de Clasificación Familia por Familia
          </CardTitle>
          <CardDescription>
            Bottom-up validation starting from Level 4 details, working upward through hierarchy families
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">Sobre-Clasificación</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {alertsSummary.OVER_CLASSIFICATION}
              </p>
              <p className="text-sm text-red-600">Double-counting issues</p>
              <p className="text-xs text-red-500 mt-1">
                                  Impacto: {formatCurrency(alertsSummary.over_classification_impact)}
              </p>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <p className="text-orange-800 font-medium">Mixed Siblings</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {alertsSummary.MIXED_LEVEL4_SIBLINGS + alertsSummary.MIXED_LEVEL3_SIBLINGS}
              </p>
              <p className="text-sm text-orange-600">Incomplete families</p>
              <p className="text-xs text-orange-500 mt-1">
                Impact: {formatCurrency(alertsSummary.mixed_siblings_impact)}
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium">Perfect Families</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {familyValidations.filter(f => !f.hasIssues).length}
              </p>
              <p className="text-sm text-green-600">Following best practices</p>
              <p className="text-xs text-green-500 mt-1">
                Value: {formatCurrency(
                  familyValidations
                    .filter(f => !f.hasIssues)
                    .reduce((sum, f) => sum + f.total_amount, 0)
                )}
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <p className="text-blue-800 font-medium">Total Impact</p>
              </div>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(alertsSummary.total_impact)}
              </p>
                              <p className="text-sm text-blue-600">Clasificaciones faltantes</p>
              <p className="text-xs text-blue-500 mt-1">
                {((alertsSummary.total_impact) / 84458314.44 * 100).toFixed(1)}% of total costs
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Priority Issues - Based on Real Data Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Issues (Based on Financial Impact)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {familyValidations
              .filter(f => f.hasIssues)
              .sort((a, b) => b.financial_impact - a.financial_impact)
              .slice(0, 5)
              .map(family => (
                <div 
                  key={family.family_code} 
                  className="border rounded p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedFamily(family)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{family.family_code} - {family.family_name}</h3>
                      <p className="text-sm text-gray-600">
                        {family.issues.length} issues affecting {formatCurrency(family.financial_impact)}
                      </p>
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>Completion:</span>
                          <Progress 
                            value={family.optimal_approach.current_completeness} 
                            className="w-24 h-2"
                          />
                          <span>{family.optimal_approach.current_completeness.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex flex-wrap gap-2 justify-end mb-2">
                        {family.issues.map(issue => (
                          <Badge 
                            key={issue.error_type} 
                            variant={issue.severity === 'CRITICAL' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {issue.error_type.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        Priority: {Math.min(...family.issues.map(i => i.priority_rank || 999))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Family Categories */}
      <Tabs defaultValue="critical" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="critical">Critical Issues ({criticalFamilies.length})</TabsTrigger>
          <TabsTrigger value="mixed">Mixed Siblings ({mixedSiblingFamilies.length})</TabsTrigger>
          <TabsTrigger value="all">All Families ({familyValidations.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="critical">
          <Card>
            <CardHeader>
                              <CardTitle>Problemas Críticos de Clasificación</CardTitle>
                <CardDescription>
                  Familias con problemas críticos de sobre-clasificación o doble conteo
                </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {criticalFamilies.map(family => (
                  <div 
                    key={family.family_code}
                    className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedFamily(family)}
                  >
                    <div>
                      <span className="font-medium">{family.family_code}</span>
                      <span className="ml-2 text-gray-600">{family.family_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Critical</Badge>
                      <span className="text-sm font-medium">
                        {formatCurrency(family.financial_impact)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="mixed">
          <Card>
            <CardHeader>
                              <CardTitle>Clasificación de Hermanos Mixta</CardTitle>
                <CardDescription>
                  Familias con clasificaciones de hermanos incompletas en Nivel 4
                </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mixedSiblingFamilies.map(family => (
                  <div 
                    key={family.family_code}
                    className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedFamily(family)}
                  >
                    <div>
                      <span className="font-medium">{family.family_code}</span>
                      <span className="ml-2 text-gray-600">{family.family_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Mixed</Badge>
                      <span className="text-sm font-medium">
                        {formatCurrency(family.financial_impact)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Families</CardTitle>
              <CardDescription>
                Complete list of all hierarchy families with their validation status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {familyValidations.map(family => (
                  <div 
                    key={family.family_code}
                    className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedFamily(family)}
                  >
                    <div>
                      <span className="font-medium">{family.family_code}</span>
                      <span className="ml-2 text-gray-600">{family.family_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {family.hasIssues ? (
                        <Badge variant="destructive">{family.issues.length} Issues</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">Perfect</Badge>
                      )}
                      <span className="text-sm font-medium">
                        {formatCurrency(family.total_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Detailed Family Analysis Modal */}
      {selectedFamily && (
        <FamilyDetailedAnalysis 
          family={selectedFamily} 
          onClose={() => setSelectedFamily(null)}
          onApplyFix={handleApplyFix}
        />
      )}
    </div>
  );
};

export default FamilyBasedClassificationDashboard; 