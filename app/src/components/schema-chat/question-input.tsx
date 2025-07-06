'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Send, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Question {
  id: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'file'
  prompt: string
  required?: boolean
  options?: string[]
  placeholder?: string
  helpText?: string
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
  }
}

interface QuestionInputProps {
  question: Question
  onSubmit: (value: string | string[]) => void
  disabled?: boolean
  className?: string
}

export function QuestionInput({ question, onSubmit, disabled = false, className }: QuestionInputProps) {
  const [value, setValue] = useState<string | string[]>('')
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])

  // Reset when question changes
  useEffect(() => {
    setValue(question.type === 'multiselect' ? [] : '')
    setError(null)
    setFiles([])
  }, [question.id, question.type])

  const validateInput = (inputValue: string | string[]): string | null => {
    if (question.required) {
      if (question.type === 'multiselect') {
        if (!Array.isArray(inputValue) || inputValue.length === 0) {
          return 'Please select at least one option'
        }
      } else if (!inputValue || (typeof inputValue === 'string' && !inputValue.trim())) {
        return 'This field is required'
      }
    }

    if (question.validation && typeof inputValue === 'string') {
      const { minLength, maxLength, pattern } = question.validation
      
      if (minLength && inputValue.length < minLength) {
        return `Minimum ${minLength} characters required`
      }
      
      if (maxLength && inputValue.length > maxLength) {
        return `Maximum ${maxLength} characters allowed`
      }
      
      if (pattern && !new RegExp(pattern).test(inputValue)) {
        return 'Invalid format'
      }
    }

    return null
  }

  const handleSubmit = () => {
    const validationError = validateInput(value)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    onSubmit(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && question.type !== 'textarea') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(selectedFiles)
    setValue(selectedFiles.map(f => f.name).join(', '))
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    setValue(newFiles.map(f => f.name).join(', '))
  }

  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <Input
            value={value as string}
            onChange={(e) => setValue(e.target.value)}
            placeholder={question.placeholder}
            onKeyDown={handleKeyDown}
            className={cn(error && "border-destructive")}
          />
        )

      case 'textarea':
        return (
          <Textarea
            value={value as string}
            onChange={(e) => setValue(e.target.value)}
            placeholder={question.placeholder}
            className={cn("min-h-[100px] resize-y", error && "border-destructive")}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && e.ctrlKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
        )

      case 'select':
        return (
          <Select 
            value={value as string} 
            onValueChange={(newValue) => setValue(newValue)}
          >
            <SelectTrigger className={cn(error && "border-destructive")}>
              <SelectValue placeholder={question.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        return (
          <Card className={cn(error && "border-destructive")}>
            <CardContent className="p-3">
              <div className="space-y-2">
                {question.options?.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`option-${option}`}
                      checked={(value as string[]).includes(option)}
                      onCheckedChange={(checked) => {
                        const currentValue = value as string[]
                        if (checked) {
                          setValue([...currentValue, option])
                        } else {
                          setValue(currentValue.filter(v => v !== option))
                        }
                      }}
                    />
                    <Label 
                      htmlFor={`option-${option}`}
                      className="text-sm cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )

      case 'file':
        return (
          <div className="space-y-3">
            <Input
              type="file"
              multiple
              onChange={handleFileChange}
              className={cn(error && "border-destructive")}
              accept=".pdf,.txt,.doc,.docx,.yaml,.yml,.json"
            />
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded border"
                  >
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const isSubmitDisabled = () => {
    if (disabled) return true
    
    if (question.required) {
      if (question.type === 'multiselect') {
        return !Array.isArray(value) || value.length === 0
      }
      return !value || (typeof value === 'string' && !value.trim())
    }
    
    return false
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {question.prompt}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        
        {question.helpText && (
          <p className="text-xs text-muted-foreground">
            💡 {question.helpText}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {renderInput()}
        
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          {question.type === 'textarea' && 'Press Ctrl+Enter to submit'}
          {question.validation?.maxLength && typeof value === 'string' && (
            <span className="ml-2">
              {value.length}/{question.validation.maxLength}
            </span>
          )}
        </div>
        
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitDisabled()}
          size="sm"
        >
          <Send className="h-4 w-4 mr-1.5" />
          Submit
        </Button>
      </div>
    </div>
  )
}