import { NextRequest, NextResponse } from 'next/server'
import { DynamicClassificationManager } from '@/lib/services/dynamic-classification-manager'

export async function POST(request: NextRequest) {
  try {
    const {
      userChanges,
      userId
    } = await request.json()

    // Validate required fields
    if (!userChanges || !Array.isArray(userChanges)) {
      return NextResponse.json({ error: 'Invalid user changes' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
    }

    // Initialize the classification manager
    const classificationManager = new DynamicClassificationManager()

    // Apply user classification changes
    const result = await classificationManager.applyUserClassificationChanges(
      userChanges,
      userId
    )

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Error applying user classification changes:', error)
    return NextResponse.json(
      { error: 'Failed to apply user classification changes' },
      { status: 500 }
    )
  }
} 