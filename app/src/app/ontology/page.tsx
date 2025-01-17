'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

export default function OntologyPage() {
  const { user } = useUser()
  const [ontologyText, setOntologyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      const response = await fetch('YOUR_API_ENDPOINT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          ontologyText,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit ontology')
      }

      // Handle success (e.g., show a success message)
      alert('Ontology submitted successfully')
      setOntologyText('')
    } catch (error) {
      console.error('Error submitting ontology:', error)
      alert('Failed to submit ontology')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Enter Ontology (YAML format)</h1>
      <textarea
        value={ontologyText}
        onChange={(e) => setOntologyText(e.target.value)}
        className="w-full h-[60vh] p-4 border rounded-lg font-mono"
        placeholder="Enter your YAML ontology here..."
      />
      <div className="mt-4">
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !ontologyText.trim()}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Ontology'}
        </Button>
      </div>
    </main>
  )
} 