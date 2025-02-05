'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WorkflowLayout } from '@/components/workflow-layout'
import { OntologyBuilder } from '@/components/ontology-builder'
import type { OntologyResponse } from '@/types/api'

export default function OntologyPage() {
  const router = useRouter()
  const { user } = useUser()
  const [ontologyYaml, setOntologyYaml] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/ontology', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: ontologyYaml
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit ontology')
      }

      const data = await response.json()
      
      if (data.id) {
        router.push(`/transform?session_id=${data.id}`)
      } else {
        setError('Failed to create session')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <WorkflowLayout>
      <div className="container mx-auto p-4 max-w-6xl flex-1">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Visual Ontology Builder</h1>
            <p className="text-gray-500 mt-2">
              Build your ontology schema visually. The preview on the right shows the generated YAML format that will be used to structure your graph data.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <OntologyBuilder onValidYamlChange={setOntologyYaml} />
          
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !ontologyYaml.trim()}
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