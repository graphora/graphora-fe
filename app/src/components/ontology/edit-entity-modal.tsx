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
import { Label } from '@/components/ui/label'
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
    description: '',
    isSection: false,
    properties: [],
    relationships: []
  })
  const [validation, setValidation] = useState<EntityValidation>({})

  useEffect(() => {
    if (entityId) {
      const entity = entities.find(e => e.id === entityId)
      if (entity) {
        setFormData({
          name: entity.name,
          description: entity.description || '',
          isSection: entity.isSection || false,
          properties: entity.properties || [],
          relationships: entity.relationships || []
        })
      }
    }
  }, [entityId, entities])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !entityId) return

    updateEntity(entityId, {
      name: formData.name,
      description: formData.description,
      properties: formData.properties,
      relationships: formData.relationships
    })

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {formData.isSection ? 'Section' : 'Entity'}</DialogTitle>
          <DialogDescription>
            Update the details of this {formData.isSection ? 'section' : 'entity'}.
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

            <div className="space-y-2">
              <Label>Properties</Label>
              <PropertiesTable
                properties={formData.properties}
                onChange={(properties) => setFormData({ ...formData, properties })}
                errors={validation.properties ? { _: { name: validation.properties } } : {}}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
