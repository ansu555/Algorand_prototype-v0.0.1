"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { cn } from "@/lib/utils"

export function BuyPanel() {
	const { activeAccount } = useWalletConnection()
	const isConnected = !!activeAccount

	const [spend, setSpend] = useState("")
	const [receive, setReceive] = useState("")

	const isActionDisabled = !spend || parseFloat(spend) <= 0

	return (
		<div className="flex flex-col gap-y-2">
			<div className="flex flex-col items-center space-y-2">
				{/* Spend (USD) */}
				<div className="flex w-full gap-2 px-3 py-3 min-h-24 items-center justify-between group transition-all duration-300 bg-muted/50 rounded-lg border border-border focus-within:border-primary focus-within:bg-background h-[7.5rem]">
					<div className="space-y-2 flex flex-col grow text-muted-foreground">
						<span className="text-sm font-medium">Spend</span>
						<Input
							type="number"
							placeholder="0"
							value={spend}
							onChange={(e) => setSpend(e.target.value)}
							className="h-9 w-full bg-transparent px-0 py-0 border-0 focus-visible:outline-none focus-visible:ring-0 text-3xl placeholder:text-muted-foreground/50"
						/>
						<span className="h-5 inline-flex items-center whitespace-nowrap text-sm">
							${spend ? parseFloat(spend).toFixed(2) : '0.00'} USD
						</span>
					</div>
					<div className="space-y-2 flex flex-col items-end">
						<div className="h-5"></div>
						<div className="px-2 py-1 text-base font-medium rounded-md bg-secondary">USD</div>
						<div className="h-5"></div>
					</div>
				</div>

				{/* You Get */}
				<div className="flex w-full gap-2 px-3 py-3 min-h-24 items-center justify-between group transition-all duration-300 bg-muted/50 rounded-lg border border-border focus-within:border-primary focus-within:bg-background h-[7.5rem]">
					<div className="space-y-2 flex flex-col grow text-muted-foreground">
						<span className="text-sm font-medium">You Get</span>
						<Input
							type="number"
							placeholder="0"
							value={receive}
							readOnly
							className="h-9 w-full bg-transparent px-0 py-0 border-0 focus-visible:outline-none focus-visible:ring-0 text-3xl placeholder:text-muted-foreground/50 cursor-not-allowed"
						/>
						<span className="h-5 inline-flex items-center whitespace-nowrap text-sm">
							{receive ? parseFloat(receive).toFixed(2) : '0.00'} ALGO
						</span>
					</div>
					<div className="space-y-2 flex flex-col items-end">
						<div className="h-5"></div>
						<div className="px-2 py-1 text-base font-medium rounded-md bg-secondary">ALGO</div>
						<div className="h-5"></div>
					</div>
				</div>
			</div>

			{/* Action Button */}
			{!isConnected ? (
				<Button
					className={cn(
						"w-full h-11 text-base font-semibold rounded-md px-4 py-2.5 active:scale-[0.99] transition-all duration-300",
						"bg-primary hover:bg-primary/90 dark:bg-[#F3C623] dark:hover:bg-[#F3C623]/90",
						"dark:text-black"
					)}
				>
					Connect Wallet
				</Button>
			) : (
				<Button
					className={cn(
						"w-full h-11 text-base font-semibold rounded-md px-4 py-2.5 active:scale-[0.99] transition-all duration-300",
						"bg-primary hover:bg-primary/90 dark:bg-[#F3C623] dark:hover:bg-[#F3C623]/90",
						"dark:text-black",
						"disabled:opacity-50 disabled:cursor-not-allowed"
					)}
					disabled={isActionDisabled}
				>
					{isActionDisabled ? "Enter Amount" : "Buy"}
				</Button>
			)}
		</div>
	)
}
