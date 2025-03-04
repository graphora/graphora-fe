'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface AutoMergeCardProps {
  sessionId?: string
  transformId?: string
  className?: string
}

export function AutoMergeCard({ sessionId, transformId, className }: AutoMergeCardProps) {
  const router = useRouter()

  const handleStartAutoMerge = () => {
    if (sessionId && transformId) {
      router.push(`/merge/auto?session_id=${sessionId}&transform_id=${transformId}`)
    } else {
      // If no session/transform IDs are provided, just go to the auto merge page
      router.push('/merge/auto')
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Automatic Merge
        </CardTitle>
        <CardDescription>
          Streamlined merge process for conflict-free changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          When no conflicts are detected, this process automatically completes the merge without requiring manual intervention.
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm">Automatic conflict detection</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm">Streamlined progress tracking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm">Auto-continue processing</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleStartAutoMerge} className="w-full">
          Start Automatic Merge
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
} 