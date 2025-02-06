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
  defaultSection?: string | null
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
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSection, setIsSection] = useState(initialIsSection)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [validation, setValidation] = useState<EntityValidation>({})

  useEffect(() => {
    if (editEntity) {
      setName(editEntity.name)
      setDescription(editEntity.description || '')
      setIsSection(editEntity.isSection)
      setSelectedSection(editEntity.parentIds?.[0] || null)
      setProperties(editEntity.properties || [])
    } else if (!isOpen) {
      setName('')
      setDescription('')
      setIsSection(initialIsSection)
      setSelectedSection(defaultSection || null)
      setProperties([])
      setValidation({})
    }
  }, [editEntity, isOpen, defaultSection, initialParentId, initialIsSection])

  const sections = entities.filter(e => e.isSection)

  const validateForm = (): boolean => {
    const errors: EntityValidation = {}

    if (!name.trim()) {
      errors.name = 'Name is required'
    }

    const hasInvalidProperties = properties.some(
      prop => !prop.name.trim() || !prop.type
    )
    if (hasInvalidProperties) {
      errors.properties = 'All properties must have a name and type'
    }

    setValidation(errors)
    return Object.keys(errors).length === 0
  }

  const handleUpdateProperties = (newProperties: Property[]) => {
    setProperties(newProperties)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!validateForm()) return

    const formData: EntityFormData = {
      name: name.trim(),
      description: description || undefined,
      isSection,
      parentIds: selectedSection ? [selectedSection] : [],
      properties: properties.length > 0 ? properties : undefined
    }

    if (editEntity) {
      updateEntity(editEntity.id, formData)
    } else {
      addEntity(formData)
    }

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            {editEntity ? 'Edit ' : 'Add '}
            {isSection ? 'Section' : 'Entity'}
          </DialogTitle>
          <DialogDescription>
            {isSection 
              ? 'Create a new section to organize your entities. Sections can be nested within other sections.'
              : 'Fill in the entity details below. You can add properties to define its structure.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder={`Enter ${isSection ? 'section' : 'entity'} name`}
              />
              {validation.name && (
                <p className="col-start-2 col-span-3 text-sm text-destructive">
                  {validation.name}
                </p>
              )}
            </div>

            {/* <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="Enter description (optional)"
              />
            </div> */}

            <div className="grid grid-cols-4 items-center gap-4">
              {/* <Label htmlFor="section" className="text-right">
                Section
              </Label>
              <Select
                value={selectedSection || ''}
                onValueChange={(value) => setSelectedSection(value || null)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select> */}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Properties</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation()
                    setProperties([
                      ...properties,
                      DEFAULT_PROPERTY
                    ])
                  }}
                >
                  Add Property
                </Button>
              </div>
              <PropertiesTable
                properties={properties}
                onChange={handleUpdateProperties}
              />
              {validation.properties && (
                <p className="text-sm text-destructive">{validation.properties}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editEntity ? 'Save' : 'Create'} {isSection ? 'Section' : 'Entity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
