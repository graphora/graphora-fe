"use client"

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
import { Label } from '@/components/ui/label'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Relationship } from '@/lib/types/relationship'

interface AddRelationshipModalProps {
  isOpen: boolean
  onClose: () => void
  sourceEntityId?: string
  editRelationship?: Relationship
}

export function AddRelationshipModal({ 
  isOpen, 
  onClose, 
  sourceEntityId,
  editRelationship 
}: AddRelationshipModalProps) {
  const { entities, addRelationship, updateRelationship } = useOntologyStore()
  const [type, setType] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [validation, setValidation] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (editRelationship) {
      setType(editRelationship.type)
      setSelectedSourceId(editRelationship.sourceId)
      setSelectedTargetId(editRelationship.targetId)
    } else {
      setType('')
      setSelectedSourceId(sourceEntityId || null)
      setSelectedTargetId(null)
    }
    setValidation({})
  }, [editRelationship, sourceEntityId, isOpen])

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    if (!type.trim()) {
      errors.type = 'Type is required'
    }
    if (!selectedSourceId) {
      errors.source = 'Source entity is required'
    }
    if (!selectedTargetId) {
      errors.target = 'Target entity is required'
    }

    setValidation(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!validateForm()) return

    const relationshipData = {
      type: type.trim(),
      sourceId: selectedSourceId!,
      targetId: selectedTargetId!
    }

    if (editRelationship) {
      updateRelationship(editRelationship.id, relationshipData)
    } else {
      addRelationship(relationshipData)
    }

    onClose()
  }

  const availableEntities = entities.filter(e => !e.isSection)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{editRelationship ? 'Edit Relationship' : 'Add Relationship'}</DialogTitle>
          <DialogDescription>
            {editRelationship 
              ? 'Update the relationship between entities.' 
              : 'Create a new relationship between two entities.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <Input
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="col-span-3"
            />
            {validation.type && (
              <p className="col-start-2 col-span-3 text-sm text-destructive">
                {validation.type}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="source" className="text-right">
              Source
            </Label>
            <Select
              value={selectedSourceId || ''}
              onValueChange={(value) => setSelectedSourceId(value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select source entity" />
              </SelectTrigger>
              <SelectContent>
                {availableEntities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validation.source && (
              <p className="col-start-2 col-span-3 text-sm text-destructive">
                {validation.source}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="target" className="text-right">
              Target
            </Label>
            <Select
              value={selectedTargetId || ''}
              onValueChange={(value) => setSelectedTargetId(value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select target entity" />
              </SelectTrigger>
              <SelectContent>
                {availableEntities
                  .filter(entity => entity.id !== selectedSourceId)
                  .map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {validation.target && (
              <p className="col-start-2 col-span-3 text-sm text-destructive">
                {validation.target}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editRelationship ? 'Update' : 'Create'} Relationship
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
