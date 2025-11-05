'use client'

import { useState, useEffect } from 'react'
import {
  useGraphEditorStore,
  PropertyDefinition,
  CanonicalizationOptions,
} from '@/lib/store/graph-editor-store'
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
    console.debug('[RelationshipEditor]', ...args)
  }
}
const debugWarn = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.warn('[RelationshipEditor]', ...args)
  }
}

interface RelationshipEditorProps {
  relationshipId: string | null
  onClose: () => void
}

const defaultPropertyDefinition: Omit<PropertyDefinition, 'type'> = {
   description: '',
   unique: false,
   required: false,
   index: false
}

export function RelationshipEditor({ relationshipId, onClose }: RelationshipEditorProps) {
  const { graph, updateRelationship } = useGraphEditorStore()
  const [type, setType] = useState('')
  const [properties, setProperties] = useState<Record<string, PropertyDefinition>>({})
  const [newPropertyKey, setNewPropertyKey] = useState('')
  const [newPropertyDef, setNewPropertyDef] = useState<PropertyDefinition>({
      type: 'str',
      ...defaultPropertyDefinition
  })

  useEffect(() => {
    if (relationshipId && graph.relationships[relationshipId]) {
      const relationship = graph.relationships[relationshipId]
      setType(relationship.type)
      
      const initialProperties: Record<string, PropertyDefinition> = {};
      for (const key in relationship.properties) {
          const prop = relationship.properties[key];
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
             debugWarn(`Malformed property data for ${key} on relationship ${relationshipId}:`, prop)
             initialProperties[key] = {
                type: 'str',
                ...defaultPropertyDefinition,
                description: `Malformed: ${JSON.stringify(prop)}` 
             };
          }
      }
      setProperties(initialProperties)
    } else {
       setType('');
       setProperties({});
    }
  }, [relationshipId, graph.relationships])

  const handleSave = () => {
    if (!relationshipId) return
    if (!type.trim()) {
      alert("Relationship type cannot be empty")
      return
    }
    
    updateRelationship(relationshipId, {
      type,
      properties: properties
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
    updater: (current: CanonicalizationOptions) => CanonicalizationOptions | undefined,
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
        [key]: updated,
      }
    })
  }

  const handleCanonicalizationToggle = (
    key: string,
    field: keyof CanonicalizationOptions,
    checked: boolean,
  ) => {
    updateCanonicalizationForProperty(key, current => {
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
      .map(item => item.trim())
      .filter(item => item.length > 0)

    updateCanonicalizationForProperty(key, current => {
      const next = { ...current }
      if (suffixes.length > 0) {
        next.strip_suffixes = suffixes
      } else {
        delete next.strip_suffixes
      }
      return next
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

  const handleNewCanonicalizationToggle = (
    field: keyof CanonicalizationOptions,
    checked: boolean,
  ) => {
    setNewPropertyDef(prev => {
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
      .map(item => item.trim())
      .filter(item => item.length > 0)

    setNewPropertyDef(prev => {
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
  
  const getNodeInfo = () => {
    if (!relationshipId || !graph.relationships[relationshipId]) return { from: '...', to: '...' };
    const relationship = graph.relationships[relationshipId];
    const fromNode = graph.nodes[relationship.from];
    const toNode = graph.nodes[relationship.to];
    return {
      from: fromNode?.caption || `Node ${relationship.from.substring(0,4)}?`,
      to: toNode?.caption || `Node ${relationship.to.substring(0,4)}?`
    };
  };

  const { from, to } = getNodeInfo()

  const commonRelationshipTypes = [
    'ABOUT_COMPANY', 'HAS_BUSINESS', 'HAS_RISK_FACTOR', 'HAS_LEGAL_PROCEEDING',
    'HAS_MINE_SAFETY', 'HAS_SEGMENT', 'HAS_PRODUCT', 'HAS_COMPETITION',
    'HAS_RAW_MATERIAL', 'HAS_INTELLECTUAL_PROPERTY', 'HAS_RISK_CATEGORY', 'HAS_CITATION',
    'RELATES_TO'
  ].sort();

  return (
    <Dialog open={!!relationshipId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col bg-background border-border">
        <DialogHeader className="bg-background">
          <DialogTitle className="text-foreground">Edit Relationship</DialogTitle>
          <DialogDescription className="text-muted-foreground">
             Modify the type and properties of the relationship from 
             <span className="font-medium"> {from} </span> to <span className="font-medium"> {to}</span>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
             <div className="col-span-3">
                <Input 
                   id="type"
                   value={type}
                   onChange={(e) => setType(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                   placeholder="Enter relationship type (e.g., HAS_ADDRESS)"
                   list="common-relationship-types"
                />
                <datalist id="common-relationship-types">
                   {commonRelationshipTypes.map(t => <option key={t} value={t} />)}
                </datalist>
             </div>
          </div>

          <Separator />

          <div>
             <h3 className="text-lg font-medium mb-4">Properties</h3>
             <div className="space-y-5">
                {Object.keys(properties).length === 0 && (
                  <p className="text-sm text-muted-foreground px-4">No properties defined for this relationship.</p>
                )}
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
                                  id={`unique-${key}-${relationshipId}`}
                                  checked={propDef.unique || false} 
                                  onCheckedChange={(checked) => handlePropertyChange(key, 'unique', !!checked)}
                               />
                               <Label htmlFor={`unique-${key}-${relationshipId}`} className="text-sm font-normal cursor-pointer">Unique</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                               <Checkbox 
                                  id={`required-${key}-${relationshipId}`} 
                                  checked={propDef.required || false} 
                                  onCheckedChange={(checked) => handlePropertyChange(key, 'required', !!checked)}
                               />
                               <Label htmlFor={`required-${key}-${relationshipId}`} className="text-sm font-normal cursor-pointer">Required</Label>
                            </div>
                         </div>
                      </div>
                      <div className="grid grid-cols-4 items-start gap-4">
                        <span className="text-right text-sm font-medium text-gray-700 dark:text-gray-300 pt-1">Canonicalisation</span>
                        <div className="col-span-3 space-y-3 text-sm">
                          <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`canon-strip-punct-${key}-${relationshipId}`}
                                checked={!!properties[key].canonicalization?.strip_punctuation}
                                onCheckedChange={(checked) =>
                                  handleCanonicalizationToggle(key, 'strip_punctuation', !!checked)
                                }
                              />
                              <Label
                                htmlFor={`canon-strip-punct-${key}-${relationshipId}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                Strip punctuation
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`canon-remove-alnum-${key}-${relationshipId}`}
                                checked={!!properties[key].canonicalization?.remove_non_alnum}
                                onCheckedChange={(checked) =>
                                  handleCanonicalizationToggle(key, 'remove_non_alnum', !!checked)
                                }
                              />
                              <Label
                                htmlFor={`canon-remove-alnum-${key}-${relationshipId}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                Remove non-alphanumeric
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`canon-strip-company-${key}-${relationshipId}`}
                                checked={!!properties[key].canonicalization?.strip_company_suffixes}
                                onCheckedChange={(checked) =>
                                  handleCanonicalizationToggle(key, 'strip_company_suffixes', !!checked)
                                }
                              />
                              <Label
                                htmlFor={`canon-strip-company-${key}-${relationshipId}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                Strip common company suffixes
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`canon-preserve-case-${key}-${relationshipId}`}
                                checked={!!properties[key].canonicalization?.preserve_case}
                                onCheckedChange={(checked) =>
                                  handleCanonicalizationToggle(key, 'preserve_case', !!checked)
                                }
                              />
                              <Label
                                htmlFor={`canon-preserve-case-${key}-${relationshipId}`}
                                className="text-sm font-normal cursor-pointer"
                              >
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
                    <Label htmlFor="new-rel-prop-name" className="text-right">Name</Label>
                    <Input
                       id="new-rel-prop-name"
                       placeholder="New property name"
                       value={newPropertyKey}
                       onChange={(e) => setNewPropertyKey(e.target.value)}
                       className="col-span-3"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                   <Label htmlFor="new-rel-prop-type" className="text-right">Type</Label>
                   <Select 
                      value={newPropertyDef.type} 
                      onValueChange={(value) => setNewPropertyDef(prev => ({ ...prev, type: value }))}
                   >
                      <SelectTrigger id="new-rel-prop-type" className="col-span-3">
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
                   <Label htmlFor="new-rel-prop-desc" className="text-right pt-2">Description</Label>
                   <Textarea
                      id="new-rel-prop-desc"
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
                            id="new-rel-unique"
                            checked={newPropertyDef.unique || false} 
                            onCheckedChange={(checked) => setNewPropertyDef(prev => ({ ...prev, unique: !!checked }))}
                         />
                         <Label htmlFor="new-rel-unique" className="text-sm font-normal cursor-pointer">Unique</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                         <Checkbox 
                            id="new-rel-required" 
                            checked={newPropertyDef.required || false} 
                            onCheckedChange={(checked) => setNewPropertyDef(prev => ({ ...prev, required: !!checked }))}
                         />
                         <Label htmlFor="new-rel-required" className="text-sm font-normal cursor-pointer">Required</Label>
                      </div>
                  </div>
               </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <span className="text-right text-sm font-medium text-gray-700 dark:text-gray-300 pt-1">Canonicalisation</span>
                  <div className="col-span-3 space-y-3 text-sm">
                    <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="new-rel-canon-strip-punct"
                          checked={!!newPropertyDef.canonicalization?.strip_punctuation}
                          onCheckedChange={(checked) =>
                            handleNewCanonicalizationToggle('strip_punctuation', !!checked)
                          }
                        />
                        <Label
                          htmlFor="new-rel-canon-strip-punct"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Strip punctuation
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="new-rel-canon-remove-alnum"
                          checked={!!newPropertyDef.canonicalization?.remove_non_alnum}
                          onCheckedChange={(checked) =>
                            handleNewCanonicalizationToggle('remove_non_alnum', !!checked)
                          }
                        />
                        <Label
                          htmlFor="new-rel-canon-remove-alnum"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Remove non-alphanumeric
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="new-rel-canon-strip-company"
                          checked={!!newPropertyDef.canonicalization?.strip_company_suffixes}
                          onCheckedChange={(checked) =>
                            handleNewCanonicalizationToggle('strip_company_suffixes', !!checked)
                          }
                        />
                        <Label
                          htmlFor="new-rel-canon-strip-company"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Strip common company suffixes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="new-rel-canon-preserve-case"
                          checked={!!newPropertyDef.canonicalization?.preserve_case}
                          onCheckedChange={(checked) =>
                            handleNewCanonicalizationToggle('preserve_case', !!checked)
                          }
                        />
                        <Label
                          htmlFor="new-rel-canon-preserve-case"
                          className="text-sm font-normal cursor-pointer"
                        >
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
            Save Relationship
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
