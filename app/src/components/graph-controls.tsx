'use client'

import { useState } from 'react'
import { RotateCcw, Save, Undo2, Redo2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface GraphControlsProps {
  onReset: () => Promise<void>
  onSave: () => Promise<void>
  onUndo: () => void
  onRedo: () => void
  onAddNode: () => void
  hasChanges: boolean
  isLoading: boolean
  canUndo: boolean
  canRedo: boolean
}

export function GraphControls({
  onReset,
  onSave,
  onUndo,
  onRedo,
  onAddNode,
  hasChanges,
  isLoading,
  canUndo,
  canRedo
}: GraphControlsProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await onSave()
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      setIsResetting(true)
      setShowResetConfirm(false)
      await onReset()
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onAddNode}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowResetConfirm(true)}
          disabled={isLoading || isResetting}
        >
          <RotateCcw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleSave}
          disabled={!hasChanges || isLoading || isSaving}
        >
          <Save className={`h-4 w-4 ${isSaving ? 'animate-pulse' : ''}`} />
        </Button>
      </div>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Graph Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all your local modifications and reload the graph from the server.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={isResetting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isResetting ? 'Resetting...' : 'Reset Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
