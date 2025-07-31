# Dynamic Classification Workflow System

## Overview

This system enables the complete workflow for dynamic classification management:

1. **Process Excel files** with existing classifications
2. **Make user changes** to classifications during review
3. **Save data** with updated classifications to database
4. **Update classification rules** so future Excel files automatically use the new classifications

## Core Components

### 1. DynamicClassificationManager
Main service that handles all classification operations.

### 2. DynamicClassificationClient
Client-side service for easy frontend integration.

### 3. API Endpoints
- `/api/classification/process-excel-with-existing` - Step 1
- `/api/classification/apply-user-changes` - Step 2
- `/api/classification/save-with-updated-classifications` - Step 3
- `/api/classification/update-rules-for-future` - Step 4
- `/api/classification/process-excel-with-changes` - Complete workflow

## Usage Examples

### Complete Workflow (Recommended)

```typescript
import { DynamicClassificationClient } from '@/lib/services/dynamic-classification-client'
import { handleBalanzaFileUpload } from '@/lib/services/excel-processor'

// 1. Process Excel file
const fileInput = document.getElementById('file-input') as HTMLInputElement
const { data: processedData } = await handleBalanzaFileUpload(fileInput)

// 2. Define user changes
const userChanges = [
  {
    accountCode: '5000-1000-001-001',
    oldClassification: {
      tipo: 'Indefinido',
      categoria_1: 'Sin Categoría',
      sub_categoria: 'Sin Subcategoría',
      clasificacion: 'Sin Clasificación'
    },
    newClassification: {
      tipo: 'Costos',
      categoria_1: 'Costos de Producción',
      sub_categoria: 'Materiales',
      clasificacion: 'Concreto'
    },
    amount: 1500000,
    reportId: 'temp-report-id'
  }
]

// 3. Execute complete workflow
const result = await DynamicClassificationClient.processExcelWithUserChanges(
  processedData,
  userChanges,
  'Reporte Junio 2025',
  'balanza_junio_2025.xlsx',
  6, // month
  2025, // year
  'user-123' // userId
)

console.log('Workflow completed:', result)
// {
//   finalData: [...],
//   reportId: 'uuid',
//   summary: {
//     totalAccounts: 150,
//     classifiedAccounts: 120,
//     unclassifiedAccounts: 30,
//     totalAmount: 45000000,
//     classifiedAmount: 38000000,
//     unclassifiedAmount: 7000000,
//     newRulesCreated: 1,
//     existingRulesUpdated: 0,
//     rulesUpdatedForFuture: 1,
//     rulesCreatedForFuture: 0
//   }
// }
```

### Step-by-Step Workflow

```typescript
import { DynamicClassificationClient } from '@/lib/services/dynamic-classification-client'

// Step 1: Process Excel with existing classifications
const initialResult = await DynamicClassificationClient.processExcelWithExistingClassifications(
  processedData,
  'Reporte Junio 2025',
  'balanza_junio_2025.xlsx',
  6,
  2025
)

console.log('Unclassified accounts:', initialResult.unclassifiedAccounts)
console.log('Classification summary:', initialResult.classificationSummary)

// Step 2: Apply user changes
const changeResult = await DynamicClassificationClient.applyUserChanges(userChanges, 'user-123')

// Step 3: Save data with updated classifications
const saveResult = await DynamicClassificationClient.saveDataWithUpdatedClassifications(
  changeResult.updatedData,
  'Reporte Junio 2025',
  'balanza_junio_2025.xlsx',
  6,
  2025
)

// Step 4: Update rules for future use
const ruleResult = await DynamicClassificationClient.updateClassificationRulesForFutureUse(
  userChanges,
  'user-123'
)
```

## Data Flow

### 1. Excel Processing
- Excel file is processed using existing `excel-processor.ts`
- `DynamicClassificationManager.processExcelWithExistingClassifications()` applies existing classification rules
- Returns processed data with classifications and list of unclassified accounts

### 2. User Changes
- User reviews unclassified accounts and makes classification changes
- Changes are formatted as `ClassificationChange[]` objects
- `DynamicClassificationManager.applyUserClassificationChanges()` updates classification rules

### 3. Data Persistence
- `DynamicClassificationManager.saveDataWithUpdatedClassifications()` saves to `financial_data` table
- Creates `financial_reports` record
- All data includes updated classifications

### 4. Future Rule Updates
- `DynamicClassificationManager.updateClassificationRulesForFutureUse()` updates `classification_rules` table
- Future Excel files will automatically use these updated classifications

## Database Tables Used

### classification_rules
Stores classification rules for automatic application to future Excel files.

### financial_reports
Stores metadata about uploaded reports.

### financial_data
Stores individual line items with their classifications.

## Key Features

### Automatic Classification Application
- Existing rules are automatically applied during Excel processing
- New rules created from user changes are immediately available for future files

### Retroactive Updates
- Changes to classification rules can be applied retroactively to historical data
- Complete audit trail of all changes

### Family-Aware Processing
- Classification changes respect hierarchy relationships
- Prevents over-classification and ensures consistency

### Performance Optimized
- Uses database indexes for fast rule lookups
- Efficient batch operations for data updates

## Error Handling

The system includes comprehensive error handling:

- Database connection errors
- Invalid classification data
- Missing required fields
- Rule conflicts

All errors are logged and returned with appropriate HTTP status codes.

## Security

- User authentication required for all classification changes
- Audit trail of all modifications
- Input validation on all endpoints
- SQL injection protection through Supabase

## Monitoring

The system provides detailed metrics:

- Number of accounts processed
- Classification success rate
- Financial impact of changes
- Rule creation/update statistics

This enables tracking of classification quality and system performance over time. 