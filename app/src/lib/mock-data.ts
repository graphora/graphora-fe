import type { GraphData } from '@/types/graph'

export const mockGraphData: GraphData = {
  nodes: [
    { id: '1', label: 'Person: John Doe', type: 'Person', properties: { age: 30 } },
    { id: '2', label: 'Company: Acme Corp', type: 'Company', properties: { founded: 1999 } },
    { id: '3', label: 'Project: Alpha', type: 'Project', properties: { status: 'active' } },
    { id: '4', label: 'Document: Report', type: 'Document', properties: { date: '2024-03-15' } },
  ],
  edges: [
    { source: '1', target: '2', label: 'WORKS_AT', properties: { since: 2020 } },
    { source: '1', target: '3', label: 'MANAGES', properties: { role: 'Project Lead' } },
    { source: '3', target: '4', label: 'CONTAINS', properties: { type: 'documentation' } },
    { source: '2', target: '3', label: 'OWNS', properties: {} },
  ]
}

// Simulate processing delay and progress updates
export const simulateProcessing = async (
  onProgress: (progress: number) => void
): Promise<GraphData> => {
  const steps = [10, 25, 45, 60, 75, 90, 100]
  
  for (const progress of steps) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    onProgress(progress)
  }

  return mockGraphData
} 