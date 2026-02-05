'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff, Info, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { DatabaseConfig, ConnectionTestResponse } from '@/types/config'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface DatabaseConfigFormProps {
  title: string
  description: string
  config: DatabaseConfig
  onChange: (config: DatabaseConfig) => void
  disabled?: boolean
  isExistingConfig?: boolean
  /** Whether this database is optional */
  isOptional?: boolean
  /** What feature requires this database (e.g., "merge operations") */
  requiredFor?: string
  /** Hint text when the database is not configured */
  notConfiguredHint?: string
}

export function DatabaseConfigForm({
  title,
  description,
  config,
  onChange,
  disabled,
  isExistingConfig,
  isOptional = false,
  requiredFor,
  notConfiguredHint
}: DatabaseConfigFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResponse | null>(null)

  const handleChange = (field: keyof DatabaseConfig, value: string) => {
    onChange({
      ...config,
      [field]: value,
    })
    if (testResult) {
      setTestResult(null)
    }
  }

  const testConnection = async () => {
    if (!config.uri || !config.username) {
      toast.error('Please fill in URI and username before testing')
      return
    }

    if (!isExistingConfig && !config.password) {
      toast.error('Please fill in password for new connection')
      return
    }

    try {
      setTesting(true)
      setTestResult(null)

      const response = await fetch('/api/config/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uri: config.uri,
          username: config.username,
          password: config.password,
        }),
      })

      const result: ConnectionTestResponse = await response.json()
      setTestResult(result)

      if (result.success) {
        toast.success('Connection successful!')
      } else {
        toast.error(`Connection failed: ${result.error || result.message}`)
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      const errorResult: ConnectionTestResponse = {
        success: false,
        message: 'Failed to test connection',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      setTestResult(errorResult)
      toast.error('Failed to test connection')
    } finally {
      setTesting(false)
    }
  }

  const isFormValid = config.uri && config.username && (isExistingConfig || config.password)

  // Determine status and styling
  const getStatusBadge = () => {
    if (isExistingConfig) {
      return (
        <Badge className="border-transparent bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Connected
        </Badge>
      )
    }
    if (isOptional) {
      return (
        <Badge variant="outline" className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
          <Info className="mr-1 h-3 w-3" />
          Optional
        </Badge>
      )
    }
    if (requiredFor) {
      return (
        <Badge variant="outline" className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Required for {requiredFor}
        </Badge>
      )
    }
    return null
  }

  return (
    <Card className="w-full shadow-soft">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${title.toLowerCase()}-name`} className="text-xs">Database name</Label>
            <Input
              id={`${title.toLowerCase()}-name`}
              placeholder="e.g., Staging Neo4j"
              value={config.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${title.toLowerCase()}-username`} className="text-xs">Username</Label>
            <Input
              id={`${title.toLowerCase()}-username`}
              placeholder="neo4j"
              value={config.username || ''}
              onChange={(e) => handleChange('username', e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${title.toLowerCase()}-uri`} className="text-xs">Neo4j URI</Label>
          <Input
            id={`${title.toLowerCase()}-uri`}
            placeholder="neo4j://localhost:7687"
            value={config.uri || ''}
            onChange={(e) => handleChange('uri', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${title.toLowerCase()}-password`} className="text-xs">Password</Label>
          <div className="relative">
            <Input
              id={`${title.toLowerCase()}-password`}
              type={showPassword ? 'text' : 'password'}
              value={config.password || ''}
              onChange={(e) => handleChange('password', e.target.value)}
              disabled={disabled}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0"
              onClick={() => setShowPassword(!showPassword)}
              disabled={disabled}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {isExistingConfig && (
            <p className="text-xs text-muted-foreground">
              Leave blank to keep existing password
            </p>
          )}
        </div>

        {testResult && (
          <Alert className={testResult.success ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : ''} variant={testResult.success ? undefined : 'destructive'}>
            <AlertDescription className="text-xs">
              {testResult.message}
              {testResult.error && ` – ${testResult.error}`}
            </AlertDescription>
          </Alert>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={testConnection}
          disabled={disabled || testing || !isFormValid}
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Connection'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
