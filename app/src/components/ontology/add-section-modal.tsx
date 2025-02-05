import { useState } from 'react'
import { Dialog, RadioGroup } from '@headlessui/react'
import { X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useOntologyStore } from '@/lib/store/ontology-store'

interface AddSectionModalProps {
  isOpen: boolean
  onClose: () => void
}

const sectionTypes = [
  {
    id: 'custom',
    name: 'Custom Section',
    description: 'A custom section for your specific needs'
  },
  {
    id: 'system',
    name: 'System Section',
    description: 'A predefined section with system-level entities'
  }
]

export function AddSectionModal({ isOpen, onClose }: AddSectionModalProps) {
  const [sectionName, setSectionName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'custom' | 'system'>('custom')
  const [error, setError] = useState('')
  const { sections, addSection } = useOntologyStore()

  const validateName = (name: string) => {
    if (!name.trim()) {
      return 'Section name is required'
    }
    if (sections?.some(s => s?.name?.toLowerCase() === name.toLowerCase())) {
      return 'A section with this name already exists'
    }
    if (name.length < 3) {
      return 'Section name must be at least 3 characters'
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_\s]*$/.test(name)) {
      return 'Section name must start with a letter and contain only letters, numbers, spaces, and underscores'
    }
    return ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateName(sectionName)
    if (validationError) {
      setError(validationError)
      return
    }

    addSection({
      name: sectionName.trim(),
      description: description.trim(),
      type
    })

    setSectionName('')
    setDescription('')
    setType('custom')
    setError('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-medium">
              Add New Section
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="sectionName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Section Name
              </label>
              <Input
                id="sectionName"
                type="text"
                value={sectionName}
                onChange={(e) => {
                  setSectionName(e.target.value)
                  setError('')
                }}
                placeholder="Enter section name"
                className={error ? 'border-red-300' : ''}
                autoFocus
              />
              {error && (
                <div className="mt-1 flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter section description"
                className="h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section Type
              </label>
              <RadioGroup value={type} onChange={setType} className="space-y-2">
                {sectionTypes.map((sectionType) => (
                  <RadioGroup.Option
                    key={sectionType.id}
                    value={sectionType.id}
                    className={({ active, checked }) => `
                      ${active ? 'ring-2 ring-blue-200' : ''}
                      ${checked ? 'bg-blue-50 border-blue-200' : 'bg-white'}
                      relative flex cursor-pointer rounded-lg px-5 py-4 border focus:outline-none
                    `}
                  >
                    {({ checked }) => (
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center">
                          <div className="text-sm">
                            <RadioGroup.Label
                              as="p"
                              className={`font-medium ${
                                checked ? 'text-blue-900' : 'text-gray-900'
                              }`}
                            >
                              {sectionType.name}
                            </RadioGroup.Label>
                            <RadioGroup.Description
                              as="span"
                              className={`inline ${
                                checked ? 'text-blue-700' : 'text-gray-500'
                              }`}
                            >
                              {sectionType.description}
                            </RadioGroup.Description>
                          </div>
                        </div>
                      </div>
                    )}
                  </RadioGroup.Option>
                ))}
              </RadioGroup>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!sectionName.trim()}
              >
                Add Section
              </Button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
