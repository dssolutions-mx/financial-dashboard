# Cash Sales Implementation Plan

## Overview

This plan outlines the implementation of cash sales functionality in the financial dashboard. Cash sales represent non-fiscal earnings from cash payments for concrete and pumping services that are not captured in the tax records Excel uploads. This new income source requires:

1. **Separate cash sales data input**
2. **Volume tracking for cash sales**
3. **Integration with existing unit cost calculations**
4. **Clear separation from fiscal sales**

## Current System Analysis

### Existing Components:
- **Excel Upload**: Processes tax records for fiscal sales
- **Volume Data**: `plant_volumes` table with categories: "Ventas Concreto", "Ventas Bombeo", "Productos Alternativos"
- **Cost Calculations**: 
  - Material costs use concrete volume only
  - Operational costs use combined concrete + bombeo volume
- **Plant System**: P1-P5 plants mapped to business units

### Key Challenge:
Cash sales represent additional volume that must be included in total volume calculations for accurate unit cost determination.

## Implementation Strategy

### Phase 1: Database Schema Extensions

#### 1.1 New Table: `cash_sales`
```sql
CREATE TABLE cash_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_code VARCHAR(50) NOT NULL,
  business_unit VARCHAR(50) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  category VARCHAR(100) NOT NULL, -- 'Ventas Concreto Cash', 'Ventas Bombeo Cash'
  volume_m3 NUMERIC(12,3) DEFAULT 0,
  amount_mxn NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plant_code, month, year, category)
);

-- Add indexes for performance
CREATE INDEX idx_cash_sales_lookup ON cash_sales(plant_code, month, year, category);
CREATE INDEX idx_cash_sales_business_unit ON cash_sales(business_unit, month, year);

-- Enable RLS
ALTER TABLE cash_sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (allow all for now, can be restricted later)
CREATE POLICY "Allow all operations on cash_sales" ON cash_sales
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
```

#### 1.2 Update Database Types
Extend `lib/types/database.types.ts` to include the new table.

### Phase 2: Data Layer Extensions

#### 2.1 New Interface and Service Methods

**New Interface:**
```typescript
export interface CashSale {
  id: string
  plant_code: string
  business_unit: string
  month: number
  year: number
  category: string
  volume_m3: number
  amount_mxn: number
  notes?: string
  created_at: string
  updated_at: string
}
```

**New Service Methods:**
- `saveCashSale()`
- `getCashSales(month, year)`
- `getCashSalesGrouped(month, year)`
- `bulkSaveCashSales()`
- `deleteCashSale(id)`
- `getCashSalesTotals(month, year)`

#### 2.2 Volume Calculation Logic Updates

**Enhanced Volume Calculation:**
```typescript
// Current: Only uses plant_volumes
const getTotalVolume = (category: string, plants: string[]) => {
  return plantVolumes[category] 
    ? plants.reduce((sum, plant) => sum + (plantVolumes[category][plant] || 0), 0)
    : 0
}

// New: Combines plant_volumes + cash_sales
const getTotalVolumeWithCash = (category: string, plants: string[], month: number, year: number) => {
  const fiscalVolume = getTotalVolume(category, plants)
  const cashVolume = getCashSalesVolume(category, plants, month, year)
  return fiscalVolume + cashVolume
}
```

### Phase 3: UI/UX Enhancements

#### 3.1 New Cash Sales Input Modal

**Component: `CashSalesInputModal`**
- Similar to `VolumeInputModal` but for cash sales
- Input fields for both volume and monetary amount
- Category selection: "Ventas Concreto Cash", "Ventas Bombeo Cash"
- Plant-specific inputs
- Validation and error handling

#### 3.2 Enhanced Financial Dashboard

**New Section: Cash Sales Management**
- Button to open cash sales input modal
- Display current cash sales totals
- Integration with existing volume display
- Clear indicators for fiscal vs cash sales

#### 3.3 Updated Unit Cost Calculations

**Enhanced Display:**
```typescript
// Show breakdown of volume sources
const renderVolumeBreakdown = (plant: string, category: string) => {
  const fiscalVol = getFiscalVolume(plant, category)
  const cashVol = getCashVolume(plant, category)
  const totalVol = fiscalVol + cashVol
  
  return (
    <div className="text-xs">
      <div>Total: {totalVol.toFixed(2)} m³</div>
      <div className="text-gray-500">
        Fiscal: {fiscalVol.toFixed(2)} | Cash: {cashVol.toFixed(2)}
      </div>
    </div>
  )
}
```

### Phase 4: Business Logic Integration

#### 4.1 Income Categories

**New Income Categories:**
- "Ventas Concreto Cash" - Cash sales of concrete
- "Ventas Bombeo Cash" - Cash sales of pumping services

#### 4.2 Cost Calculation Updates

**Material Costs:**
- Use total concrete volume (fiscal + cash)
- `totalConcreteVol = fiscalConcreteVol + cashConcreteVol`

**Operational Costs:**
- Use total combined volume (fiscal + cash)
- `totalOperationalVol = (fiscalConcreteVol + cashConcreteVol) + (fiscalBombeoVol + cashBombeoVol)`

#### 4.3 Reporting and Analytics

**Enhanced Summary Cards:**
- Separate displays for fiscal vs cash sales
- Combined totals
- Volume breakdowns

### Phase 5: Data Migration and Validation

#### 5.1 Data Migration
- No existing data migration needed (new feature)
- Create sample data for testing

#### 5.2 Validation System Updates
- Add validation for cash sales data
- Ensure volume consistency
- Business rules validation

### Phase 6: Testing and Quality Assurance

#### 6.1 Unit Tests
- Test new service methods
- Test volume calculation logic
- Test UI components

#### 6.2 Integration Tests
- Test cash sales with existing fiscal data
- Test unit cost calculations
- Test data persistence

#### 6.3 User Acceptance Testing
- Test complete cash sales workflow
- Test volume impact on unit costs
- Test data accuracy

## Technical Implementation Details

### Volume Management Strategy

```typescript
// Enhanced volume data structure
interface EnhancedVolumeData {
  fiscal: {
    [category: string]: {
      [plant: string]: number
    }
  }
  cash: {
    [category: string]: {
      [plant: string]: number
    }
  }
  totals: {
    [category: string]: {
      [plant: string]: number
    }
  }
}
```

### Database Query Optimization

```sql
-- Query to get combined volume data
SELECT 
  plant_code,
  category,
  SUM(volume_m3) as total_volume,
  SUM(CASE WHEN source = 'fiscal' THEN volume_m3 ELSE 0 END) as fiscal_volume,
  SUM(CASE WHEN source = 'cash' THEN volume_m3 ELSE 0 END) as cash_volume
FROM (
  SELECT plant_code, category, volume_m3, 'fiscal' as source 
  FROM plant_volumes 
  WHERE month = ? AND year = ?
  
  UNION ALL
  
  SELECT plant_code, category, volume_m3, 'cash' as source 
  FROM cash_sales 
  WHERE month = ? AND year = ?
) combined_volumes
GROUP BY plant_code, category;
```

### UI/UX Considerations

#### Visual Indicators
- **Fiscal Sales**: Blue indicators, "Fiscal" label
- **Cash Sales**: Green indicators, "Cash" label  
- **Combined Totals**: Gray indicators, "Total" label

#### Data Input Flow
1. User selects financial report (sets month/year context)
2. User can input/edit fiscal volumes (existing functionality)
3. User can input/edit cash sales (new functionality)
4. System automatically calculates combined totals
5. Unit costs update in real-time

## Security and Compliance

### Data Security
- Cash sales data encrypted at rest
- Audit trail for all cash sales entries
- User permission controls

### Compliance Considerations
- Clear separation between fiscal and cash sales
- Documentation for audit purposes
- Proper categorization for tax purposes

## Performance Considerations

### Database Performance
- Proper indexing on cash_sales table
- Efficient queries for volume aggregation
- Caching strategies for frequently accessed data

### UI Performance
- Lazy loading for large datasets
- Optimized re-renders for volume calculations
- Debounced input handling

## Future Enhancements

### Phase 7: Advanced Features (Future)
1. **Cash Sales Analytics**: Dedicated analytics for cash sales trends
2. **Bulk Import**: Excel import for historical cash sales data
3. **Automated Calculations**: Smart defaults based on historical ratios
4. **Mobile Support**: Mobile-friendly cash sales input
5. **API Integration**: Integration with POS systems for automatic cash sales capture

### Phase 8: Reporting Enhancements (Future)
1. **Cash vs Fiscal Reports**: Comparative analysis
2. **Volume Efficiency Reports**: Volume utilization analysis
3. **Profitability Analysis**: Margin analysis by sales type
4. **Export Capabilities**: Export cash sales data for external analysis

## Implementation Timeline

### Week 1-2: Database and Data Layer
- Implement database schema
- Create service methods
- Update types and interfaces

### Week 3-4: Core UI Components
- Build cash sales input modal
- Update financial dashboard
- Implement volume calculation logic

### Week 5-6: Integration and Testing
- Integrate with existing systems
- Comprehensive testing
- Performance optimization

### Week 7: Deployment and Documentation
- Production deployment
- User documentation
- Training materials

## Risk Mitigation

### Technical Risks
- **Data Consistency**: Implement proper validation and constraints
- **Performance**: Optimize queries and implement caching
- **UI Complexity**: Maintain clear separation of concerns

### Business Risks
- **User Adoption**: Provide clear training and documentation
- **Data Accuracy**: Implement validation and audit trails
- **Compliance**: Ensure proper categorization and reporting

## Success Metrics

### Technical Success
- All unit tests pass
- Performance benchmarks met
- No data integrity issues

### Business Success
- Users can input cash sales data efficiently
- Unit cost calculations include cash sales volume
- Clear separation between fiscal and cash sales
- Accurate financial reporting

## Conclusion

This implementation plan provides a comprehensive approach to adding cash sales functionality while maintaining the integrity of the existing system. The phased approach allows for iterative development and testing, ensuring a robust and reliable solution.

The key innovation is the integration of cash sales volume into the unit cost calculations, providing more accurate financial metrics while maintaining clear separation between fiscal and cash sales for compliance purposes. 