'use client'

import { useState, useEffect } from 'react'
import { useGraphEditorStore } from '@/lib/store/graph-editor-store'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface RelationshipEditorProps {
  relationshipId: string | null
  onClose: () => void
}

export function RelationshipEditor({ relationshipId, onClose }: RelationshipEditorProps) {
  const { graph, updateRelationship } = useGraphEditorStore()
  const [type, setType] = useState('')
  const [properties, setProperties] = useState<Record<string, string>>({})
  const [newPropertyKey, setNewPropertyKey] = useState('')
  const [newPropertyValue, setNewPropertyValue] = useState('')
  const [newPropertyType, setNewPropertyType] = useState('str')
  const [activeTab, setActiveTab] = useState('properties')

  useEffect(() => {
    if (relationshipId && graph.relationships[relationshipId]) {
      const relationship = graph.relationships[relationshipId]
      setType(relationship.type)
      
      // Convert properties to string values for editing
      const stringProps: Record<string, string> = {}
      Object.entries(relationship.properties).forEach(([key, value]) => {
        stringProps[key] = String(value)
      })
      setProperties(stringProps)
    }
  }, [relationshipId, graph.relationships])

  const handleSave = () => {
    if (!relationshipId) return
    
    // Validate relationship type
    if (!type.trim()) {
      alert("Relationship type cannot be empty")
      return
    }
    
    // Convert string properties back to appropriate types
    const typedProperties: Record<string, any> = {}
    Object.entries(properties).forEach(([key, value]) => {
      // Try to convert to number if it looks like a number
      if (/^-?\d+(\.\d+)?$/.test(value)) {
        typedProperties[key] = parseFloat(value)
      } else if (value === 'true' || value === 'false') {
        typedProperties[key] = value === 'true'
      } else {
        typedProperties[key] = value
      }
    })
    
    updateRelationship(relationshipId, {
      type,
      properties: typedProperties
    })
    
    onClose()
  }

  const handleAddProperty = () => {
    if (newPropertyKey.trim() === '') return
    
    setProperties({
      ...properties,
      [newPropertyKey]: newPropertyValue
    })
    
    setNewPropertyKey('')
    setNewPropertyValue('')
    setNewPropertyType('str')
  }

  const handleRemoveProperty = (key: string) => {
    const { [key]: _, ...rest } = properties
    setProperties(rest)
  }

  // Get the source and target node captions for display
  const getNodeInfo = () => {
    if (!relationshipId) return { from: '', to: '' }
    
    const relationship = graph.relationships[relationshipId]
    if (!relationship) return { from: '', to: '' }
    
    const fromNode = graph.nodes[relationship.from]
    const toNode = graph.nodes[relationship.to]
    
    return {
      from: fromNode?.caption || 'Unknown',
      to: toNode?.caption || 'Unknown'
    }
  }

  // Common relationship types from the YAML
  const commonRelationshipTypes = [
    'ABOUT_COMPANY',
    'HAS_BUSINESS',
    'HAS_RISK_FACTOR',
    'HAS_LEGAL_PROCEEDING',
    'HAS_MINE_SAFETY',
    'HAS_SEGMENT',
    'HAS_PRODUCT',
    'HAS_COMPETITION',
    'HAS_RAW_MATERIAL',
    'HAS_INTELLECTUAL_PROPERTY',
    'HAS_RISK_CATEGORY',
    'HAS_CITATION',
    'RELATES_TO'
  ]

  const { from, to } = getNodeInfo()

  return (
    <Dialog open={!!relationshipId} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Relationship</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{from}</div>
            <div className="bg-muted px-2 py-1 rounded-md">{type || 'RELATES_TO'}</div>
            <div className="font-medium text-foreground">{to}</div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <div className="col-span-3">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship type" />
                </SelectTrigger>
                <SelectContent>
                  {commonRelationshipTypes.map(relType => (
                    <SelectItem key={relType} value={relType}>
                      {relType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2">
                <Input
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="Or enter custom type"
                />
              </div>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="preview">YAML Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="properties" className="space-y-4">
              <div className="grid gap-2">
                <Label className="mb-2">Properties</Label>
                
                {Object.entries(properties).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                    <Input value={key} disabled />
                    <Input
                      value={value}
                      onChange={(e) => setProperties({
                        ...properties,
                        [key]: e.target.value
                      })}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProperty(key)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center mt-2">
                  <Input
                    placeholder="Key"
                    value={newPropertyKey}
                    onChange={(e) => setNewPropertyKey(e.target.value)}
                  />
                  <Input
                    placeholder="Value"
                    value={newPropertyValue}
                    onChange={(e) => setNewPropertyValue(e.target.value)}
                  />
                  <Select value={newPropertyType} onValueChange={setNewPropertyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="str">String</SelectItem>
                      <SelectItem value="int">Integer</SelectItem>
                      <SelectItem value="float">Float</SelectItem>
                      <SelectItem value="bool">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddProperty}
                  >
                    +
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview">
              <div className="bg-muted p-4 rounded-md font-mono text-xs whitespace-pre overflow-auto max-h-[300px]">
                {`${from}:
  relationships:
    ${type}:
      target: ${to}${Object.keys(properties).length > 0 ? `
      properties:${Object.entries(properties).map(([key, value]) => {
        // Determine the type
        let type = 'str'
        if (/^-?\d+$/.test(value)) {
          type = 'int'
        } else if (/^-?\d+\.\d+$/.test(value)) {
          type = 'float'
        } else if (value === 'true' || value === 'false') {
          type = 'bool'
        }
        
        return `
        ${key}:
          type: ${type}
          description: ${key}`
      }).join('')}` : ''}
`}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 