"use client"

import { useState } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOntologyStore } from '@/lib/store/ontology-store'

interface AddRelationshipModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddRelationshipModal({ isOpen, onClose }: AddRelationshipModalProps) {
  const { entities, addRelationship } = useOntologyStore()
  const [sourceId, setSourceId] = useState<string>('')
  const [targetId, setTargetId] = useState<string>('')
  const [type, setType] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sourceId || !targetId || !type) return

    addRelationship({
      sourceId,
      targetId,
      type,
    })

    // Reset form and close
    setSourceId('')
    setTargetId('')
    setType('')
    onClose()
  }

  const handleClose = () => {
    setSourceId('')
    setTargetId('')
    setType('')
    onClose()
  }

  const nonSectionEntities = entities.filter(e => !e.isSection)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Relationship</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Source Entity</label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select source entity" />
              </SelectTrigger>
              <SelectContent>
                {nonSectionEntities.map(entity => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Target Entity</label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target entity" />
              </SelectTrigger>
              <SelectContent>
                {nonSectionEntities
                  .filter(e => e.id !== sourceId)
                  .map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Relationship Type</label>
            <Input
              placeholder="e.g., depends on, related to, etc."
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!sourceId || !targetId || !type}>
              Add Relationship
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
