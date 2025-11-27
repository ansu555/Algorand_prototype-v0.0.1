"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Filter, Heart, History, Search, ArrowUpDown } from "lucide-react"

interface LaunchpadFiltersProps {
    searchQuery: string
    onSearchChange: (value: string) => void
    currentFilter: string
    onFilterChange: (value: string) => void
    currentSort: string
    onSortChange: (value: string) => void
}

export function LaunchpadFilters({
    searchQuery,
    onSearchChange,
    currentFilter,
    onFilterChange,
    currentSort,
    onSortChange
}: LaunchpadFiltersProps) {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
            {/* Left: Filter Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto min-w-[140px] justify-between bg-[#111111] border-border/40 hover:bg-accent hover:text-accent-foreground">
                        {currentFilter === 'all' ? 'All Tokens' :
                            currentFilter === 'active' ? 'Active' :
                                currentFilter === 'graduated' ? 'Graduated' : 'All Tokens'}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[140px]">
                    <DropdownMenuItem onClick={() => onFilterChange('all')}>All Tokens</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFilterChange('active')}>Active</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFilterChange('graduated')}>Graduated</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 w-full md:w-auto">
                {/* Favorites Toggle (Mock) */}
                <Button variant="outline" size="icon" className="bg-[#111111] border-border/40">
                    <Heart className="h-4 w-4" />
                </Button>

                {/* History (Mock) */}
                <Button variant="outline" size="icon" className="bg-[#111111] border-border/40">
                    <History className="h-4 w-4" />
                </Button>

                {/* Filter (Mock) */}
                <Button variant="outline" size="icon" className="bg-[#111111] border-border/40">
                    <Filter className="h-4 w-4" />
                </Button>

                {/* Sort Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="min-w-[110px] justify-between bg-[#111111] border-border/40">
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            {currentSort === 'newest' ? 'Newest' :
                                currentSort === 'oldest' ? 'Oldest' :
                                    currentSort === 'marketcap' ? 'Market Cap' : 'Newest'}
                            <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSortChange('newest')}>Newest</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSortChange('oldest')}>Oldest</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSortChange('marketcap')}>Market Cap</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
