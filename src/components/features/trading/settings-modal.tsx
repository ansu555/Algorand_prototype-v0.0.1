"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slippage: string
  onSlippageChange: (slippage: string) => void
}

export function SettingsModal({ open, onOpenChange, slippage, onSlippageChange }: SettingsModalProps) {
  const [autoSlippage, setAutoSlippage] = useState(false)
  const [customSlippage, setCustomSlippage] = useState(slippage)

  const presetSlippages = ['0.1', '0.5', '1.0']

  const handleSlippageChange = (value: string) => {
    setCustomSlippage(value)
    onSlippageChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-gray-100 dark:bg-slate-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Adjust to your personal preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="relative rounded-xl border border-accent shadow-sm bg-white dark:bg-background p-4">
            {/* Automatic Slippage Toggle */}
            <div className="flex justify-between items-center gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium leading-none">
                  Automatic Slippage Tolerance
                </Label>
                <span className="text-sm text-muted-foreground">
                  Turn off automatic slippage tolerance<br />to adjust the value.
                </span>
              </div>
              <Switch
                checked={autoSlippage}
                onCheckedChange={setAutoSlippage}
              />
            </div>

            {/* Divider */}
            <div className="my-4 h-px w-full bg-gray-900/5 dark:bg-slate-200/5"></div>

            {/* Slippage Section */}
            <div className="flex justify-between gap-[60px]">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  Slippage
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Label>
              </div>
              <span className="text-gray-600 dark:text-slate-400 text-sm font-semibold">
                {customSlippage}%
              </span>
            </div>

            {/* Slippage Options - Always Visible */}
            <div className="mt-4">
              <div className="flex gap-1 items-center border border-accent rounded-xl bg-secondary p-0.5">
                {/* Preset Buttons */}
                <div className="flex gap-1 items-center flex-1">
                  {presetSlippages.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={autoSlippage}
                      className={cn(
                        "flex-1 h-[40px] px-4 rounded-xl font-medium transition-colors",
                        customSlippage === preset && !autoSlippage && "bg-accent text-accent-foreground",
                        autoSlippage && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => handleSlippageChange(preset)}
                    >
                      {preset}%
                    </Button>
                  ))}
                </div>

                {/* Divider */}
                <div className="h-[36px] w-[1px] bg-gray-900/5 dark:bg-slate-200/5"></div>

                {/* Custom Input */}
                <div className="flex items-center w-[120px]">
                  <Input
                    type="number"
                    value={customSlippage}
                    onChange={(e) => handleSlippageChange(e.target.value)}
                    placeholder="Custom"
                    disabled={autoSlippage}
                    className="flex-1 h-[40px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-r-none disabled:opacity-50"
                  />
                  <div className="h-[40px] px-3 flex items-center text-muted-foreground font-medium">
                    %
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
