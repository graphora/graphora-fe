import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Property } from '@/lib/types/entity'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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

  const updatePropertyFlag = (index: number, flag: string, value: boolean) => {
    const property = properties[index]
    updateProperty(index, {
      flags: {
        unique: false,
        required: false,
        index: false,
        ...property.flags,
        [flag]: value
      }
    })
  }

  return (
    <div className="space-y-5">
      {properties.map((property, index) => (
        <div
          key={index}
          className={cn(
            'group relative rounded-2xl border border-white/15 bg-white/8 p-6 shadow-glass transition-all',
            'hover:border-primary/40 hover:shadow-large'
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 h-8 w-8 rounded-full border border-white/20 bg-white/10 text-foreground/60 hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              removeProperty(index)
            }}
            aria-label="Remove property"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-foreground/60">Property {index + 1}</p>
              <p className="text-heading text-foreground">{property.name || 'Unnamed property'}</p>
            </div>
            <Badge variant="glass" className="uppercase tracking-[0.16em]">
              {(property.type || 'str').toUpperCase()}
            </Badge>
          </div>

          <div className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={property.name}
                  onChange={(e) => updateProperty(index, { name: e.target.value })}
                  placeholder="Property name"
                  className="bg-white/5 text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={property.type}
                  onValueChange={(value) => updateProperty(index, { type: value })}
                >
                  <SelectTrigger className="bg-white/5 text-foreground">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
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
                className="bg-white/5 text-foreground"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground/80">
                <Switch
                  checked={property.flags?.required}
                  onCheckedChange={(checked) => updatePropertyFlag(index, 'required', checked)}
                />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground/80">
                <Switch
                  checked={property.flags?.unique}
                  onCheckedChange={(checked) => updatePropertyFlag(index, 'unique', checked)}
                />
                Unique
              </label>
            </div>
          </div>
        </div>
      ))}

      {properties.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-foreground/60">
          No properties added yet
        </div>
      )}
    </div>
  )
}
