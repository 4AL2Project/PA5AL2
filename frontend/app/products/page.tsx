'use client'

import { useState, useMemo, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { RiskTable } from '@/components/dashboard/risk-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fetchProducts } from '@/lib/api'
import { Product, RiskLevel } from '@/lib/types'
import { Search, Download, Filter, X, Loader2 } from 'lucide-react'

const categories = [
  'Tous',
  'Produits laitiers',
  'Fruits & Legumes',
  'Viandes',
  'Poissons',
  'Boulangerie',
  'Boissons',
  'Epicerie',
]

const riskLevels: { value: RiskLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous les niveaux' },
  { value: 'critical', label: 'Critique' },
  { value: 'high', label: 'Eleve' },
  { value: 'moderate', label: 'Modere' },
  { value: 'medium', label: 'Moyen' },
  { value: 'low', label: 'Faible' },
  { value: 'safe', label: 'Sur' },
]

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tous')
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel | 'all'>('all')

  useEffect(() => {
    fetchProducts()
      .then(({ products }) => setProducts(products))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory =
        selectedCategory === 'Tous' || product.category === selectedCategory

      const matchesRiskLevel =
        selectedRiskLevel === 'all' || product.riskLevel === selectedRiskLevel

      return matchesSearch && matchesCategory && matchesRiskLevel
    })
  }, [products, searchQuery, selectedCategory, selectedRiskLevel])

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('Tous')
    setSelectedRiskLevel('all')
  }

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCategory !== 'Tous' ||
    selectedRiskLevel !== 'all'

  return (
    <DashboardLayout
      title="Produits"
      description={
        loading
          ? 'Chargement...'
          : `${filteredProducts.length} produits sur ${products.length}`
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Filter className="h-4 w-4" />
                Filtres
              </CardTitle>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-muted-foreground"
                >
                  <X className="mr-1 h-4 w-4" />
                  Effacer
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Category Filter */}
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Categorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Risk Level Filter */}
              <Select
                value={selectedRiskLevel}
                onValueChange={(value) =>
                  setSelectedRiskLevel(value as RiskLevel | 'all')
                }
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Niveau de risque" />
                </SelectTrigger>
                <SelectContent>
                  {riskLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Liste des Produits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProducts.length > 0 ? (
              <RiskTable products={filteredProducts} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-lg font-medium">Aucun produit trouve</p>
                <p className="text-sm text-muted-foreground">
                  Essayez de modifier vos criteres de recherche
                </p>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="mt-4"
                >
                  Effacer les filtres
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
