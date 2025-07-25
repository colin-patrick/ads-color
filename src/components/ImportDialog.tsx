import { Dialog, DialogContent } from './ui/dialog'
import { Button } from './ui/button'
import { Palette } from '../types'

interface ImportDialogProps {
  importConfirmOpen: boolean
  setImportConfirmOpen: (value: boolean) => void
  palettes: Palette[]
  pendingImportData: { palettes: Palette[], activePaletteId: string } | null
  handleImportAdd: () => void
  handleImportReplace: () => void
  handleImportCancel: () => void
}

export function ImportDialog({
  importConfirmOpen,
  setImportConfirmOpen,
  palettes,
  pendingImportData,
  handleImportAdd,
  handleImportReplace,
  handleImportCancel
}: ImportDialogProps) {
  return (
    <Dialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
      <DialogContent className="sm:max-w-md">
        <div className="flex items-center space-x-2">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Import Palettes</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You currently have {palettes.length} palette(s). How would you like to import the {pendingImportData?.palettes.length} new palette(s)?
            </p>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3 mt-6">
          <Button onClick={handleImportAdd} variant="default" className="justify-start">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add to existing palettes
            <span className="ml-auto text-xs text-muted-foreground">
              Keep all {palettes.length} + add {pendingImportData?.palettes.length}
            </span>
          </Button>
          
          <Button onClick={handleImportReplace} variant="outline" className="justify-start">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Replace all palettes
            <span className="ml-auto text-xs text-muted-foreground">
              Delete {palettes.length}, keep {pendingImportData?.palettes.length}
            </span>
          </Button>
          
          <Button onClick={handleImportCancel} variant="ghost" className="justify-center">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 