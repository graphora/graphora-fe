export type RelationshipDirection = 'outgoing' | 'incoming'

export interface Relationship {
  id: string
  sourceId: string
  targetId: string
  type: string
  direction: RelationshipDirection
  metadata?: {
    createdAt: Date
    lastModified: Date
  }
}

export interface RelationshipValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface RelationshipFormData {
  sourceId: string
  targetId: string
  type: string
  direction: RelationshipDirection
}

export const RELATIONSHIP_TYPES = [
  'HAS_PART',
  'BELONGS_TO',
  'RELATES_TO'
] as const

export const validateRelationship = (
  formData: RelationshipFormData,
  existingRelationships: Relationship[]
): RelationshipValidation => {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!formData.sourceId) errors.push('Source entity is required')
  if (!formData.targetId) errors.push('Target entity is required')
  if (!formData.type) errors.push('Relationship type is required')

  // Source and target cannot be the same
  if (formData.sourceId === formData.targetId) {
    errors.push('Source and target entities must be different')
  }

  // Type validation
  if (formData.type) {
    if (formData.type.length > 32) {
      errors.push('Relationship type must be less than 32 characters')
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(formData.type)) {
      errors.push('Relationship type must be uppercase and contain only letters, numbers, and underscores')
    }
  }

  // Check for duplicate relationships
  const hasDuplicate = existingRelationships.some(rel => 
    rel.sourceId === formData.sourceId &&
    rel.targetId === formData.targetId &&
    rel.type === formData.type
  )
  if (hasDuplicate) {
    errors.push('This relationship already exists')
  }

  // Circular relationship warning
  const hasReverse = existingRelationships.some(rel =>
    rel.sourceId === formData.targetId &&
    rel.targetId === formData.sourceId &&
    rel.type === formData.type
  )
  if (hasReverse) {
    warnings.push('This will create a circular relationship')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}
