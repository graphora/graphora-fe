'use client'

import { useState, useEffect } from 'react'
import { useGraphEditorStore, PropertyDefinition, CanonicalizationOptions } from '@/lib/store/graph-editor-store'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Trash2 } from 'lucide-react'

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[NodeEditor]', ...args)
  }
}
const debugWarn = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.warn('[NodeEditor]', ...args)
  }
}

interface NodeEditorProps {
  nodeId: string | null
  onClose: () => void
}

const defaultPropertyDefinition: Omit<PropertyDefinition, 'type'> = {
   description: '',
   unique: false,
   required: false,
   index: false
}

export function NodeEditor({ nodeId, onClose }: NodeEditorProps) {
  const { graph, updateNode } = useGraphEditorStore()
  const [caption, setCaption] = useState('')
  const [properties, setProperties] = useState<Record<string, PropertyDefinition>>({})
  const [newPropertyKey, setNewPropertyKey] = useState('')
  const [newPropertyDef, setNewPropertyDef] = useState<PropertyDefinition>({
      type: 'str',
      ...defaultPropertyDefinition
  })

  useEffect(() => {
    if (nodeId && graph.nodes[nodeId]) {
      const node = graph.nodes[nodeId]
      setCaption(node.caption)
      
      const initialProperties: Record<string, PropertyDefinition> = {};
      for (const key in node.properties) {
          const prop = node.properties[key];
          if (prop && typeof prop === 'object') { 
             initialProperties[key] = {
                ...prop, 
                type: prop.type || 'str', 
                description: prop.description || '',
                unique: prop.unique || false,
                required: prop.required || false,
                index: prop.index || false
             };
          } else {
             debugWarn(`Malformed property data for ${key} on node ${nodeId}:`, prop)
             initialProperties[key] = {
                type: 'str',
                ...defaultPropertyDefinition,
                description: `Malformed: ${JSON.stringify(prop)}` 
             };
          }
      }
      setProperties(initialProperties)
    } else {
      setCaption('');
      setProperties({});
    }
  }, [nodeId, graph.nodes])

  const handleSave = () => {
    if (!nodeId) return
    if (!caption.trim()) {
      alert("Entity name cannot be empty")
      return
    }
    
    let finalProperties = { ...properties };

    // Check if a new property is staged and valid
    const newKey = newPropertyKey.trim();
    if (newKey !== '' && !finalProperties[newKey]) {
      debug('Including staged new property:', newKey)
       finalProperties[newKey] = newPropertyDef;
       // Clear the new property form after including it
       setNewPropertyKey('');
       setNewPropertyDef({ type: 'str', ...defaultPropertyDefinition }); 
    } else if (newKey !== '' && finalProperties[newKey]) {
      debugWarn('New property key already exists, not adding automatically on save:', newKey)
       // Optionally alert the user?
       // alert(`Property "${newKey}" already exists. Please use the Add button or change the name.`);
    }
    
    updateNode(nodeId, {
      caption,
      properties: finalProperties // Save potentially updated properties object
    })
    onClose()
  }

  const handlePropertyChange = (key: string, field: keyof PropertyDefinition, value: any) => {
    setProperties(prevProps => ({
      ...prevProps,
      [key]: {
        ...prevProps[key],
        [field]: value
      }
    }))
  }

  const updateCanonicalizationForProperty = (
    key: string,
    updater: (current: CanonicalizationOptions) => CanonicalizationOptions | undefined
  ) => {
    setProperties(prevProps => {
      const existing = prevProps[key]
      if (!existing) return prevProps

      const current = existing.canonicalization ? { ...existing.canonicalization } : {}
      const nextCanonical = updater(current)

      const updated: PropertyDefinition = {
        ...existing,
      }

      if (nextCanonical && Object.keys(nextCanonical).length > 0) {
        updated.canonicalization = nextCanonical
      } else {
        delete updated.canonicalization
      }

      return {
        ...prevProps,
        [key]: updated
      }
    })
  }

  const handleCanonicalizationToggle = (
    key: string,
    field: keyof CanonicalizationOptions,
    checked: boolean
  ) => {
    updateCanonicalizationForProperty(key, (current) => {
      const next = { ...current }
      if (checked) {
        next[field] = true
      } else {
        delete next[field]
      }
      return next
    })
  }

  const handleCanonicalizationSuffixes = (key: string, value: string) => {
    const suffixes = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

    updateCanonicalizationForProperty(key, (current) => {
      const next = { ...current }
      if (suffixes.length > 0) {
        next.strip_suffixes = suffixes
      } else {
        delete next.strip_suffixes
      }
      return next
    })
  }

  const handleNewCanonicalizationToggle = (
    field: keyof CanonicalizationOptions,
    checked: boolean
  ) => {
    setNewPropertyDef((prev) => {
      const current = prev.canonicalization ? { ...prev.canonicalization } : {}
      if (checked) {
        current[field] = true
      } else {
        delete current[field]
      }
      const nextCanonical = Object.keys(current).length > 0 ? current : undefined
      return {
        ...prev,
        canonicalization: nextCanonical,
      }
    })
  }

  const handleNewCanonicalizationSuffixes = (value: string) => {
    const suffixes = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

    setNewPropertyDef((prev) => {
      const current = prev.canonicalization ? { ...prev.canonicalization } : {}
      if (suffixes.length > 0) {
        current.strip_suffixes = suffixes
      } else {
        delete current.strip_suffixes
      }
      const nextCanonical = Object.keys(current).length > 0 ? current : undefined
      return {
        ...prev,
        canonicalization: nextCanonical,
      }
    })
  }

  const handlePropertyKeyChange = (oldKey: string, newKey: string) => {
     if (newKey && newKey !== oldKey && !properties[newKey]) {
        setProperties(prevProps => {
           const { [oldKey]: value, ...rest } = prevProps;
           return {
              ...rest,
              [newKey]: value
           };
        });
     } else if (newKey === '') {
        debug('Key cleared, property remains for now')
     }
  }

  const handleAddProperty = () => {
    const key = newPropertyKey.trim()
    if (key === '' || properties[key]) {
       alert(key === '' ? "Property name cannot be empty." : `Property "${key}" already exists.`);
       return;
    }
    
    setProperties({
      ...properties,
      [key]: newPropertyDef
    })
    
    setNewPropertyKey('')
    setNewPropertyDef({ type: 'str', ...defaultPropertyDefinition })
  }

  const handleRemoveProperty = (key: string) => {
    setProperties(prevProps => {
        const { [key]: _, ...rest } = prevProps;
        return rest;
    });
  }

  return (
    <Dialog open={!!nodeId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col bg-background border-border">
        <DialogHeader className="bg-background">
           <DialogTitle className="text-foreground">Edit Entity: {caption || '...'}</DialogTitle>
           <DialogDescription className="text-muted-foreground">
               Modify the entity name and its properties.
           </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="caption" className="text-right">
              Name
            </Label>
            <Input
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="col-span-3"
              placeholder="Enter entity name"
            />
          </div>

          <Separator />

          <div>
             <h3 className="text-lg font-medium mb-4">Properties</h3>
             <div className="space-y-5">
                {Object.entries(properties).map(([key, propDef]) => (
                   <div key={key} className="p-4 border rounded-md space-y-3 relative group">
                       <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-1 right-1 h-6 w-6 opacity-50 group-hover:opacity-100" 
                          onClick={() => handleRemoveProperty(key)}
                          aria-label="Remove property"
                       >
                          <Trash2 className="h-4 w-4" />
                       </Button>
                      <div className="grid grid-cols-4 items-center gap-4">
                         <Label className="text-right">Name</Label>
                         <Input 
                            value={key} 
                            onChange={(e) => handlePropertyKeyChange(key, e.target.value)}
                            placeholder="Property name"
                            className="col-span-3"
                         />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                         <Label className="text-right">Type</Label>
                         <Select 
                            value={propDef.type} 
                            onValueChange={(value) => handlePropertyChange(key, 'type', value)}
                         >
                            <SelectTrigger className="col-span-3">
                               <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                               <SelectItem value="str">String</SelectItem>
                               <SelectItem value="int">Integer</SelectItem>
                               <SelectItem value="float">Float</SelectItem>
                               <SelectItem value="bool">Boolean</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>
                      <div className="grid grid-cols-4 items-start gap-4">
                         <Label className="text-right pt-2">Description</Label>
                         <Textarea
                            value={propDef.description || ''}
                            onChange={(e) => handlePropertyChange(key, 'description', e.target.value)}
                            placeholder="Enter description (optional)"
                            className="col-span-3 min-h-[60px]"
                         />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                         <span className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">Attributes</span>
                         <div className="col-span-3 flex flex-wrap gap-x-4 gap-y-2 items-center">
                            <div className="flex items-center space-x-2">
                               <Checkbox 
                                   id={`unique-${key}`} 
                                   checked={propDef.unique || false} 
                                   onCheckedChange={(checked) => handlePropertyChange(key, 'unique', !!checked)}
                                />
                                <Label htmlFor={`unique-${key}`} className="text-sm font-normal cursor-pointer">Unique</Label>
                             </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox 
                                   id={`required-${key}`} 
                                   checked={propDef.required || false} 
                                   onCheckedChange={(checked) => handlePropertyChange(key, 'required', !!checked)}
                                />
                                <Label htmlFor={`required-${key}`} className="text-sm font-normal cursor-pointer">Required</Label>
                             </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                   id={`index-${key}`} 
                                   checked={propDef.index || false} 
                                   onCheckedChange={(checked) => handlePropertyChange(key, 'index', !!checked)}
                                />
                                <Label htmlFor={`index-${key}`} className="text-sm font-normal cursor-pointer">Index</Label>
                            </div>
                         </div>
                      </div>
                      <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-1">Canonicalisation</Label>
                        <div className="col-span-3 space-y-3 text-sm">
                          <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`canon-strip-punct-${key}`}
                                checked={!!properties[key].canonicalization?.strip_punctuation}
                                onCheckedChange={(checked) =>
                                  handleCanonicalizationToggle(key, 'strip_punctuation', !!checked)
                                }
                              />
                              <Label htmlFor={`canon-strip-punct-${key}`} className="text-sm font-normal cursor-pointer">
                                Strip punctuation
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`canon-remove-alnum-${key}`}
                                checked={!!properties[key].canonicalization?.remove_non_alnum}
                                onCheckedChange={(checked) =>
                                  handleCanonicalizationToggle(key, 'remove_non_alnum', !!checked)
                                }
                              />
                              <Label htmlFor={`canon-remove-alnum-${key}`} className="text-sm font-normal cursor-pointer">
                                Remove non-alphanumeric
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`canon-strip-company-${key}`}
                                checked={!!properties[key].canonicalization?.strip_company_suffixes}
                                onCheckedChange={(checked) =>
                                  handleCanonicalizationToggle(key, 'strip_company_suffixes', !!checked)
                                }
                              />
                              <Label htmlFor={`canon-strip-company-${key}`} className="text-sm font-normal cursor-pointer">
                                Strip common company suffixes
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`canon-preserve-case-${key}`}
                                checked={!!properties[key].canonicalization?.preserve_case}
                                onCheckedChange={(checked) =>
                                  handleCanonicalizationToggle(key, 'preserve_case', !!checked)
                                }
                              />
                              <Label htmlFor={`canon-preserve-case-${key}`} className="text-sm font-normal cursor-pointer">
                                Preserve original case
                              </Label>
                            </div>
                          </div>
                          <div className="grid grid-cols-5 items-center gap-2">
                            <span className="text-muted-foreground col-span-2">Custom suffixes</span>
                            <Input
                              value={(properties[key].canonicalization?.strip_suffixes || []).join(', ')}
                              onChange={(e) => handleCanonicalizationSuffixes(key, e.target.value)}
                              placeholder="e.g. Inc, GmbH"
                              className="col-span-3"
                            />
                          </div>
                        </div>
                      </div>
                  </div>
               ))}
            </div>
         </div>

          <Separator />

          <div>
             <h3 className="text-lg font-medium mb-4">Add New Property</h3>
             <div className="p-4 border rounded-md space-y-3 border-dashed">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-prop-name" className="text-right">Name</Label>
                    <Input
                       id="new-prop-name"
                       placeholder="New property name"
                       value={newPropertyKey}
                       onChange={(e) => setNewPropertyKey(e.target.value)}
                       className="col-span-3"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                   <Label htmlFor="new-prop-type" className="text-right">Type</Label>
                   <Select 
                      value={newPropertyDef.type} 
                      onValueChange={(value) => setNewPropertyDef(prev => ({ ...prev, type: value }))}
                   >
                      <SelectTrigger id="new-prop-type" className="col-span-3">
                         <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="str">String</SelectItem>
                         <SelectItem value="int">Integer</SelectItem>
                         <SelectItem value="float">Float</SelectItem>
                         <SelectItem value="bool">Boolean</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                   <Label htmlFor="new-prop-desc" className="text-right pt-2">Description</Label>
                   <Textarea
                      id="new-prop-desc"
                      value={newPropertyDef.description || ''}
                      onChange={(e) => setNewPropertyDef(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter description (optional)"
                      className="col-span-3 min-h-[60px]"
                   />
                </div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">Attributes</span>
                  <div className="col-span-3 flex flex-wrap gap-x-4 gap-y-2 items-center">
                      <div className="flex items-center space-x-2">
                         <Checkbox 
                             id="new-unique" 
                             checked={newPropertyDef.unique || false} 
                             onCheckedChange={(checked) => setNewPropertyDef(prev => ({ ...prev, unique: !!checked }))}
                          />
                          <Label htmlFor="new-unique" className="text-sm font-normal cursor-pointer">Unique</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                          <Checkbox 
                             id="new-required" 
                             checked={newPropertyDef.required || false} 
                             onCheckedChange={(checked) => setNewPropertyDef(prev => ({ ...prev, required: !!checked }))}
                          />
                          <Label htmlFor="new-required" className="text-sm font-normal cursor-pointer">Required</Label>
                       </div>
                      <div className="flex items-center space-x-2">
                         <Checkbox 
                            id="new-index" 
                            checked={newPropertyDef.index || false} 
                            onCheckedChange={(checked) => setNewPropertyDef(prev => ({ ...prev, index: !!checked }))}
                         />
                         <Label htmlFor="new-index" className="text-sm font-normal cursor-pointer">Index</Label>
                      </div>
                  </div>
               </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <span className="text-right text-sm font-medium text-gray-700 dark:text-gray-300 pt-1">Canonicalisation</span>
                  <div className="col-span-3 space-y-3 text-sm">
                    <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="new-canon-strip-punct"
                          checked={!!newPropertyDef.canonicalization?.strip_punctuation}
                          onCheckedChange={(checked) => handleNewCanonicalizationToggle('strip_punctuation', !!checked)}
                        />
                        <Label htmlFor="new-canon-strip-punct" className="text-sm font-normal cursor-pointer">
                          Strip punctuation
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="new-canon-remove-alnum"
                          checked={!!newPropertyDef.canonicalization?.remove_non_alnum}
                          onCheckedChange={(checked) => handleNewCanonicalizationToggle('remove_non_alnum', !!checked)}
                        />
                        <Label htmlFor="new-canon-remove-alnum" className="text-sm font-normal cursor-pointer">
                          Remove non-alphanumeric
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="new-canon-strip-company"
                          checked={!!newPropertyDef.canonicalization?.strip_company_suffixes}
                          onCheckedChange={(checked) => handleNewCanonicalizationToggle('strip_company_suffixes', !!checked)}
                        />
                        <Label htmlFor="new-canon-strip-company" className="text-sm font-normal cursor-pointer">
                          Strip common company suffixes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="new-canon-preserve-case"
                          checked={!!newPropertyDef.canonicalization?.preserve_case}
                          onCheckedChange={(checked) => handleNewCanonicalizationToggle('preserve_case', !!checked)}
                        />
                        <Label htmlFor="new-canon-preserve-case" className="text-sm font-normal cursor-pointer">
                          Preserve original case
                        </Label>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 items-center gap-2">
                      <span className="text-muted-foreground col-span-2">Custom suffixes</span>
                      <Input
                        value={(newPropertyDef.canonicalization?.strip_suffixes || []).join(', ')}
                        onChange={(e) => handleNewCanonicalizationSuffixes(e.target.value)}
                        placeholder="e.g. Inc, GmbH"
                        className="col-span-3"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                   <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddProperty}
                    >
                       Add Property
                    </Button>
                 </div>
             </div>
          </div>
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Entity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
