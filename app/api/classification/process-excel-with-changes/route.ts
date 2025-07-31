import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DynamicClassificationManager, ClassificationChange } from '@/lib/services/dynamic-classification-manager'

export async function POST(request: NextRequest) {
  try {
    const {
      processedData,
      userChanges,
      reportName,
      fileName,
      month,
      year,
      userId
    } = await request.json()

    // Validate required fields
    if (!processedData || !Array.isArray(processedData)) {
      return NextResponse.json({ error: 'Invalid processed data' }, { status: 400 })
    }

    if (!userChanges || !Array.isArray(userChanges)) {
      return NextResponse.json({ error: 'Invalid user changes' }, { status: 400 })
    }

    if (!reportName || !fileName || !month || !year || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Initialize the classification manager
    const classificationManager = new DynamicClassificationManager()

    // Execute the complete workflow
    const result = await classificationManager.processExcelWithUserChanges(
      processedData,
      userChanges,
      reportName,
      fileName,
      month,
      year,
      userId
    )

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Error processing Excel with classification changes:', error)
    return NextResponse.json(
      { error: 'Failed to process Excel with classification changes' },
      { status: 500 }
    )
  }
} 