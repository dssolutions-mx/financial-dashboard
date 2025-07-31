import { NextRequest, NextResponse } from 'next/server'
import { DynamicClassificationManager } from '@/lib/services/dynamic-classification-manager'

export async function POST(request: NextRequest) {
  try {
    const {
      changes,
      userId
    } = await request.json()

    // Validate required fields
    if (!changes || !Array.isArray(changes)) {
      return NextResponse.json({ error: 'Invalid changes' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
    }

    // Initialize the classification manager
    const classificationManager = new DynamicClassificationManager()

    // Update classification rules for future use
    const result = await classificationManager.updateClassificationRulesForFutureUse(
      changes,
      userId
    )

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Error updating classification rules for future use:', error)
    return NextResponse.json(
      { error: 'Failed to update classification rules for future use' },
      { status: 500 }
    )
  }
} 