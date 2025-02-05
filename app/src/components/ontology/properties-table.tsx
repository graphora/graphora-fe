import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tooltip } from '@/components/ui/tooltip'
import { Property, PropertyType } from '@/lib/types/entity'

const PROPERTY_TYPES: PropertyType[] = ['str', 'int', 'float', 'bool', 'date']

interface PropertiesTableProps {
  properties: Property[]
  onChange: (properties: Property[]) => void
  errors?: Record<string, { name?: string; type?: string; description?: string }>
}

export function PropertiesTable({ 
  properties, 
  onChange,
  errors = {} 
}: PropertiesTableProps) {
  const addProperty = () => {
    onChange([
      ...properties,
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
    ])
  }

  const removeProperty = (index: number) => {
    onChange(properties.filter((_, i) => i !== index))
  }

  const updateProperty = (index: number, updates: Partial<Property>) => {
    onChange(
      properties.map((prop, i) => 
        i === index ? { ...prop, ...updates } : prop
      )
    )
  }

  return (
    <div className="border rounded-md">
      <div className="grid grid-cols-[2fr,1fr,2fr,auto] gap-4 p-3 bg-gray-50 border-b">
        <div>Name</div>
        <div>Type</div>
        <div>Description</div>
        <div>Flags</div>
      </div>
      
      <div className="max-h-[300px] overflow-y-auto">
        {properties.map((property, index) => (
          <div 
            key={index}
            className="grid grid-cols-[2fr,1fr,2fr,auto] gap-4 p-3 border-b last:border-b-0"
          >
            <div>
              <Tooltip content={errors[property.name]?.name}>
                <Input
                  value={property.name}
                  onChange={(e) => updateProperty(index, { name: e.target.value })}
                  placeholder="Property name"
                  maxLength={32}
                  pattern="^[a-zA-Z][a-zA-Z0-9_]*$"
                  className={errors[property.name]?.name ? 'border-red-500' : ''}
                />
              </Tooltip>
            </div>

            <Select
              value={property.type}
              onValueChange={(value: PropertyType) => 
                updateProperty(index, { type: value })
              }
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

            <Input
              value={property.description}
              onChange={(e) => 
                updateProperty(index, { description: e.target.value })
              }
              placeholder="Description (optional)"
              maxLength={128}
            />

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`unique-${index}`}
                  checked={property.flags.unique}
                  onCheckedChange={(checked) =>
                    updateProperty(index, {
                      flags: { ...property.flags, unique: !!checked }
                    })
                  }
                />
                <label htmlFor={`unique-${index}`} className="text-sm">
                  Unique
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id={`required-${index}`}
                  checked={property.flags.required}
                  onCheckedChange={(checked) =>
                    updateProperty(index, {
                      flags: { ...property.flags, required: !!checked }
                    })
                  }
                />
                <label htmlFor={`required-${index}`} className="text-sm">
                  Required
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id={`index-${index}`}
                  checked={property.flags.index}
                  onCheckedChange={(checked) =>
                    updateProperty(index, {
                      flags: { ...property.flags, index: !!checked }
                    })
                  }
                />
                <label htmlFor={`index-${index}`} className="text-sm">
                  Index
                </label>
              </div>

              {properties.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProperty(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        className="w-full flex items-center justify-center py-2 hover:bg-gray-50"
        onClick={addProperty}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Property
      </Button>
    </div>
  )
}
