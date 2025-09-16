"use client"

import React from "react"
import { useMemo, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Check, ChevronsUpDown, X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useGetCryptosQuery } from "@/app/services/cryptoApi"

// Types
export type CoinOption = {
  id: string
  symbol: string
  name?: string
  iconUrl?: string
}

export type BuiltRule = {
  strategy: "DCA" | "REBALANCE" | "ROTATE"
  coins: string[] // coin ids
  triggerType: "priceDrop" | "trend" | "momentum"
  dropPercent?: number
  trendWindow?: "24h" | "7d" | "30d"
  trendThreshold?: number
  momentumLookback?: number
  momentumThreshold?: number
  rotateTopN?: number
  maxSpendUsd: number
  maxSlippagePercent: number
  cooldownMinutes: number
}

const schema = z
  .object({
    strategy: z.enum(["DCA", "REBALANCE", "ROTATE"], {
      required_error: "Select a strategy",
    }),
    coins: z.array(z.string()).default([]),
    triggerType: z.enum(["priceDrop", "trend", "momentum"], {
      required_error: "Select a trigger",
    }),
  dropPercent: z.coerce.number().optional(),
    trendWindow: z.enum(["24h", "7d", "30d"]).optional(),
    trendThreshold: z.number().optional(),
    momentumLookback: z.number().optional(),
    momentumThreshold: z.number().optional(),
    rotateTopN: z.number().optional(),
    maxSpendUsd: z.number().min(0, { message: "Must be >= 0" }),
    maxSlippagePercent: z
      .number()
      .min(0, { message: "Must be >= 0" })
      .max(100, { message: "Must be <= 100" }),
    cooldownMinutes: z.number().min(0, { message: "Must be >= 0" }),
  })
  .superRefine((data, ctx) => {
    // Conditional requirements based on trigger
    if (data.triggerType === "priceDrop") {
      if (typeof data.dropPercent !== "number") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dropPercent"],
          message: "Required for Price Drop trigger",
        })
      }
    }
    if (data.triggerType === "trend") {
      if (!data.trendWindow) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["trendWindow"],
          message: "Select a window",
        })
      }
      if (typeof data.trendThreshold !== "number") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["trendThreshold"],
          message: "Set a threshold",
        })
      }
    }
    if (data.triggerType === "momentum") {
      if (typeof data.momentumLookback !== "number") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["momentumLookback"],
          message: "Set lookback",
        })
      }
      if (typeof data.momentumThreshold !== "number") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["momentumThreshold"],
          message: "Set threshold",
        })
      }
    }
    if (data.strategy === "ROTATE" && typeof data.rotateTopN !== "number") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rotateTopN"],
        message: "Set Top N for Rotate",
      })
    }
  })

export type RuleBuilderModalProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  availableCoins?: CoinOption[]
  initialCoins?: string[] // coin ids
  defaultValues?: Partial<BuiltRule>
  onSave?: (rule: BuiltRule) => void
  onPreview?: (rule: BuiltRule) => void
}

const defaultCoinOptions: CoinOption[] = [
  { id: "bitcoin", symbol: "BTC" },
  { id: "ethereum", symbol: "ETH" },
  { id: "solana", symbol: "SOL" },
]

export function RuleBuilderModal(props: RuleBuilderModalProps) {
  const {
    open,
    onOpenChange,
    trigger,
    availableCoins: availableCoinsProp,
    initialCoins = [],
    defaultValues,
    onPreview,
    onSave,
  } = props

  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = typeof open === "boolean" && !!onOpenChange
  const modalOpen = isControlled ? open! : internalOpen
  const setModalOpen = isControlled ? onOpenChange! : setInternalOpen

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      strategy: defaultValues?.strategy ?? "DCA",
      coins: defaultValues?.coins ?? initialCoins ?? [],
      triggerType: defaultValues?.triggerType ?? "priceDrop",
      dropPercent: defaultValues?.dropPercent ?? 5,
      trendWindow: defaultValues?.trendWindow ?? "24h",
      trendThreshold: defaultValues?.trendThreshold ?? 3,
      momentumLookback: defaultValues?.momentumLookback ?? 7,
      momentumThreshold: defaultValues?.momentumThreshold ?? 3,
      rotateTopN: defaultValues?.rotateTopN ?? 3,
      maxSpendUsd: defaultValues?.maxSpendUsd ?? 100,
      maxSlippagePercent: defaultValues?.maxSlippagePercent ?? 0.5,
      cooldownMinutes: defaultValues?.cooldownMinutes ?? 60,
    },
  })

  const values = form.watch()

  // Local text state for drop percent to allow free typing and commit on blur
  const [dropPercentText, setDropPercentText] = useState<string>("")
  useEffect(() => {
    if (values.triggerType === "priceDrop") {
      setDropPercentText(
        values.dropPercent !== undefined && values.dropPercent !== null
          ? String(values.dropPercent)
          : ""
      )
    } else {
      setDropPercentText("")
    }
  }, [values.dropPercent, values.triggerType, modalOpen])

  // If no coin options provided, fetch from API (top 50) and map to options
  const { data: apiCoinsData } = useGetCryptosQuery(50, { skip: !!availableCoinsProp })
  const apiCoinOptions: CoinOption[] = useMemo(() => {
    const coins = (apiCoinsData as any)?.coins ?? []
    return coins.map((c: any) => ({ id: c.uuid || c.id, symbol: c.symbol, name: c.name, iconUrl: c.iconUrl || c.icon || c.image }))
  }, [apiCoinsData])

  const coinOptions: CoinOption[] = useMemo(() => {
    if (availableCoinsProp && availableCoinsProp.length) return availableCoinsProp
    if (apiCoinOptions.length) return apiCoinOptions
    return defaultCoinOptions
  }, [availableCoinsProp, apiCoinOptions])

  const commitDropPercent = () => {
    if (values.triggerType === "priceDrop") {
      const v = dropPercentText.replace(/,/g, "").trim()
      const num = v === "" ? undefined : Number(v)
      // Only update if it differs
      if ((num ?? undefined) !== (values.dropPercent ?? undefined)) {
        form.setValue("dropPercent", num as any, { shouldValidate: false, shouldDirty: true })
      }
    }
  }

  const handlePreview = () => {
    commitDropPercent()
    const data = form.getValues()
    const parsed = schema.safeParse(data)
    if (parsed.success) {
      onPreview?.(parsed.data)
    } else {
      // force display errors
      form.handleSubmit(() => {})()
    }
  }

  const handleSave = () => {
    commitDropPercent()
    const data = form.getValues()
    const parsed = schema.safeParse(data)
    if (parsed.success) {
      onSave?.(parsed.data)
      setModalOpen(false)
    } else {
      form.handleSubmit(() => {})()
    }
  }

  const coinIndexById = useMemo(() => {
    const map = new Map<string, CoinOption>()
    ;(coinOptions || []).forEach((c) => map.set(c.id, c))
    return map
  }, [coinOptions])

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Auto-Pilot Rule</DialogTitle>
          <DialogDescription>
            Define your strategy, choose coins, and set risk controls.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSave()
            }}
            className="space-y-6"
          >
            {/* Strategy */}
            <FormField
              control={form.control}
              name="strategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DCA">DCA</SelectItem>
                        <SelectItem value="REBALANCE">Rebalance</SelectItem>
                        <SelectItem value="ROTATE">Rotate Top N</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  {/* Description split to avoid invalid <p><ul> nesting */}
                  <div className="space-y-2">
                    <FormDescription>Strategies:</FormDescription>
                    <ul className="list-disc ml-4 space-y-1 text-sm text-muted-foreground">
                      <li><span className="font-medium">DCA</span>: invest fixed amounts on a schedule</li>
                      <li><span className="font-medium">Rebalance</span>: maintain target allocations</li>
                      <li><span className="font-medium">Rotate Top N</span>: shift into the top N trending coins</li>
                    </ul>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coins (hidden when ROTATE) */}
            {values.strategy !== "ROTATE" && (
              <FormField
                control={form.control}
                name="coins"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coins</FormLabel>
                    <FormControl>
                      <CoinsMultiSelect
                        options={coinOptions}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Choose one or more coins. Prefilled from the coin page when available.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Rotate Top N */}
            {values.strategy === "ROTATE" && (
              <FormField
                control={form.control}
                name="rotateTopN"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rotate Top N</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      The agent will rotate into the top N trending coins.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Trigger */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="triggerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(v) => field.onChange(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select trigger" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="priceDrop">Price drop %</SelectItem>
                          <SelectItem value="trend">Trend</SelectItem>
                          <SelectItem value="momentum">Momentum</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {values.triggerType === "priceDrop" && (
                <FormField
                  control={form.control}
                  name="dropPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Drop percent</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          type="text"
                          value={dropPercentText}
                          onChange={(e) => {
                            setDropPercentText(e.target.value)
                          }}
                          onBlur={() => {
                            const v = dropPercentText.replace(/,/g, "").trim()
                            if (v === "") {
                              field.onChange(undefined)
                              return
                            }
                            const num = Number(v)
                            if (!Number.isNaN(num)) {
                              field.onChange(num)
                            }
                          }}
                          placeholder="e.g. 3"
                        />
                      </FormControl>
                      <FormDescription>% price decrease to trigger.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {values.triggerType === "trend" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="trendWindow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Window</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(v) => field.onChange(v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="24h">24h</SelectItem>
                              <SelectItem value="7d">7d</SelectItem>
                              <SelectItem value="30d">30d</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trendThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Threshold %</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.1}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {values.triggerType === "momentum" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="momentumLookback"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lookback (days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="momentumThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Threshold %</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.1}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Risk controls */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="maxSpendUsd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max spend (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxSlippagePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max slippage (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cooldownMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cooldown (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handlePreview}>
                Preview Rule
              </Button>
              <Button type="submit">Save Rule</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// Simple MultiSelect built with Popover + Command + Checkbox
function CoinsMultiSelect({
  options,
  value,
  onChange,
}: {
  options: CoinOption[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)

  const selected = useMemo(
    () => options.filter((o) => value?.includes(o.id)),
    [options, value]
  )

  const toggle = (id: string) => {
    if (!Array.isArray(value)) return onChange([id])
    if (value.includes(id)) onChange(value.filter((v) => v !== id))
    else onChange([...value, id])
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between" type="button">
            {selected.length ? (
              <span className="flex items-center gap-2 min-w-0">
                <span className="flex -space-x-1.5">
                  {selected.slice(0, 3).map((s) => (
                    <img
                      key={s.id}
                      src={s.iconUrl || "/placeholder-logo.png"}
                      alt={s.symbol}
                      className="h-5 w-5 rounded-full border bg-white object-cover"
                      loading="lazy"
                    />
                  ))}
                </span>
                <span className="truncate">{selected.map((s) => s.symbol).join(", ")}{selected.length > 3 ? ` +${selected.length - 3}` : ""}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Select coins...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search coins..." />
            <CommandList className="max-h-48 overflow-y-auto overscroll-contain">
              <CommandEmpty>No coins found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const checked = value?.includes(opt.id)
                  return (
                    <CommandItem
                      key={opt.id}
                      onSelect={() => toggle(opt.id)}
                      className="flex items-center gap-2"
                    >
                      <img
                        src={opt.iconUrl || "/placeholder-logo.png"}
                        alt={opt.symbol}
                        className="h-5 w-5 rounded-full border bg-white object-cover"
                        loading="lazy"
                      />
                      <span className="font-medium">{opt.symbol}</span>
                      {opt.name ? <span className="text-xs text-muted-foreground">{opt.name}</span> : null}
                      {checked ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((s) => (
            <Badge key={s.id} variant="secondary" className="gap-1">
              <img
                src={s.iconUrl || "/placeholder-logo.png"}
                alt={s.symbol}
                className="h-3.5 w-3.5 rounded-full border bg-white object-cover"
                loading="lazy"
              />
              <span>{s.symbol}</span>
              <button
                type="button"
                className="ml-1 opacity-70 hover:opacity-100"
                onClick={() => toggle(s.id)}
                aria-label={`Remove ${s.symbol}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default RuleBuilderModal
