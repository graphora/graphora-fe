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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { 
  RelationshipFormData, 
  RelationshipValidation,
  RELATIONSHIP_TYPES,
  validateRelationship
} from '@/lib/types/relationship'
import { cn } from '@/lib/utils'

interface AddRelationshipModalProps {
  isOpen: boolean
  onClose: () => void
  initialSourceId?: string
}

const DEFAULT_FORM_DATA: RelationshipFormData = {
  sourceId: '',
  targetId: '',
  type: '',
  direction: 'outgoing'
}

export function AddRelationshipModal({ 
  isOpen, 
  onClose,
  initialSourceId 
}: AddRelationshipModalProps) {
  const { sections, entities, relationships, addRelationship } = useOntologyStore()
  const [formData, setFormData] = useState<RelationshipFormData>(DEFAULT_FORM_DATA)
  const [validation, setValidation] = useState<RelationshipValidation>({
    isValid: false,
    errors: [],
    warnings: []
  })
  const [openSource, setOpenSource] = useState(false)
  const [openTarget, setOpenTarget] = useState(false)
  const [openType, setOpenType] = useState(false)
  const [sourceSearch, setSourceSearch] = useState("")
  const [targetSearch, setTargetSearch] = useState("")

  // Initialize form data when modal opens with initialSourceId
  useEffect(() => {
    if (isOpen && initialSourceId) {
      setFormData(prev => ({ ...prev, sourceId: initialSourceId }))
    }
  }, [isOpen, initialSourceId])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData(DEFAULT_FORM_DATA)
      setValidation({ isValid: false, errors: [], warnings: [] })
      setSourceSearch("")
      setTargetSearch("")
    }
  }, [isOpen])

  const validateForm = () => {
    const result = validateRelationship(formData, relationships)
    setValidation(result)
    return result.isValid
  }

  const handleSubmit = () => {
    if (validateForm()) {
      addRelationship({
        id: crypto.randomUUID(),
        ...formData,
        metadata: {
          createdAt: new Date(),
          lastModified: new Date()
        }
      })
      onClose()
    }
  }

  const getEntityName = (entityId: string) => {
    return entities.find(e => e.id === entityId)?.name || ''
  }

  const filterEntities = (search: string, excludeId?: string) => {
    return entities
      .filter(entity => {
        if (excludeId && entity.id === excludeId) return false
        return entity.name.toLowerCase().includes(search.toLowerCase())
      })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Relationship</DialogTitle>
          <DialogDescription>
            Define a relationship between two entities
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Source Entity</Label>
            <Popover open={openSource} onOpenChange={setOpenSource}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSource}
                  className="w-full justify-between"
                  disabled={!!initialSourceId}
                >
                  {formData.sourceId
                    ? getEntityName(formData.sourceId)
                    : "Select source entity..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              {!initialSourceId && (
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search entities..." 
                      value={sourceSearch}
                      onValueChange={setSourceSearch}
                    />
                    <CommandEmpty>No entity found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {filterEntities(sourceSearch)
                          .map(entity => (
                            <CommandItem
                              key={entity.id}
                              className="cursor-pointer"
                              onSelect={(currentValue) => {
                                setFormData(prev => ({ ...prev, sourceId: entity.id }))
                                setOpenSource(false)
                                setSourceSearch("")
                              }}
                            >
                              <div className="flex items-center">
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.sourceId === entity.id 
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <span>{entity.name}</span>
                              </div>
                            </CommandItem>
                          ))
                        }
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              )}
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Relationship Type</Label>
            <Popover open={openType} onOpenChange={setOpenType}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openType}
                  className="w-full justify-between"
                >
                  {formData.type || "Select relationship type..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search or enter custom type..." />
                  <CommandEmpty>
                    Press enter to use custom type
                  </CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {RELATIONSHIP_TYPES.map(type => (
                        <CommandItem
                          key={type}
                          className="cursor-pointer"
                          onSelect={(currentValue) => {
                            setFormData(prev => ({ ...prev, type }))
                            setOpenType(false)
                          }}
                        >
                          <div className="flex items-center">
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.type === type 
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span>{type}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Input
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value.toUpperCase() }))}
              placeholder="Or enter custom type..."
              maxLength={32}
              className="mt-2"
            />
          </div>

          <div className="space-y-2">
            <Label>Target Entity</Label>
            <Popover open={openTarget} onOpenChange={setOpenTarget}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openTarget}
                  className="w-full justify-between"
                >
                  {formData.targetId
                    ? getEntityName(formData.targetId)
                    : "Select target entity..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search entities..." 
                    value={targetSearch}
                    onValueChange={setTargetSearch}
                  />
                  <CommandEmpty>No entity found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {filterEntities(targetSearch, formData.sourceId)
                        .map(entity => (
                          <CommandItem
                            key={entity.id}
                            className="cursor-pointer"
                            onSelect={(currentValue) => {
                              setFormData(prev => ({ ...prev, targetId: entity.id }))
                              setOpenTarget(false)
                              setTargetSearch("")
                            }}
                          >
                            <div className="flex items-center">
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.targetId === entity.id 
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span>{entity.name}</span>
                            </div>
                          </CommandItem>
                        ))
                      }
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Direction</Label>
            <RadioGroup
              value={formData.direction}
              onValueChange={(value: 'outgoing' | 'incoming') => 
                setFormData(prev => ({ ...prev, direction: value }))
              }
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="outgoing" id="outgoing" />
                <Label htmlFor="outgoing">Outgoing</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="incoming" id="incoming" />
                <Label htmlFor="incoming">Incoming</Label>
              </div>
            </RadioGroup>
          </div>

          {validation.errors.length > 0 && (
            <div className="text-sm text-red-500">
              {validation.errors.map((error, i) => (
                <div key={i}>{error}</div>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="text-sm text-yellow-500">
              {validation.warnings.map((warning, i) => (
                <div key={i}>{warning}</div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.sourceId || !formData.targetId || !formData.type}
          >
            Create Relationship
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
