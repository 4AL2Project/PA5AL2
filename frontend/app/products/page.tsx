'use client';

import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { RiskTable } from '@/components/dashboard/risk-table';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UploadModal } from '@/components/upload/upload-modal';
import { fetchProducts } from '@/lib/api';
import { Product, RiskLevel } from '@/lib/types';

const categories = [
  'Tous',
  'Soins visage',
  'Soins corps',
  'Maquillage',
  'Cheveux',
  'Solaire',
  'Parfumerie',
  'Soins levres',
];

const riskLevels: { value: RiskLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous les niveaux' },
  { value: 'critical', label: 'Don associatif' },
  { value: 'high', label: 'Vente B2C' },
  { value: 'safe', label: 'Sur' },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel | 'all'>(
    'all'
  );

  useEffect(() => {
    fetchProducts()
      .then(({ products }) => setProducts(products))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'Tous' || product.category === selectedCategory;
      const matchesRiskLevel =
        selectedRiskLevel === 'all' || product.riskLevel === selectedRiskLevel;
      return matchesSearch && matchesCategory && matchesRiskLevel;
    });
  }, [products, searchQuery, selectedCategory, selectedRiskLevel]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Tous');
    setSelectedRiskLevel('all');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCategory !== 'Tous' ||
    selectedRiskLevel !== 'all';

  return (
    <DashboardLayout
      title="Produits"
      description={
        loading
          ? 'Chargement...'
          : `${filteredProducts.length} produits sur ${products.length}`
      }
      actions={
        <UploadModal
          defaultFileType="products"
          trigger={
            <Button variant="outline" size="sm">
              Importer produits
            </Button>
          }
        />
      }
    >
      <div className="space-y-6">
        {/* Filters + Title */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Liste des Produits</h2>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-muted-foreground"
              >
                <X className="mr-1 h-4 w-4" />
                Effacer les filtres
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
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
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <RiskTable products={filteredProducts} />
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-medium">Aucun produit trouve</p>
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
      </div>
    </DashboardLayout>
  );
}
