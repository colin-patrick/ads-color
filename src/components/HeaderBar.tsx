import { Button } from './ui/button'
import { SidebarTrigger } from './ui/sidebar'
import { Moon, Sun } from 'lucide-react'

interface HeaderBarProps {
  toggleTheme: () => void
}

export function HeaderBar({ toggleTheme }: HeaderBarProps) {
  return (
    <div className="bg-background border-b border-border px-4 py-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <SidebarTrigger className="h-9 w-9" />
          <h1 className="text-xl font-bold text-foreground">ADS Color Generator</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-9 h-9 p-0"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </div>
  )
} 