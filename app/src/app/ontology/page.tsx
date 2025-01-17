'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

import { Alert, AlertDescription } from '@/components/ui/alert'
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
    <main className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Enter Ontology (YAML format)</h1>
      
      {error && (
        <Alert variant="default" className="mb-4 border-red-500 text-red-500 bg-red-50 dark:bg-red-950 dark:border-red-500">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <textarea
        value={ontologyText}
        onChange={(e) => setOntologyText(e.target.value)}
        className="w-full h-[60vh] p-4 border rounded-lg font-mono"
        placeholder="Enter your YAML ontology here..."
        disabled={isSubmitting}
      />
      
      <div className="mt-4 flex justify-end gap-4">
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !ontologyText.trim()}
          className="min-w-[120px]"
        >
          {isSubmitting ? 'Processing...' : 'Next'}
        </Button>
      </div>
    </main>
  )
}