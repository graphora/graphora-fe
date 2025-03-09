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

interface NodeEditorProps {
  nodeId: string | null
  onClose: () => void
}

export function NodeEditor({ nodeId, onClose }: NodeEditorProps) {
  const { graph, updateNode } = useGraphEditorStore()
  const [caption, setCaption] = useState('')
  const [properties, setProperties] = useState<Record<string, string>>({})
  const [newPropertyKey, setNewPropertyKey] = useState('')
  const [newPropertyValue, setNewPropertyValue] = useState('')
  const [newPropertyType, setNewPropertyType] = useState('str')
  const [activeTab, setActiveTab] = useState('properties')

  useEffect(() => {
    if (nodeId && graph.nodes[nodeId]) {
      const node = graph.nodes[nodeId]
      setCaption(node.caption)
      
      // Convert properties to string values for editing
      const stringProps: Record<string, string> = {}
      Object.entries(node.properties).forEach(([key, value]) => {
        stringProps[key] = String(value)
      })
      setProperties(stringProps)
    }
  }, [nodeId, graph.nodes])

  const handleSave = () => {
    if (!nodeId) return
    
    // Validate entity name
    if (!caption.trim()) {
      alert("Entity name cannot be empty")
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
    
    updateNode(nodeId, {
      caption,
      properties: typedProperties
    })
    
    onClose()
  }

  const handleAddProperty = () => {
    if (newPropertyKey.trim() === '') return
    
    // Convert value based on selected type
    let typedValue = newPropertyValue
    if (newPropertyType === 'int') {
      typedValue = parseInt(newPropertyValue, 10).toString()
    } else if (newPropertyType === 'float') {
      typedValue = parseFloat(newPropertyValue).toString()
    } else if (newPropertyType === 'bool') {
      typedValue = newPropertyValue.toLowerCase() === 'true' ? 'true' : 'false'
    }
    
    setProperties({
      ...properties,
      [newPropertyKey]: typedValue
    })
    
    setNewPropertyKey('')
    setNewPropertyValue('')
    setNewPropertyType('str')
  }

  const handleRemoveProperty = (key: string) => {
    const { [key]: _, ...rest } = properties
    setProperties(rest)
  }

  // Common property names from the YAML
  const commonPropertyNames = [
    'name',
    'description',
    'type'
  ]

  return (
    <Dialog open={!!nodeId} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogTitle>Edit Node</DialogTitle>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="caption" className="text-right">
              Entity Name
            </Label>
            <Input
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="col-span-3"
            />
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
                  <Select 
                    value={newPropertyKey || ''} 
                    onValueChange={setNewPropertyKey}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonPropertyNames.map(propName => (
                        <SelectItem key={propName} value={propName}>
                          {propName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {`${caption}:
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
  }).join('')}
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