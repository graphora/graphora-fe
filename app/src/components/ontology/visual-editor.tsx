'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOntologyEditorStore } from '@/lib/store/ontology-editor-store'
import { TreeView } from './tree-view'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AddEntityModal } from './add-entity-modal'
import { AddRelationshipModal } from './add-relationship-modal'
import { GraphView } from './graph-view'

export function VisualEditor() {
  const { ontology, updateFromOntology } = useOntologyEditorStore()
  const [activeView, setActiveView] = useState('tree')
  const [isAddEntityOpen, setIsAddEntityOpen] = useState(false)
  const [isAddRelationshipOpen, setIsAddRelationshipOpen] = useState(false)

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddEntityOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Entity
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddRelationshipOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Relationship
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="tree">Tree View</TabsTrigger>
          <TabsTrigger value="graph">Graph View</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="tree" className="h-full m-0">
            <TreeView 
              ontology={ontology} 
              onChange={updateFromOntology}
            />
          </TabsContent>
          
          <TabsContent value="graph" className="h-full m-0">
            <GraphView 
              ontology={ontology}
              onChange={updateFromOntology}
            />
          </TabsContent>
        </div>
      </Tabs>

      <AddEntityModal
        isOpen={isAddEntityOpen}
        onClose={() => setIsAddEntityOpen(false)}
      />

      <AddRelationshipModal
        isOpen={isAddRelationshipOpen}
        onClose={() => setIsAddRelationshipOpen(false)}
      />
    </div>
  )
}
