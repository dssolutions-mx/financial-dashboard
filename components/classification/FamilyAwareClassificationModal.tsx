'use client';

// Enhanced Dynamic Classification System - Phase 3.2
// Smart Classification Modal with Family Context

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, DollarSign, Info } from 'lucide-react';
import { 
  FamilyAwareClassificationService, 
  SmartClassificationResult, 
  FamilyContext, 
  Classification,
  ValidationResult 
} from '@/lib/services/family-aware-classification.service';

interface FamilyAwareClassificationModalProps {
  isOpen: boolean;
  accountCode: string;
  accountName: string;
  reportId: string;
  onClose: () => void;
  onSave: (result: { classification: Classification; impact: any }) => void;
}

interface ClassificationSuggestion {
  type: string;
  classification: Classification;
  confidence: number;
  reasoning: string;
  family_rule?: string;
  source: 'sibling_pattern' | 'parent_inheritance' | 'historical_pattern' | 'manual_suggestion';
}

const FamilyAwareClassificationModal: React.FC<FamilyAwareClassificationModalProps> = ({ 
  isOpen, 
  accountCode, 
  accountName, 
  reportId, 
  onClose, 
  onSave 
}) => {
  const [familyContext, setFamilyContext] = useState<FamilyContext | null>(null);
  const [suggestions, setSuggestions] = useState<ClassificationSuggestion[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<Classification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (isOpen && accountCode) {
      loadClassificationData();
    }
  }, [isOpen, accountCode, reportId]);

  const loadClassificationData = async () => {
    try {
      setIsLoading(true);
      
      const classificationService = new FamilyAwareClassificationService();
      
      // Load family-aware suggestions
      const smartResult = await classificationService.classifyWithFamilyContext(
        accountCode,
        accountName,
        reportId,
        new Date()
      );
      
      setFamilyContext(smartResult.family_context);
      
      // Convert to suggestions format
      const suggestion: ClassificationSuggestion = {
        type: smartResult.source.replace('_', ' ').toUpperCase(),
        classification: {
          tipo: smartResult.tipo,
          categoria_1: smartResult.categoria_1,
          sub_categoria: smartResult.sub_categoria,
          clasificacion: smartResult.clasificacion
        },
        confidence: smartResult.confidence * 100,
        reasoning: smartResult.reasoning || '',
        family_rule: smartResult.family_rule,
        source: smartResult.source
      };
      
      setSuggestions([suggestion]);
      
      // Validate the suggestion
      if (smartResult.confidence > 0) {
        const validation = await classificationService.validateClassificationBeforeApply(
          accountCode,
          suggestion.classification
        );
        setValidationResults(validation);
      }
      
    } catch (error) {
      console.error('Error loading classification data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyClassification = async (classification: Classification) => {
    if (!validationResults?.valid) {
      alert(`Cannot apply classification: ${validationResults?.message}`);
      return;
    }

    setIsApplying(true);
    try {
      const classificationService = new FamilyAwareClassificationService();
      
      // Apply with family impact analysis
      const impact = await classificationService.updateClassificationWithFamilyImpact(
        accountCode, 
        classification, 
        new Date(), 
        'current_user'
      );
      
      onSave({ classification, impact });
      onClose();
    } catch (error) {
      console.error('Error applying classification:', error);
      alert('Error applying classification. Please try again.');
    } finally {
      setIsApplying(false);
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

  const getValidationSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL': return 'border-red-500 bg-red-50';
      case 'HIGH': return 'border-orange-500 bg-orange-50';
      case 'MEDIUM': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'sibling_pattern': return '👥';
      case 'parent_inheritance': return '📊';
      case 'historical_pattern': return '🕒';
      default: return '✋';
    }
  };

  const getSourceDescription = (source: string) => {
    switch (source) {
      case 'sibling_pattern': return 'Based on sibling account patterns in the same family';
      case 'parent_inheritance': return 'Inherited from parent account classification';
      case 'historical_pattern': return 'Based on historical classification patterns';
      default: return 'Manual classification required';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Classify Account: {accountCode}
          </DialogTitle>
          <DialogDescription>
            Family-Aware Classification with Context Analysis
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Analyzing family context...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Account Code:</strong> {accountCode}</p>
                    <p><strong>Account Name:</strong> {accountName}</p>
                  </div>
                  <div>
                    <p><strong>Hierarchy Level:</strong> {familyContext?.hierarchy_level}</p>
                    <p><strong>Family Code:</strong> {familyContext?.family_code}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Family Context Display */}
            {familyContext && (
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Info className="h-5 w-5" />
                    Family Context Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p><strong>Family:</strong> {familyContext.family_name}</p>
                      <p><strong>Recommended Approach:</strong> {familyContext.recommended_approach.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p><strong>Siblings:</strong> {familyContext.classified_siblings} of {familyContext.total_siblings} classified</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span><strong>Completeness:</strong></span>
                        <Progress 
                          value={familyContext.completeness_percentage} 
                          className="w-20 h-2"
                        />
                        <span>{familyContext.completeness_percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Mixed Sibling Warning */}
                  {familyContext.has_mixed_siblings && (
                    <Alert className="border-orange-500 bg-orange-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Mixed Sibling Classification Detected</AlertTitle>
                      <AlertDescription className="text-sm">
                        <p>Some sibling accounts are classified while others are not.</p>
                        <p><strong>Missing Amount:</strong> {formatCurrency(familyContext.missing_amount)} will not appear in reports.</p>
                        <p><strong>Business Impact:</strong> Incomplete family classification reduces reporting accuracy.</p>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Over-Classification Prevention */}
            {validationResults && !validationResults.valid && (
              <Alert className={`${getValidationSeverityColor(validationResults.severity)}`}>
                <XCircle className="h-4 w-4" />
                <AlertTitle>Classification Conflict Detected</AlertTitle>
                <AlertDescription className="text-sm">
                  <p><strong>Issue:</strong> {validationResults.message}</p>
                  {validationResults.financial_impact && (
                    <p><strong>Financial Impact:</strong> {formatCurrency(validationResults.financial_impact)} would be double-counted</p>
                  )}
                  <p><strong>Suggested Action:</strong> {validationResults.suggested_action}</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Sibling Account Grid */}
            {familyContext && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sibling Accounts in This Family</CardTitle>
                  <CardDescription>
                    All accounts within the same family ({familyContext.family_code})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2">Account Code</th>
                            <th className="text-left p-2">Description</th>
                            <th className="text-right p-2">Amount</th>
                            <th className="text-center p-2">Status</th>
                            <th className="text-left p-2">Classification</th>
                          </tr>
                        </thead>
                        <tbody>
                          {familyContext.siblings.map(sibling => (
                            <tr key={sibling.codigo} className={`border-t ${
                              sibling.codigo === accountCode ? 'bg-yellow-50' : ''
                            }`}>
                              <td className="p-2 font-mono text-xs">{sibling.codigo}</td>
                              <td className="p-2">{sibling.concepto.substring(0, 30)}...</td>
                              <td className="p-2 text-right">{formatCurrency(sibling.amount)}</td>
                              <td className="p-2 text-center">
                                <Badge 
                                  variant={sibling.classification_status === 'CLASSIFIED' ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {sibling.classification_status === 'CLASSIFIED' ? 'Classified' : 'Missing'}
                                </Badge>
                              </td>
                              <td className="p-2 text-xs text-gray-600">
                                {sibling.clasificacion || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Smart Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle>Family-Aware Classification Suggestions</CardTitle>
                <CardDescription>
                  Intelligent recommendations based on family context and patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className={`border rounded-lg p-4 ${
                      suggestion.confidence > 70 ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getSourceIcon(suggestion.source)}</span>
                          <div>
                            <span className="font-medium text-gray-800">
                              {suggestion.type} - {suggestion.confidence.toFixed(0)}% confidence
                            </span>
                            <p className="text-xs text-gray-600">{getSourceDescription(suggestion.source)}</p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleApplyClassification(suggestion.classification)}
                          disabled={(!validationResults?.valid && validationResults !== null) || isApplying}
                          className={`${suggestion.confidence > 70 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                        >
                          {isApplying ? 'Applying...' : 'Apply Classification'}
                        </Button>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-700 mb-2">{suggestion.reasoning}</p>
                        {suggestion.family_rule && (
                          <p className="text-xs text-gray-600 italic bg-white p-2 rounded border-l-4 border-blue-400">
                            <strong>Family Rule:</strong> {suggestion.family_rule}
                          </p>
                        )}
                      </div>
                      
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-medium text-gray-700 mb-2">Proposed Classification:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium">Tipo:</span> {suggestion.classification.tipo}
                          </div>
                          <div>
                            <span className="font-medium">Categoría 1:</span> {suggestion.classification.categoria_1}
                          </div>
                          <div>
                            <span className="font-medium">Subcategoría:</span> {suggestion.classification.sub_categoria}
                          </div>
                          <div>
                            <span className="font-medium">Clasificación:</span> {suggestion.classification.clasificacion}
                          </div>
                        </div>
                      </div>

                      {/* Confidence Indicator */}
                      <div className="mt-3">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>Confidence:</span>
                          <Progress 
                            value={suggestion.confidence} 
                            className="w-32 h-2"
                          />
                          <span>{suggestion.confidence.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {suggestions.length === 0 && (
                    <div className="border rounded p-4 bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">✋</span>
                        <p className="font-medium text-gray-600">No automatic suggestions available</p>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        Manual classification required. Consider the family context and sibling patterns when classifying manually.
                      </p>
                      {familyContext && (
                        <div className="text-xs text-gray-500 bg-white p-2 rounded border-l-4 border-gray-400">
                          <p><strong>Family Guidance:</strong></p>
                          <p>• Family is {familyContext.completeness_percentage.toFixed(1)}% complete</p>
                          <p>• Recommended approach: {familyContext.recommended_approach.replace('_', ' ')}</p>
                          {familyContext.has_mixed_siblings && (
                            <p>• Complete sibling classification for consistency</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isApplying}>
                Cancel
              </Button>
              <Button 
                variant="secondary"
                onClick={() => {/* Open manual classification dialog */}}
                disabled={isApplying}
              >
                Manual Classification
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FamilyAwareClassificationModal; 