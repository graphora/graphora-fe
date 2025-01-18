'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WorkflowLayout } from '@/components/workflow-layout'
import { Textarea } from '@/components/ui/textarea'
import type { OntologyResponse } from '@/types/api'

export default function OntologyPage() {
  const router = useRouter()
  const { user } = useUser()
  const [ontologyText, setOntologyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/ontology', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          ontologyText,
        }),
      })

      const data: OntologyResponse = await response.json()

      if (!response.ok || data.status === 'error') {
        throw new Error(data.error || 'Failed to process ontology')
      }

      if (!data.id) {
        throw new Error('Invalid ontology: Missing ontology ID in response')
      }

      // Store ontology data and ID for persistence
      localStorage.setItem('ontologyData', ontologyText)
      localStorage.setItem('ontologyId', data.id)
      
      // Navigate to next page
      router.push('/transform')
    } catch (error) {
      console.error('Error processing ontology:', error)
      setError(error instanceof Error ? error.message : 'Failed to process ontology')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <WorkflowLayout>
      <div className="container mx-auto p-4 max-w-4xl flex-1">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Enter Ontology (YAML format)</h1>
            <p className="text-gray-500 mt-2">
              Define your ontology schema in YAML format. This will be used to structure your graph data.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Textarea
            value={ontologyText}
            onChange={(e) => setOntologyText(e.target.value)}
            className="min-h-[60vh] font-mono"
            placeholder="Enter your YAML ontology here..."
            disabled={isSubmitting}
          />
          
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !ontologyText.trim()}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Next'
              )}
            </Button>
          </div>
        </div>
      </div>
    </WorkflowLayout>
  )
}