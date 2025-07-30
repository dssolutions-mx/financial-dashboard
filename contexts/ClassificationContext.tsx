'use client';

// Enhanced Dynamic Classification System - Context Provider
// Shares classification state between traditional and advanced views

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FamilyValidationResult } from '@/lib/services/sophisticated-bottom-up-validator.service';

interface ClassificationContextType {
  // Family validation state
  familyValidationResults: FamilyValidationResult[];
  setFamilyValidationResults: (results: FamilyValidationResult[]) => void;
  
  // Current report being analyzed
  currentReportId: string | null;
  setCurrentReportId: (reportId: string | null) => void;
  
  // Validation status
  isValidationRunning: boolean;
  setIsValidationRunning: (running: boolean) => void;
  
  // Issues visibility
  showIssuesPanel: boolean;
  setShowIssuesPanel: (show: boolean) => void;
  
  // Helper functions
  getTotalIssues: () => number;
  getTotalFinancialImpact: () => number;
  getCriticalFamilies: () => FamilyValidationResult[];
  getMixedSiblingFamilies: () => FamilyValidationResult[];
  
  // Trigger validation
  triggerValidation: (reportId: string) => Promise<FamilyValidationResult[]>;
}

const ClassificationContext = createContext<ClassificationContextType | undefined>(undefined);

interface ClassificationProviderProps {
  children: ReactNode;
}

export function ClassificationProvider({ children }: ClassificationProviderProps) {
  const [familyValidationResults, setFamilyValidationResults] = useState<FamilyValidationResult[]>([]);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [isValidationRunning, setIsValidationRunning] = useState(false);
  const [showIssuesPanel, setShowIssuesPanel] = useState(false);

  // Helper functions
  const getTotalIssues = () => {
    return familyValidationResults.reduce((sum, family) => sum + family.issues.length, 0);
  };

  const getTotalFinancialImpact = () => {
    return familyValidationResults.reduce((sum, family) => sum + family.financial_impact, 0);
  };

  const getCriticalFamilies = () => {
    return familyValidationResults.filter(f => 
      f.issues.some(i => i.severity === 'CRITICAL')
    );
  };

  const getMixedSiblingFamilies = () => {
    return familyValidationResults.filter(f =>
      f.issues.some(i => i.error_type.includes('MIXED'))
    );
  };

  const triggerValidation = async (reportId: string) => {
    setIsValidationRunning(true);
    setCurrentReportId(reportId);
    
    try {
      // Import dynamically to avoid server-side issues
      const { SophisticatedBottomUpValidator } = await import('@/lib/services/sophisticated-bottom-up-validator.service');
      const validator = new SophisticatedBottomUpValidator();
      const results = await validator.validateHierarchyFamilies(reportId);
      
      setFamilyValidationResults(results);
      
      // Show issues panel if problems are detected
      if (results.some(f => f.hasIssues)) {
        setShowIssuesPanel(true);
      }
      
      return results;
    } catch (error) {
      console.error('Validation failed:', error);
      throw error;
    } finally {
      setIsValidationRunning(false);
    }
  };

  // Auto-clear validation when report changes
  useEffect(() => {
    if (currentReportId) {
      // Clear previous results when switching reports
      setFamilyValidationResults([]);
      setShowIssuesPanel(false);
    }
  }, [currentReportId]);

  const contextValue: ClassificationContextType = {
    familyValidationResults,
    setFamilyValidationResults,
    currentReportId,
    setCurrentReportId,
    isValidationRunning,
    setIsValidationRunning,
    showIssuesPanel,
    setShowIssuesPanel,
    getTotalIssues,
    getTotalFinancialImpact,
    getCriticalFamilies,
    getMixedSiblingFamilies,
    triggerValidation,
  };

  return (
    <ClassificationContext.Provider value={contextValue}>
      {children}
    </ClassificationContext.Provider>
  );
}

export function useClassification() {
  const context = useContext(ClassificationContext);
  if (context === undefined) {
    throw new Error('useClassification must be used within a ClassificationProvider');
  }
  return context;
}

export default ClassificationContext; 