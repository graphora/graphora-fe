import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PropertiesTable } from './properties-table'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { EntityFormData, EntityValidation, Property } from '@/lib/types/entity'
import { cn } from '@/lib/utils'

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
    if (entityId && isOpen) {
      const entity = entities.find(e => e.id === entityId)
      if (entity) {
        const propertiesArray = Object.entries(entity.properties || {}).map(([name, prop]) => ({
          name,
          type: prop.type || 'str',
          description: prop.description || '',
          flags: {
            unique: prop.unique || false,
            required: prop.required || false,
            index: prop.index || false
          }
        }))

        setFormData({
          name: entity.name,
          description: entity.description || '',
          isSection: entity.isSection || false,
          properties: propertiesArray,
          relationships: entity.relationships || []
        })
      }
    }
  }, [entityId, entities, isOpen])

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        isSection: false,
        properties: [],
        relationships: []
      })
      setValidation({})
    }
  }, [isOpen])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!validateForm() || !entityId) return

    try {
      const propertiesObject = formData.properties.reduce((acc, prop) => {
        if (!prop.name) return acc
        acc[prop.name] = {
          type: prop.type,
          description: prop.description,
          unique: prop.flags.unique,
          required: prop.flags.required,
          index: prop.flags.index
        }
        return acc
      }, {} as Record<string, any>)

      await updateEntity(entityId, {
        name: formData.name,
        description: formData.description,
        properties: propertiesObject,
        relationships: formData.relationships
      })

      handleClose()
    } catch (error) {
      console.error('Failed to update entity:', error)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      isSection: false,
      properties: [],
      relationships: []
    })
    setValidation({})
    onClose()
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay 
          className={cn(
            'fixed inset-0 z-50 bg-black/80',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
          onClick={(e) => e.stopPropagation()}
        />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
            'bg-background p-6 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'sm:rounded-lg'
          )}
        >
          <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-6">
            <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
              Edit {formData.isSection ? 'Section' : 'Entity'}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              Update the details of this {formData.isSection ? 'section' : 'entity'}.
            </DialogPrimitive.Description>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                  className={validation.name ? 'border-red-500' : ''}
                />
                {validation.name && (
                  <p className="text-sm text-red-500">{validation.name}</p>
                )}
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
                <div className="flex items-center justify-between mb-2">
                  <Label>Properties</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFormData({
                        ...formData,
                        properties: [
                          ...formData.properties,
                          {
                            name: '',
                            type: 'str',
                            description: '',
                            flags: {
                              unique: false,
                              required: false,
                              index: false
                            }
                          }
                        ]
                      })
                    }}
                  >
                    Add Property
                  </Button>
                </div>
                <PropertiesTable
                  properties={formData.properties}
                  onChange={(properties) => setFormData({ ...formData, properties })}
                />
                {validation.properties && (
                  <p className="text-sm text-red-500">{validation.properties}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose()
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                onClick={(e) => e.stopPropagation()}
              >
                Save Changes
              </Button>
            </div>
          </form>

          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
