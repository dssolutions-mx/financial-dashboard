# Plant Volume Data Implementation

## Overview

This implementation adds persistent storage for plant volume data (cubic meters) to the financial dashboard, allowing users to save and reuse volume information across different reports and sessions.

## Features Implemented

### 1. Database Schema

**New Table: `plant_volumes`**
```sql
CREATE TABLE plant_volumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_code VARCHAR(50) NOT NULL,
  business_unit VARCHAR(50) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  category VARCHAR(100) NOT NULL,
  volume_m3 NUMERIC(12,3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plant_code, month, year, category)
);
```

**Key Features:**
- Unique constraint prevents duplicate entries for the same plant/month/year/category
- Supports three volume categories: "Ventas Concreto", "Ventas Bombeo", "Productos Alternativos"
- Automatic business unit mapping based on plant code
- Row Level Security (RLS) enabled

### 2. Storage Service Extensions

**New Interface: `PlantVolume`**
```typescript
export interface PlantVolume {
  id: string
  plant_code: string
  business_unit: string
  month: number
  year: number
  category: string
  volume_m3: number
  created_at: string
  updated_at: string
}
```

**New Methods Added to `SupabaseStorageService`:**
- `saveOrUpdatePlantVolume()` - Upsert individual volume record
- `getPlantVolumes()` - Get volumes for specific month/year
- `getPlantVolumesGrouped()` - Get volumes grouped by category and plant
- `bulkSavePlantVolumes()` - Save multiple volume records
- `deletePlantVolume()` - Delete individual volume record
- `getAvailableVolumePeriods()` - Get all months/years with volume data

### 3. UI Enhancements

**Volume Data Controls Panel:**
- Displays current month/year when a report is selected
- Shows loading states during data fetch/save operations
- Save button to persist volume changes
- Unsaved changes indicator

**Volume Categories Legend:**
- Visual guide showing the three supported categories
- Color-coded indicators for easy identification
- Explanatory text for each category

**Enhanced Volume Input:**
- Support for "Productos Alternativos" category
- Automatic volume data loading when reports are selected
- Real-time change tracking

### 4. Data Flow

**When Loading a Report:**
1. Report is selected from the database
2. Month/year is extracted from the report metadata
3. Volume data for that period is automatically loaded
4. Volume inputs are populated with saved data

**When Saving Volume Data:**
1. User enters cubic meters for different categories/plants
2. Changes are tracked in real-time
3. User clicks "Guardar Volúmenes" button
4. Data is bulk-saved to the database using upsert operations
5. Success/error feedback is provided via toast notifications

## Volume Categories

### 1. Ventas Concreto
- **Purpose:** Track cubic meters of concrete sold
- **Usage:** Used for calculating unit costs for materials and operational expenses
- **Display:** Blue indicator in legend

### 2. Ventas Bombeo  
- **Purpose:** Track cubic meters of pumping service provided
- **Usage:** Combined with concrete volume for operational cost calculations
- **Display:** Green indicator in legend

### 3. Productos Alternativos
- **Purpose:** Track volume/units of alternative products and services
- **Usage:** Additional revenue streams and service tracking
- **Display:** Purple indicator in legend

## Business Logic

### Plant to Business Unit Mapping
```typescript
const plantToUnit: Record<string, string> = {
  P1: "BAJIO",
  P2: "VIADUCTO", 
  P3: "ITISA",
  P4: "VIADUCTO",
  P5: "BAJIO",
  "SIN CLASIFICACION": "OTROS"
}
```

### Unit Cost Calculations
- **Material Costs:** Calculated against concrete volume only
- **Operational Costs:** Calculated against combined concrete + bombeo volume
- **Alternative Products:** Tracked separately for revenue analysis

## Database Performance

**Indexes Created:**
- `idx_plant_volumes_lookup`: Optimizes queries by plant_code, month, year, category
- `idx_plant_volumes_business_unit`: Optimizes queries by business unit and period

**RLS Policies:**
- Currently allows all operations (can be restricted per user/tenant in future)

## Integration Points

### With Financial Reports
- Volume data is automatically loaded when financial reports are selected
- Month/year context is maintained throughout the session
- New reports automatically set the volume data context

### With Unit Price Calculations
- Persisted volume data is used for real-time unit cost calculations
- Supports both individual plant and aggregate calculations
- Handles different calculation methods for different cost categories

### With Validation System
- Volume data context is set when reports are approved through validation
- Integrates with the existing report approval workflow

## Error Handling

- **Database Errors:** Proper error catching and user-friendly messages
- **Validation:** Input validation for numeric values and required fields
- **Network Issues:** Loading states and retry capabilities
- **Data Conflicts:** Upsert operations handle duplicate records gracefully

## Testing Data

Sample data has been inserted for testing:
```sql
-- January 2024 test data
P1 (BAJIO): Concreto=1500.5, Bombeo=300.25, Alt=150.0
P2 (VIADUCTO): Concreto=2200.75, Bombeo=450.0
```

## Future Enhancements

1. **Bulk Import:** Excel import functionality for volume data
2. **Historical Analytics:** Trend analysis across periods
3. **Volume Forecasting:** Predictive analytics based on historical data
4. **Template System:** Save volume templates for recurring patterns
5. **Multi-Currency:** Support for different measurement units
6. **Audit Trail:** Track changes to volume data over time

## Migration Notes

- Existing financial reports are not affected
- Volume data is optional - dashboard works without volume data
- Backward compatibility maintained with existing workflows
- No breaking changes to existing API endpoints

## Security Considerations

- RLS enabled on plant_volumes table
- All database operations use parameterized queries
- User input validation and sanitization
- Error messages don't expose sensitive database information

## Monitoring and Maintenance

- Database indexes should be monitored for performance
- Volume data growth should be tracked over time
- Regular cleanup of old volume data may be needed
- Backup strategies should include volume data

This implementation provides a robust foundation for persistent volume data management while maintaining the flexibility and performance of the existing financial dashboard system. 