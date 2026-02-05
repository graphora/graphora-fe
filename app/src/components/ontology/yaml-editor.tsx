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
import { useTheme } from 'next-themes'

interface YAMLEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  height?: string
}

export function YAMLEditor({ value, onChange, readOnly = false, height }: YAMLEditorProps) {
  const [editorValue, setEditorValue] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const { theme } = useTheme()

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
    <div className={`h-full ${isFullScreen ? '' : 'rounded-lg shadow-soft overflow-hidden'} flex flex-col bg-card`}>
      {/* Header with fullscreen button */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-muted/30 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground dark:text-slate-200">YAML Editor</span>
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
      <div className="flex-1 relative min-h-0 bg-white/60 dark:bg-slate-900/55">
        <div className="absolute inset-0 overflow-auto rounded-b-2xl">
          <CodeMirror
            value={editorValue}
            height={height || "100%"}
            extensions={[
              StreamLanguage.define(yaml),
              EditorView.lineWrapping
            ]}
            onChange={handleChange}
            editable={!readOnly}
            style={{
              height: height || '100%',
              minHeight: '100%',
              overflow: 'visible'
            }}
            theme={theme === 'dark' ? 'dark' : 'light'}
            className="text-sm h-full w-full rounded-b-2xl"
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
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] flex flex-col p-0 border-border">
        <div className="flex-1 overflow-auto ">
          {editorComponent}
        </div>
      </DialogContent>
    </Dialog>
  ) : (
    <div className="h-full w-full ">
      {editorComponent}
    </div>
  )
}
