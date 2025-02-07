'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BeginnerIcon } from './icons/beginner-icon'
import { ExpertIcon } from './icons/expert-icon'
import { ModeCard } from './mode-card'
import { ComparisonTable } from './comparison-table'
import { cn } from '@/lib/utils'

const cards = [
  {
    title: "Graph Beginner",
    subtitle: "I'm new to Knowledge Graphs",
    icon: <BeginnerIcon />,
    features: [
      "Conversational Interface",
      "Guided Templates",
      "Visual Building",
      "Auto-suggestions"
    ],
    ctaText: "Start Easy Mode"
  },
  {
    title: "Graph Ninja",
    subtitle: "I work with graphs professionally",
    icon: <ExpertIcon />,
    features: [
      "Advanced Controls",
      "Query Interface",
      "Custom Rules",
      "Code Editor"
    ],
    ctaText: "Start Expert Mode"
  }
]

const comparisonData = {
  headers: ["Feature", "Easy Mode", "Expert Mode"],
  rows: [
    {
      feature: "Interface",
      easy: "Conversational",
      expert: "Technical"
    },
    {
      feature: "Templates",
      easy: "Guided Selection",
      expert: "Custom Creation"
    },
    {
      feature: "Controls",
      easy: "Automated",
      expert: "Manual"
    }
  ]
}

export function WelcomeScreen() {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<'easy' | 'expert' | null>(null)

  const handleModeSelect = (mode: 'easy' | 'expert') => {
    setSelectedMode(mode)
    router.push(mode === 'easy' ? '/chat' : '/ontology')
  }

  return (
    <div className="welcome-screen fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm z-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-white rounded-2xl p-4 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              Welcome to Graph-it
            </h1>
            <p className="text-xl text-gray-600">
              Choose Your Path to Knowledge Graph Creation
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 justify-center mb-8">
            {cards.map((card) => (
              <ModeCard
                key={card.title}
                {...card}
                selected={selectedMode === (card.title === "Graph Beginner" ? 'easy' : 'expert')}
                onClick={() => handleModeSelect(card.title === "Graph Beginner" ? 'easy' : 'expert')}
              />
            ))}
          </div>

          <ComparisonTable
            headers={comparisonData.headers}
            rows={comparisonData.rows}
          />
        </div>
      </div>
    </div>
  )
}
