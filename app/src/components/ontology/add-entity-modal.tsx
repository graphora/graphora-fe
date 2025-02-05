import { useState, useEffect } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PropertiesTable } from './properties-table'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { EntityFormData, EntityValidation, Property, Entity } from '@/lib/types/entity'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AddEntityModalProps {
  isOpen: boolean
  onClose: () => void
  editEntity?: Entity | null
  defaultSection?: Entity | null
  initialParentId?: string
  initialIsSection?: boolean
}

const DEFAULT_PROPERTY: Property = {
  name: '',
  type: 'str',
  description: '',
  flags: {
    unique: false,
    required: false,
    index: false
  }
}

export function AddEntityModal({ 
  isOpen, 
  onClose, 
  editEntity, 
  defaultSection, 
  initialParentId,
  initialIsSection = false 
}: AddEntityModalProps) {
  const { entities, addEntity, updateEntity } = useOntologyStore()
  const [formData, setFormData] = useState<EntityFormData>({
    name: '',
    description: '',
    isSection: initialIsSection,
    properties: [],
    relationships: []
  })
  const [validation, setValidation] = useState<EntityValidation>({})
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [properties, setProperties] = useState<Property[]>([])

  // Reset form when modal opens/closes or when editing different entity
  useEffect(() => {
    if (isOpen) {
      if (editEntity) {
        setFormData({
          name: editEntity.name,
          description: editEntity.description || '',
          isSection: editEntity.isSection,
          properties: editEntity.properties || [],
          relationships: editEntity.relationships || []
        })
        setSelectedSection(editEntity.parentIds?.[0] || null)
        setProperties(editEntity.properties || [])
      } else {
        setFormData({
          name: '',
          description: '',
          isSection: initialIsSection,
          properties: [],
          relationships: []
        })
        setSelectedSection(defaultSection?.id || null)
        setProperties([])
      }
    }
  }, [isOpen, editEntity, defaultSection, initialParentId, initialIsSection])

  const sections = entities.filter(e => e.isSection)
  const entityTypes = [...new Set(entities.filter(e => !e.isSection).map(e => e.type).filter(Boolean))]

  const validateForm = (): boolean => {
    const errors: EntityValidation = {}

    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }

    const hasInvalidProperties = formData.properties.some(
      prop => !prop.name.trim() || !prop.type
    )
    if (hasInvalidProperties) {
      errors.properties = 'All properties must have a name and type'
    }

    setValidation(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddProperty = () => {
    setProperties([...properties, { name: '', type: '', description: '', flags: { unique: false, required: false, index: false } }])
  }

  const handleUpdateProperty = (index: number, field: keyof Property, value: any) => {
    const updatedProperties = [...properties]
    updatedProperties[index] = { ...updatedProperties[index], [field]: value }
    setProperties(updatedProperties)
  }

  const handleRemoveProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    const entityData = {
      name: formData.name,
      description: formData.description,
      isSection: formData.isSection,
      parentIds: selectedSection ? [selectedSection] : [],
      properties: properties,
      relationships: formData.relationships
    }

    if (editEntity) {
      updateEntity(editEntity.id, entityData)
    } else {
      addEntity(entityData)
    }

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editEntity ? 'Edit Entity' : 'Add Entity'}
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new {formData.isSection ? 'section' : 'entity'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
                error={validation.name}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description (optional)"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isSection}
                onCheckedChange={(checked) => setFormData({ ...formData, isSection: checked })}
              />
              <Label>This is a section</Label>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.properties[0]?.type || ''} onValueChange={(value) => {
                setFormData({
                  ...formData,
                  properties: formData.properties.map((prop, index) => index === 0 ? { ...prop, type: value } : prop)
                })
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {entityTypes.map(type => (
                    <SelectItem key={type} value={type || 'unknown'}>
                      {type || 'Unknown'}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Type</SelectItem>
                </SelectContent>
              </Select>
              {formData.properties[0]?.type === 'custom' && (
                <Input
                  value={formData.properties[0]?.type}
                  onChange={(e) => setFormData({
                    ...formData,
                    properties: formData.properties.map((prop, index) => index === 0 ? { ...prop, type: e.target.value } : prop)
                  })}
                  placeholder="Enter custom type"
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={selectedSection || 'none'} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Section</SelectItem>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Properties</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddProperty}
                >
                  Add Property
                </Button>
              </div>
              {properties.map((property, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    value={property.name}
                    onChange={(e) => handleUpdateProperty(index, 'name', e.target.value)}
                    placeholder="Property name"
                    className="flex-1"
                  />
                  <Input
                    value={property.type}
                    onChange={(e) => handleUpdateProperty(index, 'type', e.target.value)}
                    placeholder="Property type"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={property.flags.required}
                      onChange={(e) => handleUpdateProperty(index, 'flags.required', e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label>Required</Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveProperty(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editEntity ? 'Save Changes' : 'Create ' + (formData.isSection ? 'Section' : 'Entity')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
