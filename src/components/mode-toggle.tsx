"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { setTheme } = useTheme()

  const handleThemeChange = (theme: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTheme(theme);
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-theme-toggle>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" data-theme-toggle>
          <DropdownMenuItem onClick={(e) => handleThemeChange("light", e)}>Light</DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => handleThemeChange("dark", e)}>Dark</DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => handleThemeChange("system", e)}>System</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
