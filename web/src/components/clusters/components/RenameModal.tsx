import { useState, useEffect } from 'react'
import { X, Check, Loader2 } from 'lucide-react'

interface RenameModalProps {
  clusterName: string
  currentDisplayName: string
  onClose: () => void
  onRename: (oldName: string, newName: string) => Promise<void>
}

export function RenameModal({ clusterName, currentDisplayName, onClose, onRename }: RenameModalProps) {
  const [newName, setNewName] = useState(currentDisplayName)
  const [isRenaming, setIsRenaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleRename = async () => {
    if (!newName.trim()) {
      setError('Name cannot be empty')
      return
    }
    if (newName.includes(' ')) {
      setError('Name cannot contain spaces')
      return
    }
    if (newName.trim() === currentDisplayName) {
      setError('Name is unchanged')
      return
    }

    setIsRenaming(true)
    setError(null)

    try {
      await onRename(clusterName, newName.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename context')
    } finally {
      setIsRenaming(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="glass p-6 rounded-lg w-[400px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Rename Context</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Current: <span className="text-foreground font-mono text-xs break-all">{currentDisplayName}</span>
        </p>

        <div className="mb-4">
          <label htmlFor="new-context-name" className="block text-sm text-muted-foreground mb-1">New name</label>
          <input
            id="new-context-name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm font-mono"
            autoFocus
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50">
            Cancel
          </button>
          <button
            onClick={handleRename}
            disabled={isRenaming || !newName.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
          >
            {isRenaming ? <><Loader2 className="w-4 h-4 animate-spin" />Renaming...</> : <><Check className="w-4 h-4" />Rename</>}
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-4">This updates your kubeconfig via the local agent.</p>
      </div>
    </div>
  )
}
