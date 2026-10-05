"use client"

import { useState } from "react"
import { Search as SearchIcon, X } from "lucide-react"
import { Input } from "@/app/components/ui/input"
import { Button } from "@/app/components/ui/button"
import { cn } from "@/app/lib/utils"

interface SearchProps {
  placeholder?: string
  onSearch: (query: string) => void
  className?: string
}

export function Search({
  placeholder = "Search...",
  onSearch,
  className,
}: SearchProps) {
  const [query, setQuery] = useState("")

  const handleClear = () => {
    setQuery("")
    onSearch("")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    onSearch(value)
  }

  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        className="pl-10 pr-10"
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
