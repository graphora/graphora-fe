'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { AutoMergeFlow } from '@/components/auto-merge-flow'
import { WorkflowLayout } from '@/components/workflow-layout'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function AutoMergePage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const searchParams = useSearchParams()

  const sessionId = searchParams.get('session_id') || ''
  const transformId = searchParams.get('transform_id') || ''
  const mergeId = searchParams.get('merge_id') || undefined

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
    }
  }, [isLoaded, user, router])

  if (!sessionId || !transformId) {
    return (
      <WorkflowLayout
        title="Automatic Merge"
        description="Streamlined merge process for conflict-free changes"
      >
        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
            <h3 className="text-amber-800 font-medium">Missing Parameters</h3>
            <p className="text-amber-700 mt-1">
              Session ID and Transform ID are required to start a merge process.
            </p>
          </div>
        </div>
      </WorkflowLayout>
    )
  }

  return (
    <WorkflowLayout
      title="Automatic Merge"
      description="Streamlined merge process for conflict-free changes"
    >
      <div className="p-6">
        <AutoMergeFlow
          sessionId={sessionId}
          transformId={transformId}
          mergeId={mergeId}
          onComplete={() => {
            // Handle completion, e.g., redirect to dashboard
          }}
        />
      </div>
    </WorkflowLayout>
  )
} 