"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Search, RefreshCw } from "lucide-react"
import { useGetExchangesQuery } from "@/app/services/exchangeApi"
import { Skeleton } from "@/components/ui/skeleton"

export function ExchangesList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // Fetch exchanges from CoinGecko API
  const { data: exchanges, isFetching, error, refetch } = useGetExchangesQuery(undefined);
  
  // For debugging
  console.log('Exchanges API Response:', exchanges);

  // Define exchange type
  interface Exchange {
    id: string;
    name: string;
    country?: string | null;
    image?: string;
    trust_score?: number;
    trade_volume_24h_btc: number;
    year_established?: number | null;
  }

  // Filter exchanges based on search term
  const filteredExchanges = exchanges 
    ? exchanges.filter(
        (exchange: Exchange) =>
          exchange.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (exchange.country && exchange.country.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  // Pagination
  const totalPages = Math.ceil((filteredExchanges?.length || 0) / itemsPerPage)
  const paginatedExchanges = filteredExchanges.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search exchanges..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh data" className="self-start sm:self-auto">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error ? (
        <div className="text-center p-6 border rounded-md text-red-500">
          Error loading exchange data. Please try again later.
        </div>
      ) : isFetching ? (
        <LoadingSkeleton />
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-xs sm:text-sm">Rank</TableHead>
                  <TableHead className="min-w-[120px] text-xs sm:text-sm">Exchange</TableHead>
                  <TableHead className="text-center min-w-[90px] text-xs sm:text-sm hidden sm:table-cell">Trust Score</TableHead>
                  <TableHead className="text-right min-w-[100px] text-xs sm:text-sm">24h Volume</TableHead>
                  <TableHead className="text-right hidden lg:table-cell text-xs sm:text-sm">Year Est.</TableHead>
                  <TableHead className="hidden xl:table-cell text-xs sm:text-sm">Country</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedExchanges.length > 0 ? (
                  paginatedExchanges.map((exchange: Exchange, index: number) => (
                    <TableRow key={exchange.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-xs sm:text-sm">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell className="min-w-[120px]">
                        <Link
                          href={`/exchanges/${exchange.id}`}
                          className="flex items-center hover:text-primary transition-colors"
                        >
                        {exchange.image ? (
                          <Image 
                            src={exchange.image}
                            alt={exchange.name}
                            width={32}
                            height={32}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full mr-2 sm:mr-3 object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full mr-2 sm:mr-3 flex items-center justify-center text-xs">
                            {exchange.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="font-medium text-xs sm:text-sm">{exchange.name}</div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <div className="inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 text-xs sm:text-sm">
                        {exchange.trust_score || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs sm:text-sm">
                      ${(exchange.trade_volume_24h_btc * 28000 / 1000000000).toFixed(1)}B
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell text-xs sm:text-sm">
                      {exchange.year_established || "N/A"}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-xs sm:text-sm">
                      {exchange.country || "N/A"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    {searchTerm ? (
                      <>No exchanges found matching your search.</>
                    ) : (
                      <>No exchange data available.</>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {!isFetching && filteredExchanges.length > 0 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (currentPage > 1) setCurrentPage(currentPage - 1)
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNumber =
                currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i

              if (pageNumber <= 0 || pageNumber > totalPages) return null

              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentPage(pageNumber)
                    }}
                    isActive={currentPage === pageNumber}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      
      {/* Debug panel - only in development */}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded border text-xs">
          <details>
            <summary className="cursor-pointer font-medium">Debug API Response</summary>
            <pre className="mt-2 p-2 bg-black text-green-400 overflow-auto max-h-[400px]">
              {JSON.stringify(exchanges, null, 2) || "No data yet"}
            </pre>
          </details>
        </div>
      )} */}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Rank</TableHead>
            <TableHead>Exchange</TableHead>
            <TableHead className="text-center">Trust Score</TableHead>
            <TableHead className="text-right">24h Volume</TableHead>
            <TableHead className="text-right hidden md:table-cell">Year Est.</TableHead>
            <TableHead className="hidden lg:table-cell">Country</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-4" /></TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Skeleton className="h-8 w-8 rounded-full mr-3" />
                  <div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center"><Skeleton className="h-8 w-8 rounded-full mx-auto" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
              <TableCell className="text-right hidden md:table-cell"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
              <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
