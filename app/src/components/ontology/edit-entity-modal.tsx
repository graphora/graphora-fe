import { useEffect, useState } from 'react'
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
import { PropertiesTable } from './properties-table'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { EntityFormData, EntityValidation, Property } from '@/lib/types/entity'

interface EditEntityModalProps {
  isOpen: boolean
  onClose: () => void
  entityId?: string
}

export function EditEntityModal({ 
  isOpen, 
  onClose,
  entityId 
}: EditEntityModalProps) {
  const { entities, updateEntity } = useOntologyStore()
  const [formData, setFormData] = useState<EntityFormData>({
    name: '',
    section: '',
    description: '',
    properties: []
  })
  const [errors, setErrors] = useState<EntityValidation>({})

  useEffect(() => {
    if (entityId) {
      const entity = entities.find(e => e.id === entityId)
      if (entity) {
        setFormData({
          name: entity.name,
          section: entity.section,
          description: entity.description || '',
          properties: entity.properties
        })
      }
    }
  }, [entityId, entities])

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
      e.id !== entityId &&
      e.section === formData.section && 
      e.name.toLowerCase() === formData.name.toLowerCase()
    )) {
      newErrors.name = 'An entity with this name already exists in this section'
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
    if (validateForm() && entityId) {
      updateEntity(entityId, {
        name: formData.name,
        description: formData.description,
        properties: formData.properties
      })
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Entity</DialogTitle>
          <DialogDescription>
            Modify the entity's properties and details
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name}
            >
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
