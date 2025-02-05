import { useState } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useOntologyStore } from '@/lib/store/ontology-store'

interface AddSectionModalProps {
  isOpen: boolean
  onClose: () => void
  parentSectionId?: string
}

export function AddSectionModal({ isOpen, onClose, parentSectionId }: AddSectionModalProps) {
  const { addEntity } = useOntologyStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    addEntity({
      name,
      description,
      isSection: true,
      parentIds: parentSectionId ? [parentSectionId] : [],
      properties: [],
      relationships: []
    })

    setName('')
    setDescription('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Section</DialogTitle>
          <DialogDescription>
            Create a new section to organize your entities
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter section name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter section description"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name}>
              Create Section
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
