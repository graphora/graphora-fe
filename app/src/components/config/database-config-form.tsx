'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
        <span className="gx-badge success">
          <CheckCircle2 className="h-[10px] w-[10px]" />
          connected
        </span>
      )
    }
    if (isOptional) {
      return (
        <span className="gx-badge info">
          <Info className="h-[10px] w-[10px]" />
          optional
        </span>
      )
    }
    if (requiredFor) {
      return (
        <span className="gx-badge warn">
          <AlertTriangle className="h-[10px] w-[10px]" />
          required for {requiredFor}
        </span>
      )
    }
    return null
  }

  return (
    <div
      className="w-full"
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--fg)', margin: 0, letterSpacing: '-0.01em' }}>
              {title}
            </h3>
            <p style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 2, lineHeight: 1.45 }}>
              {description}
            </p>
          </div>
          {getStatusBadge()}
        </div>
      </div>
      <div style={{ padding: 16 }} className="space-y-4">

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${title.toLowerCase()}-name`} style={{ fontSize: 11.5, color: 'var(--fg-muted)', fontWeight: 500 }}>Database name</Label>
            <Input
              id={`${title.toLowerCase()}-name`}
              placeholder="e.g., Staging Neo4j"
              value={config.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${title.toLowerCase()}-username`} style={{ fontSize: 11.5, color: 'var(--fg-muted)', fontWeight: 500 }}>Username</Label>
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
          <Label htmlFor={`${title.toLowerCase()}-uri`} style={{ fontSize: 11.5, color: 'var(--fg-muted)', fontWeight: 500 }}>Neo4j URI</Label>
          <Input
            id={`${title.toLowerCase()}-uri`}
            placeholder="neo4j://localhost:7687"
            value={config.uri || ''}
            onChange={(e) => handleChange('uri', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${title.toLowerCase()}-password`} style={{ fontSize: 11.5, color: 'var(--fg-muted)', fontWeight: 500 }}>Password</Label>
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
          testResult.success ? (
            <div
              style={{
                padding: '10px 12px',
                background: 'color-mix(in oklch, var(--gx-success), transparent 92%)',
                border: '1px solid color-mix(in oklch, var(--gx-success), transparent 70%)',
                borderRadius: 'var(--r-sm)',
                fontSize: 12,
                color: 'var(--fg)',
              }}
            >
              <span className="gx-mono" style={{ color: 'var(--gx-success)', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 6 }}>
                OK
              </span>
              {testResult.message}
              {testResult.error && ` – ${testResult.error}`}
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                {testResult.message}
                {testResult.error && ` – ${testResult.error}`}
              </AlertDescription>
            </Alert>
          )
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
              Testing…
            </>
          ) : (
            'Test connection'
          )}
        </Button>
      </div>
    </div>
  )
}
