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
import { useOntologyStore } from '@/lib/store/ontology-store'
import { Entity } from '@/lib/types/entity'

interface AddSectionModalProps {
  isOpen: boolean
  onClose: () => void
  parentSectionId?: string | null
  editSection?: Entity | null
}

export function AddSectionModal({ 
  isOpen, 
  onClose, 
  parentSectionId,
  editSection 
}: AddSectionModalProps) {
  const { addEntity, updateEntity, entities } = useOntologyStore()
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    if (editSection) {
      setFormData({
        name: editSection.name,
        description: editSection.description || ''
      })
    } else if (!isOpen) {
      setFormData({
        name: '',
        description: ''
      })
    }
  }, [editSection, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!formData.name.trim()) return

    try {
      if (editSection) {
        await updateEntity(editSection.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined
        })
      } else {
        await addEntity({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          isSection: true,
          parentIds: parentSectionId ? [parentSectionId] : []
        })
      }

      setFormData({
        name: '',
        description: ''
      })
      onClose()
    } catch (error) {
      console.error('Failed to save section:', error)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      description: ''
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="sm:max-w-[425px]" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {editSection ? 'Edit Section' : parentSectionId ? 'Add Subsection' : 'Add Section'}
          </DialogTitle>
          <DialogDescription>
            {editSection ? 'Update an existing section.' : 'Create a new section to organize your entities. Sections can be nested within other sections.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter section name"
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editSection ? 'Save Changes' : 'Create Section'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
