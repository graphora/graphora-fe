'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Database, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
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
}

export function DatabaseConfigForm({ title, description, config, onChange, disabled, isExistingConfig }: DatabaseConfigFormProps) {
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

  return (
    <Card variant="glass" className="w-full border-white/15 bg-white/8 shadow-glass backdrop-blur-panel">
      <CardHeader className="space-y-4 border-b border-white/10 pb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/70 to-primary/40 text-white shadow-glass">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-heading text-foreground">{title}</CardTitle>
              <CardDescription className="text-sm text-foreground/70">{description}</CardDescription>
            </div>
          </div>
          {isExistingConfig && (
            <Badge variant="glass" className="uppercase tracking-[0.14em]">Configured</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-xs text-foreground/80 shadow-inner">
          <div className="flex items-start gap-3">
            <Database className="h-4 w-4 text-primary" />
            <div className="space-y-1.5">
              <p className="font-medium uppercase tracking-[0.16em] text-foreground/70">Secure credential storage</p>
              <p>
                Credentials are encrypted using AES with per-user keys before they leave the browser. Passwords are never stored in plain text and can be rotated safely at any time.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${title.toLowerCase()}-name`}>Database name</Label>
            <Input
              id={`${title.toLowerCase()}-name`}
              placeholder="e.g., Staging Neo4j"
              value={config.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={disabled}
              className="bg-white/5 text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${title.toLowerCase()}-username`}>Username</Label>
            <Input
              id={`${title.toLowerCase()}-username`}
              placeholder="neo4j"
              value={config.username || ''}
              onChange={(e) => handleChange('username', e.target.value)}
              disabled={disabled}
              className="bg-white/5 text-foreground"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${title.toLowerCase()}-uri`}>Neo4j URI</Label>
          <Input
            id={`${title.toLowerCase()}-uri`}
            placeholder="neo4j://localhost:7687 or bolt://localhost:7687"
            value={config.uri || ''}
            onChange={(e) => handleChange('uri', e.target.value)}
            disabled={disabled}
            className="bg-white/5 text-foreground"
          />
          <p className="text-xs text-foreground/60">Use neo4j:// for Aura or clustered deployments, bolt:// for standalone instances.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${title.toLowerCase()}-password`}>Password</Label>
          <div className="relative">
            <Input
              id={`${title.toLowerCase()}-password`}
              type={showPassword ? 'text' : 'password'}
              onChange={(e) => handleChange('password', e.target.value)}
              disabled={disabled}
              className="bg-white/5 pr-12 text-foreground"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full border border-white/20 bg-white/10 p-0 text-foreground/70 hover:bg-white/20"
              onClick={() => setShowPassword(!showPassword)}
              disabled={disabled}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {testResult && (
          <Alert
            className={cn(
              'border-white/20 bg-white/10 text-sm',
              testResult.success ? 'text-success' : 'text-destructive'
            )}
          >
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            <AlertDescription>
              {testResult.message}
              {testResult.error && ` – ${testResult.error}`}
            </AlertDescription>
          </Alert>
        )}

        <Button
          variant="outline"
          onClick={testConnection}
          disabled={disabled || testing || !isFormValid}
          className="border-white/20 text-foreground hover:bg-white/10"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing connection...
            </>
          ) : (
            'Test connection'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
