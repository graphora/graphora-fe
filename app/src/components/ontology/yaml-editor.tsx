import { useCallback, useEffect, useState } from 'react'
import { javascript } from '@codemirror/lang-javascript'
import { StreamLanguage } from '@codemirror/language'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { parse } from 'yaml'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Maximize, Minimize } from 'lucide-react'

interface YAMLEditorProps {
  value: string
  onChange: (value: string) => void
}

export function YAMLEditor({ value, onChange }: YAMLEditorProps) {
  const [editorValue, setEditorValue] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)

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

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen)
  }

  const editorComponent = (
    <div className={`h-full ${isFullScreen ? '' : 'border rounded-md'} flex flex-col`}>
      {/* Header with fullscreen button */}
      <div className="sticky top-0 z-10 bg-background border-b px-2 py-1 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">YAML Editor</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFullScreen}
          className="h-6 w-6 p-0"
        >
          {isFullScreen ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
        </Button>
      </div>
      
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

  return isFullScreen ? (
    <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] flex flex-col p-0 bg-background border-border">
        <DialogHeader className="p-4 border-b border-border bg-background">
          <DialogTitle className="text-foreground">YAML Editor (Full Screen)</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-background">
          {editorComponent}
        </div>
      </DialogContent>
    </Dialog>
  ) : (
    <div className="h-full w-full bg-background">
      {editorComponent}
    </div>
  )
}
