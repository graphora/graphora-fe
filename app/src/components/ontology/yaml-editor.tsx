import { useCallback, useEffect, useState } from 'react'
import { javascript } from '@codemirror/lang-javascript'
import { StreamLanguage } from '@codemirror/language'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { parse } from 'yaml'

interface YAMLEditorProps {
  value: string
  onChange: (value: string) => void
}

export function YAMLEditor({ value, onChange }: YAMLEditorProps) {
  const [editorValue, setEditorValue] = useState(value)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only update if the value has changed and is not the same as the editor value
    if (value !== editorValue) {
      setEditorValue(value)
    }
  }, [value, editorValue])

  const handleChange = useCallback((value: string) => {
    setEditorValue(value)
    setError(null)

    try {
      // Try to parse the YAML to validate it
      parse(value)
      onChange(value)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [onChange])

  return (
    <div className="h-full border rounded-md flex flex-col">
      {/* Main editor container with proper overflow handling */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0 overflow-auto">
          <CodeMirror
            value={editorValue}
            height="100%"
            extensions={[
              StreamLanguage.define(yaml),
              EditorView.lineWrapping
            ]}
            onChange={handleChange}
            style={{ 
              height: '100%', 
              minHeight: '100%',
              overflow: 'visible' 
            }}
            theme="dark"
            className="text-sm h-full"
          />
        </div>
      </div>
      
      {/* Error message shown at the bottom */}
      {error && (
        <div className="p-2 bg-red-100 text-red-800 border-t border-red-200 text-xs z-10">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  )
}
