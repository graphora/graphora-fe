import { useState } from 'react'
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { PropertiesTable } from './properties-table'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { EntityFormData, EntityValidation, Property } from '@/lib/types/entity'

interface AddEntityModalProps {
  isOpen: boolean
  onClose: () => void
  initialSection?: string
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
  initialSection 
}: AddEntityModalProps) {
  const { sections, entities, addEntity } = useOntologyStore()
  const [formData, setFormData] = useState<EntityFormData>({
    name: '',
    section: initialSection || '',
    description: '',
    properties: [DEFAULT_PROPERTY]
  })
  const [errors, setErrors] = useState<EntityValidation>({})

  const validateForm = (): boolean => {
    const newErrors: EntityValidation = {}

    // Validate name
    if (!formData.name) {
      newErrors.name = 'Name is required'
    } else if (formData.name.length > 64) {
      newErrors.name = 'Name must be less than 64 characters'
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.name)) {
      newErrors.name = 'Name must start with a letter and contain only letters, numbers, and underscores'
    } else if (entities.some(e => 
      e.section === formData.section && 
      e.name.toLowerCase() === formData.name.toLowerCase()
    )) {
      newErrors.name = 'An entity with this name already exists in this section'
    }

    // Validate section
    if (!formData.section) {
      newErrors.name = 'Section is required'
    }

    // Validate properties
    const propertyErrors: Record<string, any> = {}
    const propertyNames = new Set<string>()

    formData.properties.forEach((prop, index) => {
      const errors: Record<string, string> = {}

      if (!prop.name) {
        errors.name = 'Property name is required'
      } else if (prop.name.length > 32) {
        errors.name = 'Property name must be less than 32 characters'
      } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(prop.name)) {
        errors.name = 'Property name must start with a letter and contain only letters, numbers, and underscores'
      } else if (propertyNames.has(prop.name.toLowerCase())) {
        errors.name = 'Property name must be unique'
      }

      propertyNames.add(prop.name.toLowerCase())

      if (Object.keys(errors).length > 0) {
        propertyErrors[prop.name || `property${index}`] = errors
      }
    })

    if (Object.keys(propertyErrors).length > 0) {
      newErrors.properties = propertyErrors
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      const newEntity = {
        id: crypto.randomUUID(),
        name: formData.name,
        section: formData.section,
        description: formData.description,
        properties: formData.properties,
        relationships: []
      }
      
      addEntity(newEntity)
      clearForm()
      onClose()
    }
  }

  const clearForm = () => {
    setFormData({
      name: '',
      section: initialSection || '',
      description: '',
      properties: [DEFAULT_PROPERTY]
    })
    setErrors({})
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Entity</DialogTitle>
          <DialogDescription>
            Create a new entity with properties
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Entity name"
              maxLength={64}
              error={errors.name}
            />
          </div>

          <div>
            <Select
              value={formData.section}
              onValueChange={(value) => setFormData({ ...formData, section: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {sections
                  .filter(s => s.name !== 'Metadata')
                  .map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          <div>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description (optional)"
              maxLength={256}
            />
          </div>

          <div>
            <PropertiesTable
              properties={formData.properties}
              onChange={(properties) => setFormData({ ...formData, properties })}
              errors={errors.properties}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={clearForm}
          >
            Clear Form
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.section}
            >
              Create Entity
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
