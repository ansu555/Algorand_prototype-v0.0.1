"use client"

import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets"
import { useTheme } from "next-themes"

interface TradingViewChartProps {
    symbol?: string
    theme?: "light" | "dark"
    autosize?: boolean
}

export function TradingViewChart({
    symbol = "BINANCE:ALGOUSDT",
    autosize = true
}: TradingViewChartProps) {
    const { theme } = useTheme()
    const chartTheme = theme === "dark" ? "dark" : "light"

    return (
        <div className="w-full h-[500px] lg:h-[600px] rounded-lg overflow-hidden border border-border bg-card">
            <AdvancedRealTimeChart
                symbol={symbol}
                theme={chartTheme}
                autosize={autosize}
                width="100%"
                height="100%"
                interval="15"
                timezone="Etc/UTC"
                style="1"
                locale="en"
                toolbar_bg="#f1f3f6"
                enable_publishing={false}
                hide_side_toolbar={false}
                allow_symbol_change={true}
                container_id="tradingview_chart"
            />
        </div>
    )
}
