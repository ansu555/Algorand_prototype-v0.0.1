// "use client"

// import * as React from "react"
// import { ArrowDown, Wallet, Settings, Info } from "lucide-react"

// import { Button } from "@/components/ui/button"
// import {
//   Card,
//   CardContent,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"
// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// import { bridgeTransfer } from "@/services/bridgeService"
// import { toast } from "sonner"
// import { useWalletActions } from "@/components/providers/txnlab-wallet-provider"

// export function BridgeCard() {
//   const [amount, setAmount] = React.useState("")
//   const [fromNetwork, setFromNetwork] = React.useState("Algorand")
//   const [toNetwork, setToNetwork] = React.useState("Ethereum")
//   const [isLoading, setIsLoading] = React.useState(false)

//   const { walletSigner } = useWalletActions()

//   const handleSwitch = () => {
//     setFromNetwork(toNetwork)
//     setToNetwork(fromNetwork)
//   }

//   const handleBridge = async () => {
//     if (!amount) return
//     if (!walletSigner && fromNetwork === 'Algorand') {
//       toast.error("Please connect your Algorand wallet first")
//       return
//     }

//     setIsLoading(true)
//     try {
//       await bridgeTransfer({
//         fromChain: fromNetwork as any,
//         toChain: toNetwork as any,
//         token: "native", // Default to native for now
//         amount: amount,
//         recipientAddress: "mock-recipient", // Placeholder
//         signer: walletSigner as any // Cast to any for now, will fix in service
//       })
//       toast.success("Bridge transfer initiated successfully!")
//     } catch (error) {
//       console.error("Bridge error:", error)
//       toast.error("Failed to initiate bridge transfer.")
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <div className="w-full max-w-[480px] mx-auto p-1">
//       <div className="flex justify-between items-center mb-4 px-2">
//         <div className="flex space-x-1">
//           <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
//             Bridge
//           </Button>
//           <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
//             History
//           </Button>
//         </div>
//         <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
//           <Settings className="h-5 w-5" />
//         </Button>
//       </div>

//       <Card className="border-0 shadow-2xl bg-background/60 backdrop-blur-xl ring-1 ring-white/10 dark:ring-white/5 overflow-hidden rounded-3xl">
//         <CardContent className="p-0">
//           {/* From Section */}
//           <div className="p-6 pb-4 space-y-4 hover:bg-muted/30 transition-colors">
//             <div className="flex justify-between items-center">
//               <span className="text-sm font-medium text-muted-foreground">From</span>
//               <span className="text-xs text-muted-foreground">Balance: 0.00</span>
//             </div>
//             <div className="flex items-center gap-4">
//               <div className="flex-1">
//                 <Input
//                   type="number"
//                   placeholder="0.00"
//                   className="border-0 bg-transparent text-4xl font-bold p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50"
//                   value={amount}
//                   onChange={(e) => setAmount(e.target.value)}
//                 />
//               </div>
//               <div className="shrink-0">
//                 <Select value={fromNetwork} onValueChange={setFromNetwork}>
//                   <SelectTrigger className="w-[140px] h-10 rounded-full bg-muted/50 border-0 hover:bg-muted/80 transition-colors font-medium">
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="Algorand">Algorand</SelectItem>
//                     <SelectItem value="Ethereum">Ethereum</SelectItem>
//                     <SelectItem value="Solana">Solana</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>
//             <div className="flex justify-between items-center">
//               <div className="flex gap-2">
//                 <Button variant="outline" size="xs" className="rounded-full h-6 text-[10px] border-muted-foreground/20 hover:bg-muted" onClick={() => setAmount("100")}>25%</Button>
//                 <Button variant="outline" size="xs" className="rounded-full h-6 text-[10px] border-muted-foreground/20 hover:bg-muted" onClick={() => setAmount("500")}>50%</Button>
//                 <Button variant="outline" size="xs" className="rounded-full h-6 text-[10px] border-muted-foreground/20 hover:bg-muted" onClick={() => setAmount("1000")}>MAX</Button>
//               </div>
//             </div>
//           </div>

//           {/* Switcher */}
//           <div className="relative h-1 bg-background">
//             <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
//               <Button
//                 variant="outline"
//                 size="icon"
//                 className="h-10 w-10 rounded-xl border-4 border-background bg-muted hover:bg-muted-foreground/10 hover:scale-110 transition-all shadow-sm"
//                 onClick={handleSwitch}
//               >
//                 <ArrowDown className="h-5 w-5 text-muted-foreground" />
//               </Button>
//             </div>
//           </div>

//           {/* To Section */}
//           <div className="p-6 pt-4 space-y-4 bg-muted/20">
//             <div className="flex justify-between items-center">
//               <span className="text-sm font-medium text-muted-foreground">To (Estimated)</span>
//             </div>
//             <div className="flex items-center gap-4">
//               <div className="flex-1">
//                 <div className="text-4xl font-bold text-muted-foreground/80">
//                   {amount ? (parseFloat(amount) * 0.999).toFixed(4) : "0.00"}
//                 </div>
//               </div>
//               <div className="shrink-0">
//                 <Select value={toNetwork} onValueChange={setToNetwork}>
//                   <SelectTrigger className="w-[140px] h-10 rounded-full bg-muted/50 border-0 hover:bg-muted/80 transition-colors font-medium">
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="Algorand">Algorand</SelectItem>
//                     <SelectItem value="Ethereum">Ethereum</SelectItem>
//                     <SelectItem value="Solana">Solana</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>
//           </div>

//           {/* Details */}
//           <div className="px-6 py-4 space-y-3">
//             <div className="flex justify-between text-sm">
//               <span className="text-muted-foreground flex items-center gap-1">
//                 Rate <Info className="h-3 w-3" />
//               </span>
//               <span className="font-medium">1 {fromNetwork === 'Algorand' ? 'ALGO' : 'ETH'} ≈ 0.999 {toNetwork === 'Algorand' ? 'ALGO' : 'ETH'}</span>
//             </div>
//             <div className="flex justify-between text-sm">
//               <span className="text-muted-foreground flex items-center gap-1">
//                 Network Cost <Info className="h-3 w-3" />
//               </span>
//               <span className="font-medium text-red-500">~$2.50</span>
//             </div>
//           </div>

//           <div className="p-4">
//             <Button
//               className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
//               onClick={handleBridge}
//               disabled={isLoading}
//             >
//               {isLoading ? "Bridging..." : "Bridge Assets"}
//             </Button>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }
