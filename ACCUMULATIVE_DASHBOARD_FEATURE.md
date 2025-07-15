# Accumulative Dashboard Feature

## Overview

I have successfully implemented an accumulative property for the main dashboard that allows users to select multiple reports and view their combined data. This feature provides comprehensive analysis across multiple reporting periods.

## Key Features Implemented

### 1. Multi-Report Selection
- **Toggle Button**: Added "Modo Individual" / "Modo Acumulativo" toggle in the header
- **Enhanced Report Selector**: 
  - Supports checkbox-based multi-selection when in accumulation mode
  - Shows total selected reports and records count
  - Bulk select/deselect functionality
  - Clear selection option

### 2. Data Aggregation
- **Smart Aggregation**: Combines data from multiple reports by grouping similar entries
- **Key-based Merging**: Groups by Codigo, Tipo, Categoria 1, Sub categoria, Clasificacion, and Planta
- **Financial Calculations**: Properly accumulates Monto, Abonos, and Cargos values
- **Real-time Updates**: Automatically recalculates when reports are selected/deselected

### 3. Enhanced UI Experience
- **Mode Indicator Panel**: 
  - Orange-themed info panel when accumulation mode is active
  - Shows selected reports with month/year badges
  - Displays total accumulated records count
  - Loading states during data aggregation

- **Adaptive Summary Cards**:
  - Shows accumulated data context instead of cash sales breakdown
  - Volume card shows record counts and period ranges in accumulation mode
  - Clear indication of how many reports are being analyzed

### 4. Smart Feature Management
- **Conditional Features**: Volume and cash sales configuration disabled in accumulation mode
- **Mode-Specific Calculations**: Different calculation logic for individual vs accumulated data
- **Context-Aware Display**: UI elements adapt based on the current mode

## Technical Implementation

### State Management
```typescript
// New state variables added:
const [enableAccumulation, setEnableAccumulation] = useState(false)
const [selectedReports, setSelectedReports] = useState<FinancialReport[]>([])
const [accumulatedData, setAccumulatedData] = useState<DebugDataRow[]>([])
const [isLoadingAccumulation, setIsLoadingAccumulation] = useState(false)
```

### Data Aggregation Logic
- Fetches data from multiple reports asynchronously
- Uses Map-based aggregation for efficient merging
- Maintains data integrity while combining financial records
- Provides progress feedback during loading

### UI Components Modified
1. **ReportSelector**: Enhanced with multi-select capabilities
2. **Financial Dashboard**: Updated to handle dual modes
3. **Summary Cards**: Adaptive content based on mode
4. **Header Controls**: New accumulation toggle button

## User Workflow

### Normal Mode (Individual Reports)
1. User selects a single report from the report selector
2. Dashboard shows data for that specific period
3. Volume and cash sales configuration available
4. Standard financial analysis view

### Accumulative Mode
1. User clicks "Modo Individual" to switch to "Modo Acumulativo"
2. Report selector switches to multi-select mode with checkboxes
3. User selects multiple reports (different months/years)
4. Dashboard automatically aggregates and displays combined data
5. Summary shows accumulated totals across all selected periods
6. Visual indicators show which reports are included

## Benefits

1. **Multi-Period Analysis**: Compare and analyze data across multiple months or years
2. **Trend Identification**: Spot patterns and trends over extended periods
3. **Comprehensive Reporting**: Generate aggregate reports for board presentations
4. **Flexible Selection**: Choose any combination of reports for analysis
5. **Performance Optimized**: Efficient data loading and aggregation
6. **Intuitive UX**: Clear visual feedback and easy mode switching

## Technical Notes

- **Data Integrity**: Maintains separate state for individual and accumulated data
- **Performance**: Lazy loading of report data only when needed
- **Error Handling**: Proper error states and user feedback
- **Responsive Design**: Works across different screen sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation

The implementation provides a powerful tool for financial analysis while maintaining the existing functionality for single-report analysis.