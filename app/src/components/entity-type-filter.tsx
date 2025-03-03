import { useState, useEffect, useMemo } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface EntityType {
  type: string;
  count: number;
}

interface EntityTypeFilterProps {
  entityTypes: EntityType[];
  selectedTypes: string[];
  onSelectionChange: (selectedTypes: string[]) => void;
}

export function EntityTypeFilter({ 
  entityTypes, 
  selectedTypes, 
  onSelectionChange 
}: EntityTypeFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter entity types based on search query
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return entityTypes;
    return entityTypes.filter(et => 
      et.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [entityTypes, searchQuery]);
  
  // Toggle select all/none
  const toggleAll = (select: boolean) => {
    if (select) {
      onSelectionChange(entityTypes.map(et => et.type));
    } else {
      onSelectionChange([]);
    }
  };
  
  // Calculate visibility stats
  const visibleNodes = useMemo(() => {
    return entityTypes
      .filter(et => selectedTypes.includes(et.type))
      .reduce((sum, et) => sum + et.count, 0);
  }, [entityTypes, selectedTypes]);
  
  const totalNodes = useMemo(() => {
    return entityTypes.reduce((sum, et) => sum + et.count, 0);
  }, [entityTypes]);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => toggleAll(true)}
          >
            Select All
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => toggleAll(false)}
          >
            Clear
          </Button>
        </div>
        
        <Badge variant="secondary">
          {selectedTypes.length}/{entityTypes.length} types
        </Badge>
      </div>
      
      <div className="relative">
        <Input
          type="text"
          className="w-full"
          placeholder="Search entity types..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1">
        {filteredTypes.map((entityType) => (
          <div 
            key={entityType.type} 
            className="flex items-center justify-between py-1 px-2 hover:bg-accent rounded-sm"
          >
            <div className="flex items-center gap-2">
              <Checkbox 
                id={`et-${entityType.type}`}
                checked={selectedTypes.includes(entityType.type)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSelectionChange([...selectedTypes, entityType.type]);
                  } else {
                    onSelectionChange(selectedTypes.filter(t => t !== entityType.type));
                  }
                }}
              />
              <Label 
                htmlFor={`et-${entityType.type}`}
                className="cursor-pointer flex-1"
              >
                {entityType.type}
              </Label>
            </div>
            <span className="text-xs text-muted-foreground">{entityType.count}</span>
          </div>
        ))}
        
        {filteredTypes.length === 0 && (
          <div className="py-2 text-center text-sm text-muted-foreground">
            No entity types found
          </div>
        )}
      </div>
      
      <div className="pt-2 border-t text-xs text-muted-foreground flex justify-between">
        <span>Visible: {visibleNodes} nodes</span>
        <span>Total: {totalNodes} nodes</span>
      </div>
    </div>
  );
} 