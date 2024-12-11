// src/components/followers/FilterCategories.tsx
import { FilterStats } from './types'

interface FilterCategoriesProps {
  filterStats: FilterStats[]
  activeFilters: Set<string>
  onFilterChange: (filters: Set<string>) => void
}

export function FilterCategories({ filterStats, activeFilters, onFilterChange }: FilterCategoriesProps) {
  return (
    <div className="mb-6 bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Filter Categories</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filterStats.map(({ rule, count }) => (
          <div 
            key={rule.id}
            className={`p-4 rounded-lg border-2 cursor-pointer ${
              activeFilters.has(rule.id) 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200'
            }`}
            onClick={() => {
              const newFilters = new Set(activeFilters)
              if (newFilters.has(rule.id)) {
                newFilters.delete(rule.id)
              } else {
                newFilters.add(rule.id)
              }
              onFilterChange(newFilters)
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">{rule.name}</h3>
                <p className="text-sm text-gray-500">{rule.description}</p>
              </div>
              <div className="text-2xl font-bold text-blue-600">{count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}