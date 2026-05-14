import type { Product } from '@/data/types';

const aliases: Record<string, string[]> = {
  رز: ['رز', 'أرز'],
  أرز: ['رز', 'أرز'],
  مكرونه: ['مكرونه', 'مكرونة'],
  مكرونة: ['مكرونه', 'مكرونة'],
  فراخ: ['فراخ', 'دجاج', 'فروج', 'chicken'],
  دجاج: ['فراخ', 'دجاج', 'فروج', 'chicken'],
  لبن: ['لبن', 'حليب', 'milk'],
  حليب: ['لبن', 'حليب', 'milk'],
  عيش: ['عيش', 'خبز', 'bread'],
  خبز: ['عيش', 'خبز', 'bread'],
  منظف: ['منظف', 'منظفات', 'مسحوق', 'صابون', 'غسيل'],
  منظفات: ['منظف', 'منظفات', 'مسحوق', 'صابون', 'غسيل'],
  مسحوق: ['منظف', 'منظفات', 'مسحوق', 'صابون', 'غسيل'],
  صابون: ['منظف', 'منظفات', 'مسحوق', 'صابون', 'غسيل'],
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();

const expandQuery = (query: string) => {
  const normalizedQuery = normalize(query);
  const terms = new Set([normalizedQuery]);

  Object.entries(aliases).forEach(([key, values]) => {
    const normalizedKey = normalize(key);
    const normalizedValues = values.map(normalize);
    if (normalizedQuery === normalizedKey || normalizedValues.includes(normalizedQuery)) {
      normalizedValues.forEach((value) => terms.add(value));
    }
  });

  return [...terms].filter(Boolean);
};

export const searchProducts = (products: Product[], query: string) => {
  const terms = expandQuery(query);
  if (terms.length === 0) return [];

  return products.filter((product) => {
    const searchableText = normalize(
      [
        product.name,
        ...product.keywords,
      ].join(' '),
    );

    return terms.some((term) => searchableText.includes(term));
  });
};
