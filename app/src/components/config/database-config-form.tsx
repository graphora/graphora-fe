'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Database, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { DatabaseConfig, ConnectionTestResponse } from '@/types/config'
import { toast } from 'sonner'

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
    // Clear test result when config changes
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
    <Card className="w-full">
      <CardHeader>
        {/* <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {title}
        </CardTitle> */}
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${title.toLowerCase()}-name`}>Database Name</Label>
          <Input
            id={`${title.toLowerCase()}-name`}
            placeholder="e.g., Staging Neo4j, Production Neo4j"
            value={config.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${title.toLowerCase()}-uri`}>Neo4j URI</Label>
          <Input
            id={`${title.toLowerCase()}-uri`}
            placeholder="neo4j://localhost:7687 or bolt://localhost:7687"
            value={config.uri || ''}
            onChange={(e) => handleChange('uri', e.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-gray-500">
            Use neo4j:// for Neo4j 4.0+ or bolt:// for older versions
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${title.toLowerCase()}-username`}>Username</Label>
          <Input
            id={`${title.toLowerCase()}-username`}
            placeholder="neo4j"
            value={config.username || ''}
            onChange={(e) => handleChange('username', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${title.toLowerCase()}-password`}>Password</Label>
          <div className="relative">
            <Input
              id={`${title.toLowerCase()}-password`}
              type={showPassword ? 'text' : 'password'}
              // placeholder={isExistingConfig ? "Leave blank to keep existing password" : "password"}
              // value={isExistingConfig ? '' : (config.password || '')}
              onChange={(e) => handleChange('password', e.target.value)}
              disabled={disabled}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={disabled}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {/* {isExistingConfig && (
            <p className="text-xs text-gray-500">
              Password is already configured. Only fill this if you want to update it.
            </p>
          )} */}
        </div>

        {testResult && (
          <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
              {testResult.message}
              {testResult.error && ` - ${testResult.error}`}
            </AlertDescription>
          </Alert>
        )}

        <Button
          variant="outline"
          onClick={testConnection}
          disabled={disabled || testing || !isFormValid}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Testing Connection...
            </>
          ) : (
            'Test Connection'
          )}
        </Button>
      </CardContent>
    </Card>
  )
} 