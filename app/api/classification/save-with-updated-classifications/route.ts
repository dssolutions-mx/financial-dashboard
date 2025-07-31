import { NextRequest, NextResponse } from 'next/server'
import { DynamicClassificationManager } from '@/lib/services/dynamic-classification-manager'

export async function POST(request: NextRequest) {
  try {
    const {
      data,
      reportName,
      fileName,
      month,
      year
    } = await request.json()

    // Validate required fields
    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    if (!reportName || !fileName || !month || !year) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Initialize the classification manager
    const classificationManager = new DynamicClassificationManager()

    // Save data with updated classifications
    const result = await classificationManager.saveDataWithUpdatedClassifications(
      data,
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
    console.error('Error saving data with updated classifications:', error)
    return NextResponse.json(
      { error: 'Failed to save data with updated classifications' },
      { status: 500 }
    )
  }
} 