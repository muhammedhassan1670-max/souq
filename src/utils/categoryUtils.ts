import type { Category, Product } from '@/data/types';

export type CategoryLookups = {
  byId: Map<string, Category>;
  byName: Map<string, Category>;
};

export function getActiveCategories(categories: Category[]) {
  return categories
    .filter((category) => category.active !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function createCategoryLookups(categories: Category[]): CategoryLookups {
  return {
    byId: new Map(categories.map((category) => [String(category.id), category])),
    byName: new Map(categories.map((category) => [category.name, category])),
  };
}

export function findProductCategory(product: Product, lookups: CategoryLookups) {
  if (product.categoryId) {
    const categoryById = lookups.byId.get(String(product.categoryId));
    if (categoryById) return categoryById;
  }

  return product.category ? lookups.byName.get(product.category) : undefined;
}

export function isProductCategoryVisible(product: Product, lookups: CategoryLookups) {
  const category = findProductCategory(product, lookups);
  return Boolean(category && category.active !== false && !category.comingSoon);
}

export function productMatchesCategory(product: Product, category: Category, lookups: CategoryLookups) {
  const productCategory = findProductCategory(product, lookups);
  return productCategory?.id === category.id;
}
