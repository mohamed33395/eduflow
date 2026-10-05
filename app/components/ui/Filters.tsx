import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { X } from "lucide-react"

interface FilterOption {
  value: string
  label: string
}

interface FiltersProps {
  options: FilterOption[]
  selectedFilters: string[]
  onFilterChange: (filters: string[]) => void
  className?: string
}

export function Filters({
  options,
  selectedFilters,
  onFilterChange,
  className,
}: FiltersProps) {
  const toggleFilter = (value: string) => {
    const newFilters = selectedFilters.includes(value)
      ? selectedFilters.filter((f) => f !== value)
      : [...selectedFilters, value]
    onFilterChange(newFilters)
  }

  const clearAll = () => {
    onFilterChange([])
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedFilters.includes(option.value)
          return (
            <Badge
              key={option.value}
              variant={isSelected ? "default" : "outline"}
              className="cursor-pointer transition-colors"
              onClick={() => toggleFilter(option.value)}
            >
              {option.label}
              {isSelected && <X className="ml-1 h-3 w-3" />}
            </Badge>
          )
        })}
      </div>
      {selectedFilters.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="mt-2 text-xs"
        >
          Clear all filters
        </Button>
      )}
    </div>
  )
}
