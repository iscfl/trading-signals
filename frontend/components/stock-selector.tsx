"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

// Mock stock data
const stocks = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
]

interface StockSelectorProps {
  onSelect: (symbol: string) => void
  selectedStock: string | null
}

export default function StockSelector({ onSelect, selectedStock }: StockSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredStocks = searchQuery
    ? stocks.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stock.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : stocks

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search stocks..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
            {selectedStock
              ? stocks.find((stock) => stock.symbol === selectedStock)?.symbol || "Select stock..."
              : "Select stock..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search stocks..." />
            <CommandList>
              <CommandEmpty>No stocks found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {filteredStocks.map((stock) => (
                  <CommandItem
                    key={stock.symbol}
                    value={stock.symbol}
                    onSelect={() => {
                      onSelect(stock.symbol)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", selectedStock === stock.symbol ? "opacity-100" : "opacity-0")}
                    />
                    <div className="flex flex-col">
                      <span>{stock.symbol}</span>
                      <span className="text-xs text-muted-foreground">{stock.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {stocks.slice(0, 6).map((stock) => (
          <Button
            key={stock.symbol}
            variant={selectedStock === stock.symbol ? "default" : "outline"}
            className="justify-start"
            onClick={() => onSelect(stock.symbol)}
          >
            {stock.symbol}
          </Button>
        ))}
      </div>
    </div>
  )
}
