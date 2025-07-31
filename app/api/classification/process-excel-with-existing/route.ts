import { NextRequest, NextResponse } from 'next/server'
import { DynamicClassificationManager } from '@/lib/services/dynamic-classification-manager'

export async function POST(request: NextRequest) {
  try {
    const {
      processedData,
      reportName,
      fileName,
      month,
      year
    } = await request.json()

    // Validate required fields
    if (!processedData || !Array.isArray(processedData)) {
      return NextResponse.json({ error: 'Invalid processed data' }, { status: 400 })
    }

    if (!reportName || !fileName || !month || !year) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Initialize the classification manager
    const classificationManager = new DynamicClassificationManager()

    // Process Excel with existing classifications
    const result = await classificationManager.processExcelWithExistingClassifications(
      processedData,
      reportName,
      fileName,
      month,
      year
    )

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Error processing Excel with existing classifications:', error)
    return NextResponse.json(
      { error: 'Failed to process Excel with existing classifications' },
      { status: 500 }
    )
  }
} 