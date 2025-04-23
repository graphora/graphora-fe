import { useCallback, useEffect } from 'react'
import { StreamLanguage } from '@codemirror/language'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { parse } from 'yaml'

interface YAMLEditorProps {
  value: string
  onChange: (value: string) => void
  onValidYamlChange?: (value: any) => void
}

export function YAMLEditor({ value, onChange, onValidYamlChange }: YAMLEditorProps) {
  const handleChange = useCallback((value: string) => {
    onChange(value)
    try {
      const parsed = parse(value)
      onValidYamlChange?.(parsed)
    } catch (error) {
      console.error('Invalid YAML:', error)
    }
  }, [onChange, onValidYamlChange])

  useEffect(() => {
    // Parse initial value if it exists
    if (value && onValidYamlChange) {
      try {
        const parsed = parse(value)
        onValidYamlChange(parsed)
      } catch (error) {
        console.error('Invalid initial YAML:', error)
      }
    }
  }, [])

  return (
    <div className="h-full border rounded-md relative overflow-hidden">
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto'
      }}>
        <CodeMirror
          value={value}
          height="100%"
          theme="dark"
          extensions={[
            StreamLanguage.define(yaml),
            EditorView.lineWrapping,
          ]}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
