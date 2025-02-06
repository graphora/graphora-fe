import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Property } from '@/lib/types/entity'
import { Switch } from '@/components/ui/switch'

const PROPERTY_TYPES = ['str', 'int', 'float', 'bool', 'date'] as const

interface PropertiesTableProps {
  properties: Property[]
  onChange: (properties: Property[]) => void
}

export function PropertiesTable({ properties, onChange }: PropertiesTableProps) {
  const updateProperty = (index: number, updates: Partial<Property>) => {
    const updatedProperties = properties.map((prop, i) => 
      i === index ? { ...prop, ...updates } : prop
    )
    onChange(updatedProperties)
  }

  const removeProperty = (index: number) => {
    onChange(properties.filter((_, i) => i !== index))
  }

  const updatePropertyFlag = (index: number, flag: keyof Property['flags'], value: boolean) => {
    const property = properties[index]
    updateProperty(index, {
      flags: {
        ...property.flags,
        [flag]: value
      }
    })
  }

  return (
    <div className="space-y-4">
      {properties.map((property, index) => (
        <div 
          key={index} 
          className="grid gap-4 p-4 border rounded-lg relative"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={(e) => {
              e.stopPropagation()
              removeProperty(index)
            }}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={property.name}
                onChange={(e) => updateProperty(index, { name: e.target.value })}
                placeholder="Property name"
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={property.type}
                onValueChange={(value) => updateProperty(index, { type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={property.description || ''}
              onChange={(e) => updateProperty(index, { description: e.target.value })}
              placeholder="Description (optional)"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={property.flags.required}
                onCheckedChange={(checked) => updatePropertyFlag(index, 'required', checked)}
              />
              <Label>Required</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={property.flags.unique}
                onCheckedChange={(checked) => updatePropertyFlag(index, 'unique', checked)}
              />
              <Label>Unique</Label>
            </div>
          </div>
        </div>
      ))}
      
      {properties.length === 0 && (
        <div className="text-center text-muted-foreground p-4 border rounded-lg">
          No properties added yet
        </div>
      )}
    </div>
  )
}
