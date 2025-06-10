'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BeginnerIcon } from './icons/beginner-icon'
import { ExpertIcon } from './icons/expert-icon'
import { ModeCard } from './mode-card'
import { ComparisonTable } from './comparison-table'
import { ConfigCheck } from '@/components/config/config-check'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'

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
    ctaText: "Coming Soon"
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
    <ConfigCheck requireConfig={true}>
      <div className="welcome-screen fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="bg-background border border-border rounded-2xl p-4 shadow-xl">
            <div className="text-center max-w-2xl mx-auto space-y-8">
              {/* Logo and Brand */}
              <div className="flex flex-col items-center space-y-4">
                <div className="w-24 h-24 flex items-center justify-center overflow-hidden mb-4">
                  <Logo 
                    width={96}
                    height={96}
                    className="w-full h-full"
                  />
                </div>
                <h1 className="text-5xl font-bold text-foreground tracking-tight">
                  Welcome to Graphora
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Transform your unstructured data into powerful knowledge graphs with our AI-powered platform
                </p>
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4 text-foreground">
                Choose Your Path to Knowledge Graph Creation
              </h2>
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
    </ConfigCheck>
  )
}
