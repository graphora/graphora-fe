import { ReactNode } from 'react'

export type ViewMode = 'code' | 'visual' | 'split'
export type ThemeType = 'monokai' | 'github' | 'dracula'
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ToolbarItem {
  id: string
  icon: ReactNode
  label: string
  action: () => void
  shortcut?: string
  disabled?: boolean
  primary?: boolean
}

export interface CommandCenterLayout {
  mainToolbar: {
    height: 48
    position: 'top'
    tools: ToolbarItem[]
  }
  sidebar: {
    width: 320
    resizable: true
    minWidth: 280
    maxWidth: 480
  }
  mainPanel: {
    defaultView: ViewMode
    views: ViewMode[]
  }
}

export interface PropertyTypePanel {
  sections: {
    scalar: {
      types: ['string', 'integer', 'float', 'boolean', 'date', 'enum']
      constraints: ['required', 'unique', 'indexed']
    }
    complex: {
      types: ['array', 'object', 'reference']
      configuration: Record<string, any>
    }
    custom: {
      definition: Record<string, any>
      validation: Record<string, any>
    }
  }
}

export interface AdvancedControls {
  panels: {
    entityResolution: {
      matching: {
        threshold: number
        rules: any[]
        customLogic: string
      }
      deduplication: {
        strategy: 'strict' | 'fuzzy' | 'custom'
        confidence: number
      }
    }
    performance: {
      caching: {
        enabled: boolean
        strategy: 'memory' | 'disk'
        size: number
      }
      indexing: {
        autoIndex: boolean
        customIndexes: any[]
      }
    }
    batch: {
      size: number
      parallel: boolean
      errorHandling: 'skip' | 'stop' | 'retry'
    }
  }
}

export interface PanelInteractions {
  resize: {
    snap: ['25%', '33%', '50%', '66%']
    doubleClickReset: true
    rememberSize: true
  }
  focus: {
    highlight: true
    autoHideOthers: false
    shortcut: string
  }
  state: {
    persist: true
    sync: true
    restore: () => void
  }
}

export interface QueryBuilder {
  templates: {
    basic: string[]
    advanced: string[]
    custom: string[]
  }
  validation: {
    linting: boolean
    execution: boolean
    performance: boolean
  }
  history: {
    enabled: true
    limit: 50
    persist: true
  }
}

export interface PerformanceControls {
  monitoring: {
    metrics: ['memory', 'cpu', 'io']
    thresholds: any[]
    alerts: boolean
  }
  optimization: {
    autoOptimize: boolean
    suggestions: boolean
    rules: any[]
  }
  diagnostics: {
    logging: LogLevel
    profiling: boolean
    tracing: boolean
  }
}

export const KEYBOARD_SHORTCUTS = {
  'cmd+e': 'focusEditor',
  'cmd+r': 'runQuery',
  'cmd+s': 'saveChanges',
  'cmd+b': 'toggleSidebar',
  'cmd+p': 'commandPalette',
  'cmd+f': 'findInEditor',
  'alt+1': 'focusPropertyPanel',
  'alt+2': 'focusRelationshipPanel'
} as const
