import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Edit3,
  FileUp,
  ImageOff,
  ImagePlus,
  History,
  Percent,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import type { Category, Product, Shop } from '@/data/types';
import { createProduct, deleteProduct, listProducts, updateProduct, type ProductInput } from '@/services/productsService';
import { listCategories } from '@/services/categoriesService';
import { listShops } from '@/services/shopsService';
import { listOrders } from '@/services/ordersService';
import { uploadMarketImage } from '@/services/uploadService';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatCairoRelativeDate, getCairoDateKey, isCairoToday, parseAppDate } from '@/utils/dateTime';
import {
  listProductPriceHistory,
  recordProductPriceHistory,
  type PriceChangeSource,
  type ProductPriceHistoryRecord,
} from '@/services/productPriceHistoryService';

type ProductForm = {
  id?: string;
  name: string;
  description: string;
  categoryId: string;
  shopId: string;
  price: string;
  oldPrice: string;
  unit: string;
  imageUrl: string;
  available: boolean;
  stockQuantity: string;
  isOffer: boolean;
  isLocalProduct: boolean;
  isFeatured: boolean;
  keywords: string;
  tags: string;
  sortOrder: string;
};

type QuickProductForm = {
  name: string;
  categoryId: string;
  price: string;
  oldPrice: string;
  unit: string;
  available: boolean;
  imageUrl: string;
  isOffer: boolean;
  isLocalProduct: boolean;
};

type AvailabilityFilter = 'all' | 'available' | 'unavailable';
type OfferFilter = 'all' | 'offers' | 'not-offers';
type QuickFilter =
  | 'all'
  | 'offers'
  | 'unavailable'
  | 'no-image'
  | 'featured'
  | 'updated-today'
  | 'stale'
  | 'missing-data'
  | 'missing-price'
  | 'offer-missing-old-price'
  | 'low-stock';
type BulkMode = 'increasePercent' | 'decreasePercent' | 'addFixed' | 'subtractFixed' | 'setOldPrice' | 'setOffer' | 'clearOffer';
type InlineField = 'price' | 'oldPrice' | 'stockQuantity';
type ProductTemplate = 'grocery' | 'vegetables' | 'cleaning' | 'offer';
type ExportScope = 'filtered' | 'all' | 'category' | 'unavailable' | 'no-image' | 'offers';

type PriceDraft = {
  price: string;
  oldPrice: string;
  stockQuantity: string;
  available: boolean;
  isOffer: boolean;
};

type CsvPriceUpdate = {
  rowNumber: number;
  id: string;
  product?: Product;
  price?: number;
  oldPrice?: number;
  stockQuantity?: number;
  available?: boolean;
  errors: string[];
};

const fallbackImage = '/images/products/rice.jpg';
const pageSize = 24;

const emptyForm: ProductForm = {
  name: '',
  description: '',
  categoryId: '',
  shopId: '',
  price: '',
  oldPrice: '',
  unit: 'قطعة',
  imageUrl: '',
  available: true,
  stockQuantity: '0',
  isOffer: false,
  isLocalProduct: false,
  isFeatured: false,
  keywords: '',
  tags: '',
  sortOrder: '0',
};

const emptyQuickForm: QuickProductForm = {
  name: '',
  categoryId: '',
  price: '',
  oldPrice: '',
  unit: 'قطعة',
  available: true,
  imageUrl: '',
  isOffer: false,
  isLocalProduct: false,
};

export default function AdminProducts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [orderedProductIds, setOrderedProductIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 220);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [offerFilter, setOfferFilter] = useState<OfferFilter>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [quickForm, setQuickForm] = useState<QuickProductForm>(emptyQuickForm);
  const [showForm, setShowForm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyItems, setHistoryItems] = useState<ProductPriceHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [priceUpdateMode, setPriceUpdateMode] = useState(false);
  const [bulkMode, setBulkMode] = useState<BulkMode>('increasePercent');
  const [bulkValue, setBulkValue] = useState('10');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>({});
  const [savedDraftIds, setSavedDraftIds] = useState<Set<string>>(new Set());
  const [lastQuickAdded, setLastQuickAdded] = useState<Product | null>(null);
  const [allowDuplicateQuickAdd, setAllowDuplicateQuickAdd] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inlineSavingKey, setInlineSavingKey] = useState('');
  const [uploadingTarget, setUploadingTarget] = useState<'full' | 'quick' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const [nextProducts, nextCategories, nextShops, nextOrders] = await Promise.all([
        listProducts(),
        listCategories(),
        listShops(),
        listOrders().catch(() => []),
      ]);
      setProducts(nextProducts);
      setCategories(nextCategories);
      setShops(nextShops);
      setOrderedProductIds(new Set(nextOrders.flatMap((order) => order.items.map((item) => item.productId).filter(Boolean) as string[])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const mode = searchParams.get('mode');
    const view = searchParams.get('view');
    const filter = searchParams.get('filter') as QuickFilter | null;
    const add = searchParams.get('add');
    const exportAction = searchParams.get('export');
    const offer = searchParams.get('offer') as OfferFilter | null;
    const availability = searchParams.get('availability') as AvailabilityFilter | null;

    if (mode === 'price-update') setPriceUpdateMode(true);
    if (view === 'inventory') setQuickFilter('low-stock');
    if (exportAction === 'csv') setShowExport(true);
    if (filter && quickFilters.some((item) => item.value === filter)) setQuickFilter(filter);
    if (offer && ['all', 'offers', 'not-offers'].includes(offer)) setOfferFilter(offer);
    if (availability && ['all', 'available', 'unavailable'].includes(availability)) setAvailabilityFilter(availability);
    if (add === 'quick') {
      setQuickForm({ ...emptyQuickForm, categoryId: categories[0]?.id || '' });
      setLastQuickAdded(null);
      setAllowDuplicateQuickAdd(false);
      setError('');
      setShowQuickAdd(true);
    }
  }, [categories, searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, categoryFilter, shopFilter, availabilityFilter, offerFilter, quickFilter]);

  const hasUnsavedPriceChanges = Object.keys(priceDrafts).length > 0;

  useEffect(() => {
    if (!hasUnsavedPriceChanges) return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedPriceChanges]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && key === 'n') {
        event.preventDefault();
        openQuickAdd();
      }
      if ((event.ctrlKey || event.metaKey) && key === 's') {
        event.preventDefault();
        if (priceUpdateMode && hasUnsavedPriceChanges) void saveAllPriceDrafts();
      }
      if (event.key === 'Escape') {
        setShowQuickAdd(false);
        setShowForm(false);
        setShowBulk(false);
        setShowImport(false);
        setShowExport(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const shopById = useMemo(() => new Map(shops.map((shop) => [String(shop.id), shop])), [shops]);

  const filteredProducts = useMemo(() => {
    const q = normalizeSearch(debouncedSearch);
    return products.filter((product) => {
      const category = product.categoryId ? categoryById.get(product.categoryId) : undefined;
      const shop = product.shopId ? shopById.get(String(product.shopId)) : undefined;
      const updatedAt = product.updatedAt || product.createdAt;

      const searchable = normalizeSearch([
        product.name,
        product.category,
        category?.name,
        shop?.name,
        product.price,
        product.oldPrice,
        product.unit,
        product.available ? 'متاح' : 'غير متاح خلصان',
        product.isOffer ? 'عرض عروض' : '',
        product.isFeatured ? 'مميز' : '',
        ...product.keywords,
        ...product.tags,
      ].join(' '));

      const matchesSearch = !q || searchable.includes(q);
      const matchesCategory =
        categoryFilter === 'all' ||
        product.categoryId === categoryFilter ||
        product.category === categoryById.get(categoryFilter)?.name;
      const matchesShop = shopFilter === 'all' || String(product.shopId || '') === shopFilter;
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available' && product.available) ||
        (availabilityFilter === 'unavailable' && !product.available);
      const matchesOffer =
        offerFilter === 'all' ||
        (offerFilter === 'offers' && product.isOffer) ||
        (offerFilter === 'not-offers' && !product.isOffer);
      const matchesQuick =
        quickFilter === 'all' ||
        (quickFilter === 'offers' && product.isOffer) ||
        (quickFilter === 'unavailable' && !product.available) ||
        (quickFilter === 'no-image' && !hasRealImage(product)) ||
        (quickFilter === 'featured' && product.isFeatured) ||
        (quickFilter === 'updated-today' && isCairoToday(updatedAt)) ||
        (quickFilter === 'stale' && isOlderThan(updatedAt, 30)) ||
        (quickFilter === 'missing-data' && hasMissingData(product)) ||
        (quickFilter === 'missing-price' && hasMissingPrice(product)) ||
        (quickFilter === 'offer-missing-old-price' && product.isOffer && !product.oldPrice) ||
        (quickFilter === 'low-stock' && product.available && Number(product.stockQuantity ?? 0) > 0 && Number(product.stockQuantity ?? 0) <= 3);

      return matchesSearch && matchesCategory && matchesShop && matchesAvailability && matchesOffer && matchesQuick;
    });
  }, [availabilityFilter, categoryById, categoryFilter, debouncedSearch, offerFilter, products, quickFilter, shopById, shopFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedProducts = products.filter((product) => selectedIds.has(String(product.id)));
  const visiblePriceDraftCount = visibleProducts.filter((product) => priceDrafts[String(product.id)]).length;
  const hasAdvancedFilters =
    shopFilter !== 'all' ||
    availabilityFilter !== 'all' ||
    offerFilter !== 'all' ||
    quickFilter !== 'all';
  const quickSimilarProducts = useMemo(
    () => findSimilarProducts(quickForm.name, products).slice(0, 4),
    [products, quickForm.name],
  );
  const quickAddHasDuplicateWarning = quickForm.name.trim().length >= 3 && quickSimilarProducts.length > 0 && !allowDuplicateQuickAdd;

  const getPriceDraft = (product: Product): PriceDraft => (
    priceDrafts[String(product.id)] || createPriceDraft(product)
  );

  const updatePriceDraft = (product: Product, changes: Partial<PriceDraft>) => {
    const productId = String(product.id);
    setSavedDraftIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    setPriceDrafts((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || createPriceDraft(product)),
        ...changes,
      },
    }));
  };

  const discardPriceDrafts = () => {
    setPriceDrafts({});
    setSavedDraftIds(new Set());
    setNotice('تم تجاهل التغييرات');
  };

  const savePriceDraft = async (product: Product) => {
    const draft = getPriceDraft(product);
    const validationError = validatePriceDraft(draft);
    if (validationError) {
      setError(validationError);
      return false;
    }
    if (typeof product.id !== 'string') {
      setError('تحديث السعر يحتاج منتج من قاعدة البيانات');
      return false;
    }

    const productId = String(product.id);
    setInlineSavingKey(`${productId}-draft`);
    setError('');
    try {
      const changes = priceDraftToProductInput(draft);
      await updateProduct(product.id, toInput(product, changes));
      await recordPriceChange(product, changes, 'quick_update');
      setProducts((prev) => prev.map((item) => (
        String(item.id) === productId
          ? { ...item, ...priceDraftToProduct(item, draft), updatedAt: new Date().toISOString() }
          : item
      )));
      setPriceDrafts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      setSavedDraftIds((prev) => new Set(prev).add(productId));
      setNotice('تم تحديث السعر');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ، حاول تاني');
      return false;
    } finally {
      setInlineSavingKey('');
    }
  };

  const saveAllPriceDrafts = async () => {
    const entries = Object.entries(priceDrafts);
    if (entries.length === 0) return;
    const invalid = entries.find(([, draft]) => validatePriceDraft(draft));
    if (invalid) {
      setError(validatePriceDraft(invalid[1]) || 'راجع الأسعار قبل الحفظ');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await Promise.all(entries.map(([productId, draft]) => {
        const product = products.find((item) => String(item.id) === productId);
        if (!product || typeof product.id !== 'string') throw new Error(`منتج غير موجود: ${productId}`);
        const changes = priceDraftToProductInput(draft);
        return updateProduct(product.id, toInput(product, changes)).then(() => recordPriceChange(product, changes, 'quick_update'));
      }));
      const updatedAt = new Date().toISOString();
      setProducts((prev) => prev.map((product) => {
        const draft = priceDrafts[String(product.id)];
        return draft ? { ...product, ...priceDraftToProduct(product, draft), updatedAt } : product;
      }));
      setSavedDraftIds(new Set(entries.map(([productId]) => productId)));
      setPriceDrafts({});
      setNotice(`تم حفظ التغييرات - ${entries.length} منتج`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ، حاول تاني');
    } finally {
      setSaving(false);
    }
  };

  const togglePriceUpdateMode = () => {
    if (priceUpdateMode && hasUnsavedPriceChanges && !confirm('هناك تغييرات غير محفوظة. هل تريد الخروج؟')) return;
    if (priceUpdateMode) discardPriceDrafts();
    setPriceUpdateMode((prev) => !prev);
  };

  const openNew = () => {
    setForm({ ...emptyForm, categoryId: categories[0]?.id || '' });
    setError('');
    setShowForm(true);
  };

  const openQuickAdd = () => {
    setQuickForm({ ...emptyQuickForm, categoryId: categories[0]?.id || '' });
    setLastQuickAdded(null);
    setAllowDuplicateQuickAdd(false);
    setError('');
    setShowQuickAdd(true);
  };

  const applyTemplate = (template: ProductTemplate) => {
    const categoryName =
      template === 'vegetables' ? 'خضار' :
      template === 'cleaning' ? 'منظفات' :
      template === 'grocery' ? 'بقالة' :
      '';
    const category = categories.find((item) => item.name.includes(categoryName)) || categories[0];
    setQuickForm((prev) => ({
      ...prev,
      categoryId: category?.id || prev.categoryId,
      unit:
        template === 'vegetables' ? 'كيلو' :
        template === 'cleaning' ? 'عبوة' :
        template === 'grocery' ? 'كيلو' :
        prev.unit || 'قطعة',
      available: true,
      isOffer: template === 'offer',
    }));
    setForm((prev) => ({
      ...prev,
      categoryId: category?.id || prev.categoryId,
      unit:
        template === 'vegetables' ? 'كيلو' :
        template === 'cleaning' ? 'عبوة' :
        template === 'grocery' ? 'كيلو' :
        prev.unit || 'قطعة',
      isOffer: template === 'offer' || prev.isOffer,
    }));
  };

  const openEdit = (product: Product) => {
    setForm(productToForm(product, categories));
    setError('');
    setShowForm(true);
  };

  const duplicateProduct = (product: Product) => {
    setForm({
      ...productToForm(product, categories),
      id: undefined,
      name: `نسخة من ${product.name}`,
      sortOrder: '0',
      isLocalProduct: false,
    });
    setNotice('تم تجهيز نسخة من المنتج. عدّل الاسم أو السعر ثم احفظ.');
    setShowForm(true);
  };

  const saveFullProduct = async (addAnother = false) => {
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = formToInput(form);
      if (form.id) {
        const originalProduct = products.find((product) => String(product.id) === form.id);
        await updateProduct(form.id, payload);
        if (originalProduct) await recordPriceChange(originalProduct, payload, 'full_form');
        setNotice('تم تعديل المنتج وظهر للعميل');
      } else {
        await createProduct(payload);
        setNotice('تم إضافة المنتج بنجاح');
      }
      await refresh();
      if (addAnother) {
        setForm({ ...emptyForm, categoryId: form.categoryId || categories[0]?.id || '', unit: form.unit || 'قطعة' });
      } else {
        setShowForm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ المنتج');
    } finally {
      setSaving(false);
    }
  };

  const saveQuickProduct = async (addAnother = false) => {
    const validationError = validateQuickForm(quickForm);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (quickAddHasDuplicateWarning) {
      setError('قد يكون هذا المنتج موجود بالفعل. افتح المنتج الموجود أو اضغط "إضافة على أي حال".');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const createdProduct = await createProduct({
        name: quickForm.name.trim(),
        categoryId: quickForm.categoryId,
        price: Number(quickForm.price),
        oldPrice: quickForm.oldPrice.trim() ? Number(quickForm.oldPrice) : undefined,
        unit: quickForm.unit || 'قطعة',
        available: quickForm.available,
        imageUrl: quickForm.imageUrl || undefined,
        stockQuantity: quickForm.available ? 1 : 0,
        keywords: [quickForm.name.trim()],
        tags: [],
        isOffer: quickForm.isOffer,
        isLocalProduct: false,
        isFeatured: false,
      });
      setNotice('تم إضافة المنتج بنجاح');
      await refresh();
      setLastQuickAdded(createdProduct);
      setAllowDuplicateQuickAdd(false);
      const nextCategoryId = quickForm.categoryId || categories[0]?.id || '';
      setQuickForm({ ...emptyQuickForm, categoryId: nextCategoryId });
      if (addAnother) setLastQuickAdded(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إضافة المنتج');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product: Product) => {
    if (typeof product.id !== 'string') {
      setError('الحذف الحقيقي يحتاج منتج من قاعدة البيانات');
      return;
    }
    if (orderedProductIds.has(product.id)) {
      const shouldDelete = confirm('هذا المنتج له طلبات سابقة، يفضل إيقافه بدل الحذف. هل تريد حذفه رغم ذلك؟');
      if (!shouldDelete) {
        await optimisticUpdate(product, { available: false, active: false }, 'تم إيقاف المنتج بدل الحذف');
        return;
      }
    }
    if (!confirm(`متأكد من حذف ${product.name}؟`)) return;
    try {
      await deleteProduct(product.id);
      setNotice('تم حذف المنتج');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(String(product.id));
        return next;
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حذف المنتج');
    }
  };

  const saveInlineNumber = async (product: Product, field: InlineField, rawValue: string) => {
    if (typeof product.id !== 'string') {
      setError('تحديث المنتج يحتاج منتج من قاعدة البيانات');
      return false;
    }

    const cleanValue = rawValue.trim();
    const numberValue = cleanValue ? Number(cleanValue) : undefined;
    if ((field === 'price' && !cleanValue) || (numberValue !== undefined && (Number.isNaN(numberValue) || numberValue < 0))) {
      setError(field === 'price' ? 'السعر مطلوب ولا يكون بالسالب' : 'القيمة لا تكون بالسالب');
      return false;
    }

    const changes: Partial<Product> =
      field === 'price' ? { price: Number(numberValue) } :
      field === 'oldPrice' ? { oldPrice: numberValue } :
      { stockQuantity: Number(numberValue || 0) };

    return optimisticUpdate(product, changes, `تم تحديث ${field === 'price' ? 'السعر' : field === 'oldPrice' ? 'السعر القديم' : 'الكمية'}`, 'inline');
  };

  const toggleField = async (product: Product, field: 'available' | 'isOffer' | 'isFeatured') => {
    const label =
      field === 'available' ? 'التوفر' :
      field === 'isOffer' ? 'العرض' :
      'منتج مميز';

    await optimisticUpdate(product, { [field]: !product[field] } as Partial<Product>, `تم تحديث ${label}`);
  };

  const optimisticUpdate = async (product: Product, changes: Partial<Product>, successMessage: string, priceSource: PriceChangeSource = 'inline') => {
    if (typeof product.id !== 'string') {
      setError('التحديث الحقيقي يحتاج منتج من قاعدة البيانات');
      return false;
    }
    if (!product.categoryId && !changes.categoryId) {
      setError('لا يمكن تحديث المنتج قبل تحديد قسم له');
      return false;
    }

    const key = `${product.id}-${Object.keys(changes).join('-')}`;
    const previousProducts = products;
    const updatedAt = new Date().toISOString();
    setInlineSavingKey(key);
    setError('');
    setProducts((prev) => prev.map((item) => (
      String(item.id) === String(product.id) ? { ...item, ...changes, updatedAt } : item
    )));

    try {
      await updateProduct(product.id, toInput(product, changes));
      await recordPriceChange(product, changes, priceSource);
      setNotice(successMessage);
      return true;
    } catch (err) {
      setProducts(previousProducts);
      setError(err instanceof Error ? err.message : 'فشل تحديث المنتج');
      return false;
    } finally {
      setInlineSavingKey('');
    }
  };

  const toggleSelected = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const visibleIds = visibleProducts.map((product) => String(product.id));
      const allSelected = visibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      visibleIds.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const bulkPreview = useMemo(() => {
    const value = Number(bulkValue || 0);
    return selectedProducts.map((product) => {
      const next = calculateBulkProduct(product, bulkMode, value);
      return { product, next };
    });
  }, [bulkMode, bulkValue, selectedProducts]);

  const bulkHasInvalidPrice = bulkPreview.some((item) => item.next.price < 0 || Number.isNaN(item.next.price));

  const applyBulkUpdate = async () => {
    if (selectedProducts.length === 0) {
      setError('حدد منتجات الأول');
      return;
    }
    if (bulkHasInvalidPrice) {
      setError('في منتجات السعر الجديد فيها أقل من صفر');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await Promise.all(bulkPreview.map(({ product, next }) => {
        if (typeof product.id !== 'string') throw new Error('بعض المنتجات ليست من قاعدة البيانات');
        return updateProduct(product.id, toInput(product, next)).then(() => recordPriceChange(product, next, 'bulk_update'));
      }));
      setNotice(`تم تحديث ${bulkPreview.length} منتج`);
      setSelectedIds(new Set());
      setShowBulk(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التحديث الجماعي');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File | undefined, target: 'full' | 'quick') => {
    if (!file) return;
    setUploadingTarget(target);
    setError('');
    const previewUrl = URL.createObjectURL(file);
    if (target === 'full') setForm((prev) => ({ ...prev, imageUrl: previewUrl }));
    else setQuickForm((prev) => ({ ...prev, imageUrl: previewUrl }));

    try {
      const publicUrl = await uploadMarketImage(file, 'products');
      if (target === 'full') setForm((prev) => ({ ...prev, imageUrl: publicUrl }));
      else setQuickForm((prev) => ({ ...prev, imageUrl: publicUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل رفع الصورة');
    } finally {
      setUploadingTarget(null);
    }
  };

  const getExportProducts = (scope: ExportScope, categoryId?: string) => {
    if (scope === 'all') return products;
    if (scope === 'category') return products.filter((product) => product.categoryId === categoryId || product.category === categoryById.get(categoryId || '')?.name);
    if (scope === 'unavailable') return products.filter((product) => !product.available);
    if (scope === 'no-image') return products.filter((product) => !hasRealImage(product));
    if (scope === 'offers') return products.filter((product) => product.isOffer);
    return filteredProducts;
  };

  const exportCsv = (scope: ExportScope = 'filtered', categoryId?: string) => {
    const exportProducts = getExportProducts(scope, categoryId);
    const rows = exportProducts.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      old_price: product.oldPrice || '',
      unit: product.unit,
      stock_quantity: product.stockQuantity ?? 0,
      available: product.available,
      is_offer: product.isOffer,
    }));
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `souq-products-${getCairoDateKey()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`تم تصدير ${rows.length} منتج`);
  };

  const applyCsvImport = async (updates: CsvPriceUpdate[]) => {
    const validUpdates = updates.filter((row) => row.product && row.errors.length === 0);
    const failedRows = updates.length - validUpdates.length;
    if (validUpdates.length === 0) {
      setError('لا توجد صفوف صالحة للتحديث');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await Promise.all(validUpdates.map((row) => {
        const product = row.product;
        if (!product || typeof product.id !== 'string') throw new Error(`منتج غير صالح في صف ${row.rowNumber}`);
        const changes: Partial<ProductInput> = {
          price: row.price ?? product.price,
          stockQuantity: row.stockQuantity ?? product.stockQuantity ?? 0,
          available: row.available ?? product.available,
        };
        if (row.oldPrice !== undefined) changes.oldPrice = row.oldPrice;
        return updateProduct(product.id, toInput(product, changes)).then(() => recordPriceChange(product, changes, 'csv_import'));
      }));
      setNotice(`تم تحديث ${validUpdates.length} منتج بنجاح، وفشل ${failedRows} صف`);
      setShowImport(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل استيراد CSV');
    } finally {
      setSaving(false);
    }
  };

  const openPriceHistory = async (product: Product) => {
    setHistoryProduct(product);
    setHistoryItems([]);
    if (typeof product.id !== 'string') return;
    setHistoryLoading(true);
    try {
      setHistoryItems(await listProductPriceHistory(product.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل سجل السعر');
    } finally {
      setHistoryLoading(false);
    }
  };

  const resetProductFilters = () => {
    setCategoryFilter('all');
    setShopFilter('all');
    setAvailabilityFilter('all');
    setOfferFilter('all');
    setQuickFilter('all');
  };

  return (
    <div className="space-y-4">
      {!isSupabaseConfigured && (
        <div className="rounded-xl bg-error/10 p-3 text-sm font-bold text-error">
          Supabase غير مفعّل. التحديث الحقيقي يحتاج متغيرات البيئة.
        </div>
      )}

      {notice && <Notice tone="success" onClose={() => setNotice('')}>{notice}</Notice>}
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}

      <section className="rounded-2xl border border-sand bg-white p-3 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-charcoal">المنتجات</h1>
            <p className="mt-1 text-sm font-bold text-charcoal-muted">بحث سريع وإضافة وتعديل المنتجات. الإحصائيات والتنبيهات في الرئيسية.</p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="h-10 rounded-xl border border-sand bg-cream px-3 text-xs font-black text-olive-dark transition hover:border-olive"
          >
            فتح الداشبورد
          </button>
        </div>

        <div className="grid gap-2 lg:grid-cols-[1fr_220px_150px_150px]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-olive" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم المنتج، القسم، المحل، السعر، أو كلمة مفتاحية"
              title="Ctrl + K"
              className="h-12 w-full rounded-xl border border-sand bg-cream pr-10 pl-3 text-sm font-bold outline-none focus:border-olive"
            />
          </div>
          <ControlSelect value={categoryFilter} onChange={setCategoryFilter}>
            <option value="all">كل الأقسام</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </ControlSelect>
          <AdminButton onClick={openQuickAdd} icon={<Zap className="h-4 w-4" />} tone="clay" title="Ctrl + N">إضافة سريعة</AdminButton>
          <AdminButton onClick={openNew} icon={<Plus className="h-4 w-4" />}>إضافة منتج</AdminButton>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={`flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-black transition ${
              showAdvancedFilters || hasAdvancedFilters ? 'bg-olive text-white' : 'border border-sand bg-white text-charcoal hover:border-olive'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            فلاتر
            {hasAdvancedFilters && <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">نشطة</span>}
          </button>
          <AdminButton onClick={togglePriceUpdateMode} icon={<Edit3 className="h-4 w-4" />} tone={priceUpdateMode ? 'clay' : 'plain'}>
            تحديث الأسعار
          </AdminButton>
          {selectedIds.size > 0 && (
            <AdminButton onClick={() => setShowBulk(true)} icon={<Percent className="h-4 w-4" />}>تحديث جماعي</AdminButton>
          )}
          <AdminButton onClick={() => setShowExport(true)} icon={<Download className="h-4 w-4" />} tone="plain">تصدير</AdminButton>
          <AdminButton onClick={() => setShowImport(true)} icon={<FileUp className="h-4 w-4" />} tone="plain">استيراد CSV</AdminButton>
        </div>

        {(showAdvancedFilters || hasAdvancedFilters) && (
          <div className="mt-3 rounded-2xl border border-sand bg-cream p-3">
            <div className="grid gap-2 md:grid-cols-3">
              <ControlSelect value={shopFilter} onChange={setShopFilter}>
                <option value="all">كل المحلات</option>
                {shops.map((shop) => <option key={shop.id} value={String(shop.id)}>{shop.name}</option>)}
              </ControlSelect>
              <ControlSelect value={availabilityFilter} onChange={(value) => setAvailabilityFilter(value as AvailabilityFilter)}>
                <option value="all">كل الحالات</option>
                <option value="available">متاح</option>
                <option value="unavailable">خلصان</option>
              </ControlSelect>
              <ControlSelect value={offerFilter} onChange={(value) => setOfferFilter(value as OfferFilter)}>
                <option value="all">كل العروض</option>
                <option value="offers">عروض فقط</option>
                <option value="not-offers">بدون عروض</option>
              </ControlSelect>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {quickFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setQuickFilter(filter.value)}
                  className={`h-9 flex-shrink-0 rounded-full px-3 text-xs font-black ${
                    quickFilter === filter.value ? 'bg-olive text-white' : 'border border-sand bg-white text-charcoal hover:border-olive'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {hasAdvancedFilters && (
              <button onClick={resetProductFilters} className="mt-2 h-9 rounded-xl bg-white px-3 text-xs font-black text-charcoal">
                مسح الفلاتر
              </button>
            )}
          </div>
        )}
      </section>

      {priceUpdateMode && hasUnsavedPriceChanges && (
        <section className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clay/30 bg-clay/10 p-3 shadow-card">
          <p className="text-sm font-black text-clay-dark">
            لديك تغييرات غير محفوظة - {Object.keys(priceDrafts).length} منتج
          </p>
          <div className="flex gap-2">
            <button onClick={() => void saveAllPriceDrafts()} disabled={saving} className="h-10 rounded-xl bg-olive px-4 text-sm font-black text-white disabled:opacity-60">
              حفظ التغييرات
            </button>
            <button onClick={discardPriceDrafts} className="h-10 rounded-xl bg-white px-4 text-sm font-black text-charcoal">
              تجاهل التغييرات
            </button>
          </div>
        </section>
      )}

      <section className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-charcoal-muted">
          {filteredProducts.length} منتج ظاهر
          {selectedIds.size > 0 && ` - ${selectedIds.size} محدد`}
        </p>
        {selectedIds.size > 0 && (
          <button onClick={() => setSelectedIds(new Set())} className="h-9 rounded-xl bg-cream-warm px-3 text-xs font-black text-charcoal">
            إلغاء التحديد
          </button>
        )}
      </section>

      {loading ? (
        <LoadingProducts />
      ) : filteredProducts.length === 0 ? (
        <EmptyProducts onAdd={openQuickAdd} />
      ) : priceUpdateMode ? (
        <PriceUpdateModeView
          products={visibleProducts}
          drafts={priceDrafts}
          savedDraftIds={savedDraftIds}
          savingKey={inlineSavingKey}
          savingAll={saving}
          visibleDraftCount={visiblePriceDraftCount}
          getDraft={getPriceDraft}
          onDraftChange={updatePriceDraft}
          onSaveRow={(product) => void savePriceDraft(product)}
          onSaveAll={() => void saveAllPriceDrafts()}
          onDiscard={discardPriceDrafts}
        />
      ) : (
        <>
          <DesktopProductsTable
            products={visibleProducts}
            selectedIds={selectedIds}
            shops={shopById}
            inlineSavingKey={inlineSavingKey}
            onToggleAll={toggleAllVisible}
            onToggleSelected={toggleSelected}
            onInlineSave={saveInlineNumber}
            onToggleField={toggleField}
            onEdit={openEdit}
            onDuplicate={duplicateProduct}
            onHistory={(product) => void openPriceHistory(product)}
            onDelete={remove}
          />

          <MobileProductsCards
            products={visibleProducts}
            selectedIds={selectedIds}
            shops={shopById}
            inlineSavingKey={inlineSavingKey}
            onToggleSelected={toggleSelected}
            onInlineSave={saveInlineNumber}
            onToggleField={toggleField}
            onEdit={openEdit}
            onDuplicate={duplicateProduct}
            onHistory={(product) => void openPriceHistory(product)}
            onDelete={remove}
          />

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="h-10 rounded-xl border border-sand bg-white px-4 text-sm font-black disabled:opacity-50"
              >
                السابق
              </button>
              <span className="text-sm font-black text-charcoal">{currentPage} / {pageCount}</span>
              <button
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                disabled={currentPage === pageCount}
                className="h-10 rounded-xl border border-sand bg-white px-4 text-sm font-black disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}

      {showQuickAdd && (
        <QuickAddModal
          form={quickForm}
          categories={categories}
          similarProducts={quickSimilarProducts}
          lastAddedProduct={lastQuickAdded}
          allowDuplicate={allowDuplicateQuickAdd}
          uploading={uploadingTarget === 'quick'}
          saving={saving}
          onChange={(nextForm) => {
            setQuickForm(nextForm);
            setAllowDuplicateQuickAdd(false);
          }}
          onApplyTemplate={applyTemplate}
          onAllowDuplicate={() => setAllowDuplicateQuickAdd(true)}
          onOpenExisting={(product) => {
            setShowQuickAdd(false);
            openEdit(product);
          }}
          onUpload={(file) => void handleUpload(file, 'quick')}
          onOpenFull={() => {
            setShowQuickAdd(false);
            setForm({
              ...emptyForm,
              name: quickForm.name,
              categoryId: quickForm.categoryId || categories[0]?.id || '',
              price: quickForm.price,
              oldPrice: quickForm.oldPrice,
              unit: quickForm.unit || 'قطعة',
              available: quickForm.available,
              imageUrl: quickForm.imageUrl,
              isOffer: quickForm.isOffer,
              isLocalProduct: false,
            });
            setShowForm(true);
          }}
          onEditLast={(product) => {
            setShowQuickAdd(false);
            openEdit(product);
          }}
          onViewLast={(product) => {
            setShowQuickAdd(false);
            navigate('/products', { state: { query: product.name } });
          }}
          onSave={() => void saveQuickProduct(false)}
          onSaveAnother={() => void saveQuickProduct(true)}
          onAddAnother={() => setLastQuickAdded(null)}
          onClose={() => setShowQuickAdd(false)}
        />
      )}

      {showForm && (
        <FullProductModal
          form={form}
          categories={categories}
          shops={shops}
          uploading={uploadingTarget === 'full'}
          saving={saving}
          onChange={setForm}
          onUpload={(file) => void handleUpload(file, 'full')}
          onClearImage={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
          onSave={() => void saveFullProduct(false)}
          onSaveAnother={() => void saveFullProduct(true)}
          onClose={() => setShowForm(false)}
        />
      )}

      {showBulk && (
        <BulkUpdateModal
          mode={bulkMode}
          value={bulkValue}
          selectedCount={selectedProducts.length}
          preview={bulkPreview}
          hasInvalidPrice={bulkHasInvalidPrice}
          saving={saving}
          onModeChange={setBulkMode}
          onValueChange={setBulkValue}
          onApply={() => void applyBulkUpdate()}
          onClose={() => setShowBulk(false)}
        />
      )}

      {showImport && (
        <ImportCsvModal
          products={products}
          saving={saving}
          onApply={(updates) => void applyCsvImport(updates)}
          onClose={() => setShowImport(false)}
        />
      )}

      {showExport && (
        <ExportCsvModal
          categories={categories}
          onExport={(scope, categoryId) => {
            exportCsv(scope, categoryId);
            setShowExport(false);
          }}
          onClose={() => setShowExport(false)}
        />
      )}

      {historyProduct && (
        <PriceHistoryModal
          product={historyProduct}
          items={historyItems}
          loading={historyLoading}
          onClose={() => setHistoryProduct(null)}
        />
      )}
    </div>
  );
}

async function recordPriceChange(product: Product, changes: Partial<ProductInput> | Partial<Product>, source: PriceChangeSource) {
  if (typeof product.id !== 'string') return;
  const hasPriceChange = Object.prototype.hasOwnProperty.call(changes, 'price');
  const hasOldPriceChange = Object.prototype.hasOwnProperty.call(changes, 'oldPrice');
  const nextPrice = hasPriceChange ? Number(changes.price) : product.price;
  const rawNextOldPrice = hasOldPriceChange ? changes.oldPrice : product.oldPrice;
  const nextOldPrice = rawNextOldPrice === undefined || rawNextOldPrice === null ? undefined : Number(rawNextOldPrice);
  await recordProductPriceHistory({
    productId: product.id,
    oldPrice: product.price,
    newPrice: nextPrice,
    oldOldPrice: product.oldPrice,
    newOldPrice: Number.isNaN(nextOldPrice) ? undefined : nextOldPrice,
    changeSource: source,
  });
}

function DesktopProductsTable({
  products,
  selectedIds,
  shops,
  inlineSavingKey,
  onToggleAll,
  onToggleSelected,
  onInlineSave,
  onToggleField,
  onEdit,
  onDuplicate,
  onHistory,
  onDelete,
}: {
  products: Product[];
  selectedIds: Set<string>;
  shops: Map<string, Shop>;
  inlineSavingKey: string;
  onToggleAll: () => void;
  onToggleSelected: (productId: string) => void;
  onInlineSave: (product: Product, field: InlineField, value: string) => Promise<boolean>;
  onToggleField: (product: Product, field: 'available' | 'isOffer' | 'isFeatured') => Promise<void>;
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onHistory: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  const allSelected = products.length > 0 && products.every((product) => selectedIds.has(String(product.id)));

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-sand bg-white shadow-card lg:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-right">
          <thead className="bg-cream text-xs font-black text-charcoal-muted">
            <tr>
              <th className="w-10 px-3 py-3">
                <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
              </th>
              <th className="px-3 py-3">صورة</th>
              <th className="px-3 py-3">اسم المنتج</th>
              <th className="px-3 py-3">القسم</th>
              <th className="px-3 py-3">المحل</th>
              <th className="px-3 py-3">السعر</th>
              <th className="px-3 py-3">السعر القديم</th>
              <th className="px-3 py-3">الكمية</th>
              <th className="px-3 py-3">الحالة</th>
              <th className="px-3 py-3">عرض</th>
              <th className="px-3 py-3">آخر تحديث</th>
              <th className="px-3 py-3">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {products.map((product) => {
              const productId = String(product.id);
              const shop = product.shopId ? shops.get(String(product.shopId)) : undefined;
              const needsReview = hasMissingData(product);
              return (
                <tr key={productId} className="align-middle hover:bg-cream/60">
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selectedIds.has(productId)} onChange={() => onToggleSelected(productId)} />
                  </td>
                  <td className="px-3 py-3">
                    <ProductImage product={product} size="sm" />
                  </td>
                  <td className="max-w-[220px] px-3 py-3">
                    <p className="line-clamp-1 text-sm font-black text-charcoal">{product.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {needsReview && <Badge text="يحتاج مراجعة" danger />}
                      {!hasRealImage(product) && <Badge text="بدون صورة" danger />}
                      {Number(product.stockQuantity ?? 0) === 0 && <Badge text="خلصان" danger />}
                      {product.available && Number(product.stockQuantity ?? 0) > 0 && Number(product.stockQuantity ?? 0) <= 3 && <Badge text="كمية قليلة" danger />}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm font-bold text-charcoal-muted">{product.category || 'بدون قسم'}</td>
                  <td className="px-3 py-3 text-sm font-bold text-charcoal-muted">{shop?.name || 'بدون محل'}</td>
                  <td className="px-3 py-3">
                    <InlineNumber
                      value={product.price}
                      saving={inlineSavingKey === `${product.id}-price`}
                      required
                      onSave={(value) => onInlineSave(product, 'price', value)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <InlineNumber
                      value={product.oldPrice}
                      saving={inlineSavingKey === `${product.id}-oldPrice`}
                      placeholder="لا يوجد"
                      onSave={(value) => onInlineSave(product, 'oldPrice', value)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <InlineNumber
                      value={product.stockQuantity ?? 0}
                      saving={inlineSavingKey === `${product.id}-stockQuantity`}
                      onSave={(value) => onInlineSave(product, 'stockQuantity', value)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <SwitchPill checked={product.available} onChange={() => void onToggleField(product, 'available')} trueLabel="متاح" falseLabel="خلصان" />
                  </td>
                  <td className="px-3 py-3">
                    <SwitchPill checked={product.isOffer} onChange={() => void onToggleField(product, 'isOffer')} trueLabel="عرض" falseLabel="لا" />
                  </td>
                  <td className="px-3 py-3 text-xs font-bold text-charcoal-muted">{formatCairoRelativeDate(product.updatedAt || product.createdAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <IconButton label="تعديل" onClick={() => onEdit(product)}><Edit3 className="h-4 w-4" /></IconButton>
                      <IconButton label="نسخ" onClick={() => onDuplicate(product)}><Copy className="h-4 w-4" /></IconButton>
                      <IconButton label="سجل السعر" onClick={() => onHistory(product)}><History className="h-4 w-4" /></IconButton>
                      <IconButton label="حذف" danger onClick={() => onDelete(product)}><Trash2 className="h-4 w-4" /></IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileProductsCards({
  products,
  selectedIds,
  shops,
  inlineSavingKey,
  onToggleSelected,
  onInlineSave,
  onToggleField,
  onEdit,
  onDuplicate,
  onHistory,
  onDelete,
}: {
  products: Product[];
  selectedIds: Set<string>;
  shops: Map<string, Shop>;
  inlineSavingKey: string;
  onToggleSelected: (productId: string) => void;
  onInlineSave: (product: Product, field: InlineField, value: string) => Promise<boolean>;
  onToggleField: (product: Product, field: 'available' | 'isOffer' | 'isFeatured') => Promise<void>;
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onHistory: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  return (
    <div className="grid gap-3 lg:hidden">
      {products.map((product) => {
        const productId = String(product.id);
        const shop = product.shopId ? shops.get(String(product.shopId)) : undefined;
        return (
          <div key={productId} className="rounded-2xl border border-sand bg-white p-3 shadow-card">
            <div className="flex gap-3">
              <input type="checkbox" checked={selectedIds.has(productId)} onChange={() => onToggleSelected(productId)} />
              <ProductImage product={product} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-black text-charcoal">{product.name}</h3>
                  {hasMissingData(product) && <Badge text="مراجعة" danger />}
                </div>
                <p className="mt-1 text-xs font-bold text-charcoal-muted">{product.category || 'بدون قسم'} - {shop?.name || 'بدون محل'}</p>
                <p className="mt-1 text-xs font-bold text-charcoal-muted">{formatCairoRelativeDate(product.updatedAt || product.createdAt)}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Number(product.stockQuantity ?? 0) === 0 && <Badge text="خلصان" danger />}
                  {product.available && Number(product.stockQuantity ?? 0) > 0 && Number(product.stockQuantity ?? 0) <= 3 && <Badge text="كمية قليلة" danger />}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <InlineNumber value={product.price} required saving={inlineSavingKey === `${product.id}-price`} onSave={(value) => onInlineSave(product, 'price', value)} />
              <InlineNumber value={product.oldPrice} placeholder="قديم" saving={inlineSavingKey === `${product.id}-oldPrice`} onSave={(value) => onInlineSave(product, 'oldPrice', value)} />
              <InlineNumber value={product.stockQuantity ?? 0} saving={inlineSavingKey === `${product.id}-stockQuantity`} onSave={(value) => onInlineSave(product, 'stockQuantity', value)} />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <SwitchPill checked={product.available} onChange={() => void onToggleField(product, 'available')} trueLabel="متاح" falseLabel="خلصان" />
              <SwitchPill checked={product.isOffer} onChange={() => void onToggleField(product, 'isOffer')} trueLabel="عرض اليوم" falseLabel="بدون عرض" />
              <SwitchPill checked={Boolean(product.isFeatured)} onChange={() => void onToggleField(product, 'isFeatured')} trueLabel="مميز" falseLabel="غير مميز" />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              <button onClick={() => onEdit(product)} className="h-10 rounded-xl bg-cream-warm text-xs font-black text-charcoal">تعديل</button>
              <button onClick={() => onDuplicate(product)} className="h-10 rounded-xl bg-cream-warm text-xs font-black text-charcoal">نسخ</button>
              <button onClick={() => onHistory(product)} className="h-10 rounded-xl bg-cream-warm text-xs font-black text-charcoal">السجل</button>
              <button onClick={() => onDelete(product)} className="h-10 rounded-xl bg-error/10 text-xs font-black text-error">حذف</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PriceHistoryModal({
  product,
  items,
  loading,
  onClose,
}: {
  product: Product;
  items: ProductPriceHistoryRecord[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Modal title={`سجل السعر - ${product.name}`} onClose={onClose} width="md">
      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-sand/60" />
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-cream p-5 text-center">
          <p className="text-sm font-black text-charcoal">لا يوجد سجل تغييرات لهذا المنتج حتى الآن.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-sand bg-cream p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-charcoal">{changeSourceLabel(item.changeSource)}</p>
                <p className="text-xs font-bold text-charcoal-muted">{formatCairoRelativeDate(item.changedAt)}</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-bold text-charcoal">
                <p>السعر: {item.oldPrice ?? '-'} ← <span className="font-black text-olive-dark">{item.newPrice ?? '-'}</span></p>
                <p>القديم: {item.oldOldPrice ?? '-'} ← <span className="font-black text-clay-dark">{item.newOldPrice ?? '-'}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function PriceUpdateModeView({
  products,
  drafts,
  savedDraftIds,
  savingKey,
  savingAll,
  visibleDraftCount,
  getDraft,
  onDraftChange,
  onSaveRow,
  onSaveAll,
  onDiscard,
}: {
  products: Product[];
  drafts: Record<string, PriceDraft>;
  savedDraftIds: Set<string>;
  savingKey: string;
  savingAll: boolean;
  visibleDraftCount: number;
  getDraft: (product: Product) => PriceDraft;
  onDraftChange: (product: Product, changes: Partial<PriceDraft>) => void;
  onSaveRow: (product: Product) => void;
  onSaveAll: () => void;
  onDiscard: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand bg-white p-3 shadow-card">
        <div>
          <h2 className="text-lg font-black text-charcoal">وضع تحديث الأسعار</h2>
          <p className="mt-1 text-sm font-bold text-charcoal-muted">
            عدّل الأسعار والكمية ثم احفظ الصف أو كل التغييرات مرة واحدة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="flex h-10 items-center rounded-xl bg-cream-warm px-3 text-sm font-black text-charcoal">
            {visibleDraftCount} تعديل في الصفحة
          </span>
          <button title="Ctrl + S" onClick={onSaveAll} disabled={savingAll || Object.keys(drafts).length === 0} className="h-10 rounded-xl bg-olive px-4 text-sm font-black text-white disabled:opacity-60">
            {savingAll ? 'جاري الحفظ...' : 'حفظ كل التعديلات'}
          </button>
          <button onClick={onDiscard} disabled={Object.keys(drafts).length === 0} className="h-10 rounded-xl bg-cream-warm px-4 text-sm font-black text-charcoal disabled:opacity-60">
            إلغاء التعديلات
          </button>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-sand bg-white shadow-card lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-right">
            <thead className="bg-cream text-xs font-black text-charcoal-muted">
              <tr>
                <th className="px-3 py-3">صورة</th>
                <th className="px-3 py-3">اسم المنتج</th>
                <th className="px-3 py-3">القسم</th>
                <th className="px-3 py-3">السعر الحالي</th>
                <th className="px-3 py-3">السعر القديم</th>
                <th className="px-3 py-3">الكمية</th>
                <th className="px-3 py-3">متاح / خلصان</th>
                <th className="px-3 py-3">عرض</th>
                <th className="px-3 py-3">حفظ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {products.map((product) => {
                const productId = String(product.id);
                const draft = getDraft(product);
                const changed = Boolean(drafts[productId]);
                const saved = savedDraftIds.has(productId);
                return (
                  <tr key={productId} className={`${changed ? 'bg-clay/5' : saved ? 'bg-success/5' : 'hover:bg-cream/60'}`}>
                    <td className="px-3 py-3"><ProductImage product={product} size="sm" /></td>
                    <td className="max-w-[240px] px-3 py-3">
                      <p className="line-clamp-1 text-sm font-black text-charcoal">{product.name}</p>
                      <div className="mt-1 flex gap-1">
                        {changed && <Badge text="تم التعديل" />}
                        {saved && <Badge text="تم الحفظ" />}
                        {draft.isOffer && !draft.oldPrice.trim() && <Badge text="عرض بدون سعر قديم" danger />}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm font-bold text-charcoal-muted">{product.category || 'بدون قسم'}</td>
                    <td className="px-3 py-3">
                      <PriceDraftInput value={draft.price} onChange={(value) => onDraftChange(product, { price: value })} onEnter={() => onSaveRow(product)} />
                    </td>
                    <td className="px-3 py-3">
                      <PriceDraftInput value={draft.oldPrice} placeholder="اختياري" onChange={(value) => onDraftChange(product, { oldPrice: value })} onEnter={() => onSaveRow(product)} />
                    </td>
                    <td className="px-3 py-3">
                      <PriceDraftInput value={draft.stockQuantity} onChange={(value) => onDraftChange(product, { stockQuantity: value })} onEnter={() => onSaveRow(product)} />
                    </td>
                    <td className="px-3 py-3">
                      <SwitchPill checked={draft.available} onChange={() => onDraftChange(product, { available: !draft.available })} trueLabel="متاح" falseLabel="خلصان" />
                    </td>
                    <td className="px-3 py-3">
                      <SwitchPill checked={draft.isOffer} onChange={() => onDraftChange(product, { isOffer: !draft.isOffer })} trueLabel="عرض" falseLabel="لا" />
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => onSaveRow(product)} disabled={!changed || savingKey === `${productId}-draft`} className="h-10 rounded-xl bg-olive px-3 text-xs font-black text-white disabled:opacity-50">
                        {savingKey === `${productId}-draft` ? 'حفظ...' : 'حفظ'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 lg:hidden">
        {products.map((product) => {
          const productId = String(product.id);
          const draft = getDraft(product);
          const changed = Boolean(drafts[productId]);
          return (
            <div key={productId} className={`rounded-2xl border p-3 shadow-card ${changed ? 'border-clay/30 bg-clay/5' : 'border-sand bg-white'}`}>
              <div className="flex gap-3">
                <ProductImage product={product} />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-black text-charcoal">{product.name}</h3>
                  <p className="mt-1 text-xs font-bold text-charcoal-muted">{product.category || 'بدون قسم'}</p>
                  {changed && <div className="mt-2"><Badge text="تم التعديل" /></div>}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <PriceDraftInput value={draft.price} onChange={(value) => onDraftChange(product, { price: value })} onEnter={() => onSaveRow(product)} />
                <PriceDraftInput value={draft.oldPrice} placeholder="قديم" onChange={(value) => onDraftChange(product, { oldPrice: value })} onEnter={() => onSaveRow(product)} />
                <PriceDraftInput value={draft.stockQuantity} onChange={(value) => onDraftChange(product, { stockQuantity: value })} onEnter={() => onSaveRow(product)} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <SwitchPill checked={draft.available} onChange={() => onDraftChange(product, { available: !draft.available })} trueLabel="متاح" falseLabel="خلصان" />
                <SwitchPill checked={draft.isOffer} onChange={() => onDraftChange(product, { isOffer: !draft.isOffer })} trueLabel="عرض" falseLabel="لا" />
                <button onClick={() => onSaveRow(product)} disabled={!changed || savingKey === `${productId}-draft`} className="h-10 rounded-xl bg-olive text-xs font-black text-white disabled:opacity-50">
                  حفظ
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PriceDraftInput({ value, onChange, onEnter, placeholder = '0' }: { value: string; onChange: (value: string) => void; onEnter: () => void; placeholder?: string }) {
  return (
    <input
      type="number"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onEnter();
      }}
      className="h-10 w-full rounded-xl border border-sand bg-white px-2 text-sm font-black text-charcoal outline-none focus:border-olive focus:ring-2 focus:ring-olive/10"
    />
  );
}

function QuickAddModal({
  form,
  categories,
  similarProducts,
  lastAddedProduct,
  allowDuplicate,
  uploading,
  saving,
  onChange,
  onApplyTemplate,
  onAllowDuplicate,
  onOpenExisting,
  onUpload,
  onOpenFull,
  onEditLast,
  onViewLast,
  onSave,
  onSaveAnother,
  onAddAnother,
  onClose,
}: {
  form: QuickProductForm;
  categories: Category[];
  similarProducts: Product[];
  lastAddedProduct: Product | null;
  allowDuplicate: boolean;
  uploading: boolean;
  saving: boolean;
  onChange: (form: QuickProductForm) => void;
  onApplyTemplate: (template: ProductTemplate) => void;
  onAllowDuplicate: () => void;
  onOpenExisting: (product: Product) => void;
  onUpload: (file?: File) => void;
  onOpenFull: () => void;
  onEditLast: (product: Product) => void;
  onViewLast: (product: Product) => void;
  onSave: () => void;
  onSaveAnother: () => void;
  onAddAnother: () => void;
  onClose: () => void;
}) {
  const selectedCategory = categories.find((category) => category.id === form.categoryId);
  const unitSuggestions = getCategoryUnitSuggestions(selectedCategory?.name || '');

  if (lastAddedProduct) {
    return (
      <Modal title="تم إضافة المنتج" onClose={onClose} width="md">
        <div className="space-y-4">
          <div className="rounded-2xl bg-success/10 p-4 text-center">
            <p className="text-lg font-black text-success">تم إضافة المنتج</p>
            <p className="mt-1 text-sm font-bold text-charcoal">{lastAddedProduct.name}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button onClick={onAddAnother} className="h-12 rounded-xl bg-clay text-sm font-black text-white">
              إضافة منتج آخر
            </button>
            <button onClick={() => onEditLast(lastAddedProduct)} className="h-12 rounded-xl bg-olive text-sm font-black text-white">
              تعديل التفاصيل الكاملة
            </button>
            <button onClick={() => onViewLast(lastAddedProduct)} className="h-12 rounded-xl bg-cream-warm text-sm font-black text-charcoal">
              عرض في صفحة العملاء
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="إضافة منتج سريع" onClose={onClose} width="md">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-black text-charcoal">إضافة من قالب</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {productTemplates.map((template) => (
              <button
                key={template.value}
                onClick={() => onApplyTemplate(template.value)}
                className="h-10 rounded-xl bg-cream-warm px-2 text-xs font-black text-charcoal hover:bg-sand/70"
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>
        <Field label="اسم المنتج" value={form.name} onChange={(value) => onChange({ ...form, name: value })} placeholder="مثال: سكر 1 كيلو" />
        {similarProducts.length > 0 && (
          <div className="rounded-2xl border border-clay/25 bg-clay/5 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-clay-dark">قد يكون هذا المنتج موجود بالفعل</p>
                <p className="mt-1 text-xs font-bold text-charcoal-muted">راجع المنتجات المتشابهة قبل الإضافة.</p>
              </div>
              {!allowDuplicate && (
                <button onClick={onAllowDuplicate} className="h-9 rounded-xl bg-white px-3 text-xs font-black text-clay-dark">
                  إضافة على أي حال
                </button>
              )}
            </div>
            <div className="mt-3 grid gap-2">
              {similarProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-2">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-black text-charcoal">{product.name}</p>
                    <p className="text-xs font-bold text-charcoal-muted">{product.price} جنيه - {product.category || 'بدون قسم'}</p>
                  </div>
                  <button onClick={() => onOpenExisting(product)} className="h-9 rounded-xl bg-cream-warm px-3 text-xs font-black text-charcoal">
                    فتح
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="القسم"
            value={form.categoryId}
            onChange={(value) => {
              const category = categories.find((item) => item.id === value);
              const suggestions = getCategoryUnitSuggestions(category?.name || '');
              onChange({ ...form, categoryId: value, unit: suggestions[0] || form.unit });
            }}
          >
            <option value="">اختار القسم</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
          <Field label="السعر" type="number" value={form.price} onChange={(value) => onChange({ ...form, price: value })} />
        </div>
        {form.isOffer && (
          <div>
            <Field label="السعر القديم للعرض" type="number" value={form.oldPrice} onChange={(value) => onChange({ ...form, oldPrice: value })} />
            {!form.oldPrice.trim() && <p className="mt-1 text-xs font-black text-clay-dark">تنبيه: العرض الأفضل يظهر بسعر قديم واضح.</p>}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الوحدة" value={form.unit} onChange={(value) => onChange({ ...form, unit: value })} placeholder="قطعة، كيلو، عبوة" />
          <Toggle label={form.available ? 'متاح' : 'خلصان'} checked={form.available} onChange={(checked) => onChange({ ...form, available: checked })} />
        </div>
        <div className="grid gap-2">
          <Toggle label="عرض اليوم" checked={form.isOffer} onChange={(checked) => onChange({ ...form, isOffer: checked })} />
        </div>
        {unitSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {unitSuggestions.map((unit) => (
              <button
                key={unit}
                onClick={() => onChange({ ...form, unit })}
                className={`h-9 rounded-full px-3 text-xs font-black ${form.unit === unit ? 'bg-olive text-white' : 'border border-sand bg-white text-charcoal'}`}
              >
                {unit}
              </button>
            ))}
          </div>
        )}
        <ImageUploadBox
          imageUrl={form.imageUrl}
          uploading={uploading}
          onUpload={onUpload}
          onClear={() => onChange({ ...form, imageUrl: '' })}
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <button onClick={onSave} disabled={saving || uploading} className="h-12 rounded-xl bg-olive text-sm font-black text-white disabled:opacity-60">
            {saving ? 'جاري الحفظ...' : 'حفظ المنتج'}
          </button>
          <button onClick={onSaveAnother} disabled={saving || uploading} className="h-12 rounded-xl bg-clay text-sm font-black text-white disabled:opacity-60">
            إضافة منتج آخر
          </button>
          <button onClick={onOpenFull} className="h-12 rounded-xl bg-cream-warm text-sm font-black text-charcoal">
            فتح النموذج الكامل
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FullProductModal({
  form,
  categories,
  shops,
  uploading,
  saving,
  onChange,
  onUpload,
  onClearImage,
  onSave,
  onSaveAnother,
  onClose,
}: {
  form: ProductForm;
  categories: Category[];
  shops: Shop[];
  uploading: boolean;
  saving: boolean;
  onChange: (form: ProductForm) => void;
  onUpload: (file?: File) => void;
  onClearImage: () => void;
  onSave: () => void;
  onSaveAnother: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={form.id ? 'تعديل منتج' : 'إضافة منتج'} onClose={onClose} width="lg">
      <div className="space-y-5">
        <FormSection title="البيانات الأساسية">
          <Field label="اسم المنتج" value={form.name} onChange={(value) => onChange({ ...form, name: value })} />
          <Textarea label="الوصف" value={form.description} onChange={(value) => onChange({ ...form, description: value })} />
          <div className="grid gap-3 md:grid-cols-3">
            <Select label="القسم" value={form.categoryId} onChange={(value) => onChange({ ...form, categoryId: value })}>
              <option value="">اختار القسم</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
            <Select label="المحل" value={form.shopId} onChange={(value) => onChange({ ...form, shopId: value })}>
              <option value="">بدون محل</option>
              {shops.map((shop) => <option key={shop.id} value={String(shop.id)}>{shop.name}</option>)}
            </Select>
            <Field label="الوحدة" value={form.unit} onChange={(value) => onChange({ ...form, unit: value })} />
          </div>
        </FormSection>

        <FormSection title="السعر والكمية">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="السعر الحالي" type="number" value={form.price} onChange={(value) => onChange({ ...form, price: value })} />
            <Field label="السعر القديم" type="number" value={form.oldPrice} onChange={(value) => onChange({ ...form, oldPrice: value })} />
            <Field label="الكمية المتاحة" type="number" value={form.stockQuantity} onChange={(value) => onChange({ ...form, stockQuantity: value })} />
            <Toggle label={form.available ? 'متاح' : 'خلصان'} checked={form.available} onChange={(checked) => onChange({ ...form, available: checked })} />
          </div>
          {form.isOffer && !form.oldPrice.trim() && (
            <p className="text-xs font-black text-clay-dark">تنبيه: المنتج عليه عرض بدون سعر قديم.</p>
          )}
        </FormSection>

        <FormSection title="التصنيف والظهور">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Toggle label="عرض اليوم" checked={form.isOffer} onChange={(checked) => onChange({ ...form, isOffer: checked })} />
            <Toggle label="منتج مميز" checked={form.isFeatured} onChange={(checked) => onChange({ ...form, isFeatured: checked })} />
            <Field label="ترتيب الظهور" type="number" value={form.sortOrder} onChange={(value) => onChange({ ...form, sortOrder: value })} />
          </div>
        </FormSection>

        <FormSection title="البحث والكلمات المفتاحية">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="كلمات البحث" value={form.keywords} onChange={(value) => onChange({ ...form, keywords: value })} placeholder="سكر، رز، زيت" />
            <Field label="Tags" value={form.tags} onChange={(value) => onChange({ ...form, tags: value })} placeholder="أساسي، عرض، مميز" />
          </div>
        </FormSection>

        <FormSection title="الصورة">
          <ImageUploadBox imageUrl={form.imageUrl} uploading={uploading} onUpload={onUpload} onClear={onClearImage} />
        </FormSection>

        <div className="grid gap-2 sm:grid-cols-3">
          <button onClick={onSave} disabled={saving || uploading} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-olive text-sm font-black text-white disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button onClick={onSaveAnother} disabled={saving || uploading} className="h-12 rounded-xl bg-clay text-sm font-black text-white disabled:opacity-60">
            حفظ وإضافة منتج جديد
          </button>
          <button onClick={onClose} className="h-12 rounded-xl bg-cream-warm text-sm font-black text-charcoal">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

function BulkUpdateModal({
  mode,
  value,
  selectedCount,
  preview,
  hasInvalidPrice,
  saving,
  onModeChange,
  onValueChange,
  onApply,
  onClose,
}: {
  mode: BulkMode;
  value: string;
  selectedCount: number;
  preview: Array<{ product: Product; next: Partial<ProductInput> & { price: number } }>;
  hasInvalidPrice: boolean;
  saving: boolean;
  onModeChange: (mode: BulkMode) => void;
  onValueChange: (value: string) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const needsValue = !['setOldPrice', 'setOffer', 'clearOffer'].includes(mode);

  return (
    <Modal title="تحديث أسعار جماعي" onClose={onClose} width="lg">
      <div className="space-y-4">
        <div className="rounded-2xl bg-cream p-3 text-sm font-black text-charcoal">
          المنتجات المحددة: {selectedCount}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <Select label="نوع التحديث" value={mode} onChange={(nextMode) => onModeChange(nextMode as BulkMode)}>
            <option value="increasePercent">زيادة بنسبة %</option>
            <option value="decreasePercent">تخفيض بنسبة %</option>
            <option value="addFixed">إضافة مبلغ ثابت</option>
            <option value="subtractFixed">خصم مبلغ ثابت</option>
            <option value="setOldPrice">جعل السعر القديم = السعر الحالي</option>
            <option value="setOffer">جعل المنتجات عروض</option>
            <option value="clearOffer">إلغاء العروض</option>
          </Select>
          {needsValue && <Field label="القيمة" type="number" value={value} onChange={onValueChange} />}
        </div>
        {hasInvalidPrice && (
          <div className="rounded-xl bg-error/10 p-3 text-sm font-black text-error">
            في منتج سعره الجديد أقل من صفر. عدّل القيمة قبل التأكيد.
          </div>
        )}
        <div className="max-h-80 overflow-y-auto rounded-2xl border border-sand">
          <table className="w-full text-right text-sm">
            <thead className="sticky top-0 bg-cream text-xs font-black text-charcoal-muted">
              <tr>
                <th className="px-3 py-2">المنتج</th>
                <th className="px-3 py-2">السعر القديم</th>
                <th className="px-3 py-2">السعر الجديد</th>
                <th className="px-3 py-2">العرض</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand bg-white">
              {preview.map(({ product, next }) => (
                <tr key={product.id}>
                  <td className="px-3 py-2 font-bold">{product.name}</td>
                  <td className="px-3 py-2">{product.price}</td>
                  <td className={`px-3 py-2 font-black ${next.price < 0 ? 'text-error' : 'text-olive-dark'}`}>{roundPrice(next.price)}</td>
                  <td className="px-3 py-2">{next.isOffer ?? product.isOffer ? 'عرض' : 'لا'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button onClick={onApply} disabled={saving || selectedCount === 0 || hasInvalidPrice} className="h-12 rounded-xl bg-olive text-sm font-black text-white disabled:opacity-60">
            {saving ? 'جاري التحديث...' : 'تأكيد التحديث'}
          </button>
          <button onClick={onClose} className="h-12 rounded-xl bg-cream-warm text-sm font-black text-charcoal">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

function ImportCsvModal({
  products,
  saving,
  onApply,
  onClose,
}: {
  products: Product[];
  saving: boolean;
  onApply: (updates: CsvPriceUpdate[]) => void;
  onClose: () => void;
}) {
  const [fileName, setFileName] = useState('');
  const [updates, setUpdates] = useState<CsvPriceUpdate[]>([]);
  const [readError, setReadError] = useState('');

  const validRows = updates.filter((row) => row.product && row.errors.length === 0);
  const hasErrors = updates.some((row) => row.errors.length > 0);
  const missingIds = updates.filter((row) => row.id && !row.product).length;

  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setReadError('');
    try {
      const text = await file.text();
      setUpdates(parsePriceCsv(text, products));
    } catch {
      setReadError('تعذر قراءة الملف. تأكد أنه CSV صحيح.');
      setUpdates([]);
    }
  };

  return (
    <Modal title="استيراد CSV لتحديث الأسعار" onClose={onClose} width="md">
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-sand bg-cream p-4 text-sm font-bold text-charcoal-muted">
          ارفع ملف CSV لتحديث المنتجات الموجودة فقط عن طريق ID.
          <br />
          id, price, old_price, stock_quantity, available
        </div>
        <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-olive text-sm font-black text-white">
          <FileUp className="h-4 w-4" />
          اختيار ملف CSV
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
        </label>
        {fileName && <p className="text-sm font-bold text-charcoal-muted">الملف: {fileName}</p>}
        {readError && <div className="rounded-xl bg-error/10 p-3 text-sm font-black text-error">{readError}</div>}

        {updates.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <SummaryCard label="صفوف مقروءة" value={updates.length} />
              <SummaryCard label="سيتم تحديثها" value={validRows.length} tone="success" />
              <SummaryCard label="بها أخطاء" value={updates.length - validRows.length} tone="danger" />
              <SummaryCard label="ID غير موجود" value={missingIds} tone="warn" />
            </div>
            <div className={`rounded-xl p-3 text-sm font-black ${hasErrors ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
              {hasErrors ? 'سيتم تخطي الصفوف التي بها أخطاء عند التأكيد' : `جاهز لتحديث ${validRows.length} منتج`}
            </div>
            <div className="max-h-80 overflow-y-auto rounded-2xl border border-sand">
              <table className="w-full min-w-[860px] text-right text-sm">
                <thead className="sticky top-0 bg-cream text-xs font-black text-charcoal-muted">
                  <tr>
                    <th className="px-3 py-2">الصف</th>
                    <th className="px-3 py-2">المنتج</th>
                    <th className="px-3 py-2">السعر الحالي</th>
                    <th className="px-3 py-2">السعر الجديد</th>
                    <th className="px-3 py-2">الكمية الحالية</th>
                    <th className="px-3 py-2">الكمية الجديدة</th>
                    <th className="px-3 py-2">الحالة الحالية</th>
                    <th className="px-3 py-2">الحالة الجديدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand bg-white">
                  {updates.map((row) => (
                    <tr key={`${row.rowNumber}-${row.id}`}>
                      <td className="px-3 py-2 font-bold">{row.rowNumber}</td>
                      <td className="px-3 py-2">
                        <p className="font-bold text-charcoal">{row.product?.name || row.id || 'بدون ID'}</p>
                        {row.errors.length > 0 && <p className="mt-1 text-xs font-black text-error">{row.errors.join(' - ')}</p>}
                      </td>
                      <td className="px-3 py-2">{row.product?.price ?? '-'}</td>
                      <td className="px-3 py-2 font-black text-olive-dark">{row.price ?? '-'}</td>
                      <td className="px-3 py-2">{row.product?.stockQuantity ?? '-'}</td>
                      <td className="px-3 py-2 font-black text-olive-dark">{row.stockQuantity ?? '-'}</td>
                      <td className="px-3 py-2">{row.product ? row.product.available ? 'متاح' : 'خلصان' : '-'}</td>
                      <td className="px-3 py-2 font-black text-olive-dark">{row.available === undefined ? '-' : row.available ? 'متاح' : 'خلصان'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={() => onApply(updates)}
            disabled={saving || validRows.length === 0}
            className="h-12 rounded-xl bg-olive text-sm font-black text-white disabled:opacity-60"
          >
            {saving ? 'جاري التحديث...' : 'تأكيد التحديث'}
          </button>
          <button onClick={onClose} className="h-12 rounded-xl bg-cream-warm text-sm font-black text-charcoal">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

function InlineNumber({
  value,
  onSave,
  saving,
  required = false,
  placeholder = '0',
}: {
  value?: number;
  onSave: (value: string) => Promise<boolean>;
  saving?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value === undefined || value === null ? '' : String(value));

  const commit = async () => {
    if (required && !draft.trim()) return;
    const ok = await onSave(draft);
    if (ok) setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => {
          setDraft(value === undefined || value === null ? '' : String(value));
          setEditing(true);
        }}
        className="min-h-10 min-w-[78px] rounded-xl bg-cream-warm px-2 text-sm font-black text-charcoal hover:bg-sand/70"
      >
        {value === undefined || value === null ? placeholder : value}
      </button>
    );
  }

  return (
    <div className="flex min-w-[140px] items-center gap-1">
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void commit();
          if (event.key === 'Escape') setEditing(false);
        }}
        className="h-10 w-20 rounded-xl border border-olive px-2 text-sm font-black outline-none"
      />
      <button onClick={() => void commit()} disabled={saving} className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive text-white disabled:opacity-60">
        {saving ? '...' : <Check className="h-4 w-4" />}
      </button>
      <button onClick={() => setEditing(false)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-warm text-charcoal">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ImageUploadBox({
  imageUrl,
  uploading,
  onUpload,
  onClear,
}: {
  imageUrl?: string;
  uploading: boolean;
  onUpload: (file?: File) => void;
  onClear: () => void;
}) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onUpload(event.dataTransfer.files?.[0]);
      }}
      className="rounded-2xl border border-dashed border-olive/40 bg-cream p-3"
    >
      <div className="flex items-center gap-3">
        <img src={imageUrl || fallbackImage} alt="" className="h-24 w-24 rounded-2xl bg-white object-cover" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-charcoal">اسحب الصورة هنا أو ارفعها</p>
          <p className="mt-1 text-xs font-bold text-charcoal-muted">JPG أو PNG أو WEBP حتى 3 ميجا</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-olive px-3 text-xs font-black text-white">
              <ImagePlus className="h-4 w-4" />
              {uploading ? 'جاري الرفع...' : 'تغيير الصورة'}
              <input type="file" accept="image/*" className="hidden" onChange={(event) => onUpload(event.target.files?.[0])} />
            </label>
            {imageUrl && (
              <button onClick={onClear} className="flex h-10 items-center gap-2 rounded-xl bg-error/10 px-3 text-xs font-black text-error">
                <ImageOff className="h-4 w-4" />
                حذف الصورة
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductImage({ product, size = 'md' }: { product: Product; size?: 'sm' | 'md' }) {
  const classes = size === 'sm' ? 'h-14 w-14' : 'h-20 w-20';
  return (
    <div className={`relative flex-shrink-0 overflow-hidden rounded-xl bg-cream-warm ${classes}`}>
      <img src={product.imageUrl || product.image || fallbackImage} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
      {!hasRealImage(product) && (
        <span className="absolute inset-x-1 bottom-1 rounded bg-error/90 px-1 py-0.5 text-center text-[9px] font-black text-white">
          بدون صورة
        </span>
      )}
    </div>
  );
}

function SwitchPill({ checked, onChange, trueLabel, falseLabel }: { checked: boolean; onChange: () => void; trueLabel: string; falseLabel: string }) {
  return (
    <button
      onClick={onChange}
      className={`h-9 rounded-full px-3 text-xs font-black transition ${
        checked ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-error/10 text-error hover:bg-error/20'
      }`}
    >
      {checked ? trueLabel : falseLabel}
    </button>
  );
}

function Modal({ title, children, onClose, width = 'md' }: { title: string; children: ReactNode; onClose: () => void; width?: 'md' | 'lg' }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-charcoal/55 p-0 md:items-center md:justify-center md:p-4">
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-elevated md:rounded-2xl ${width === 'lg' ? 'md:max-w-4xl' : 'md:max-w-xl'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-charcoal">{title}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream-warm">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-sand bg-white p-3">
      <h3 className="mb-3 text-sm font-black text-olive-dark">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ExportCsvModal({
  categories,
  onExport,
  onClose,
}: {
  categories: Category[];
  onExport: (scope: ExportScope, categoryId?: string) => void;
  onClose: () => void;
}) {
  const [scope, setScope] = useState<ExportScope>('filtered');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');

  return (
    <Modal title="تصدير المنتجات" onClose={onClose} width="md">
      <div className="space-y-4">
        <Select label="نوع التصدير" value={scope} onChange={(value) => setScope(value as ExportScope)}>
          <option value="filtered">المنتجات الظاهرة بعد الفلترة فقط</option>
          <option value="all">كل المنتجات</option>
          <option value="category">منتجات قسم محدد</option>
          <option value="unavailable">المنتجات غير المتوفرة</option>
          <option value="no-image">المنتجات بدون صورة</option>
          <option value="offers">العروض فقط</option>
        </Select>
        {scope === 'category' && (
          <Select label="القسم" value={categoryId} onChange={setCategoryId}>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
        )}
        <div className="rounded-2xl bg-cream p-3 text-sm font-bold text-charcoal-muted">
          اسم الملف: souq-products-{getCairoDateKey()}.csv
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button onClick={() => onExport(scope, categoryId)} className="h-12 rounded-xl bg-olive text-sm font-black text-white">
            تصدير المنتجات
          </button>
          <button onClick={onClose} className="h-12 rounded-xl bg-cream-warm text-sm font-black text-charcoal">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

function SummaryCard({ label, value, tone = 'plain' }: { label: string; value: number; tone?: 'plain' | 'success' | 'danger' | 'warm' | 'warn' }) {
  const toneClass =
    tone === 'success' ? 'bg-success/10 text-success' :
    tone === 'danger' ? 'bg-error/10 text-error' :
    tone === 'warm' ? 'bg-clay/10 text-clay-dark' :
    tone === 'warn' ? 'bg-sahar/15 text-sahar-dark' :
    'bg-cream-warm text-charcoal';

  return (
    <div className="rounded-2xl border border-sand bg-white p-3 shadow-card">
      <p className={`w-fit rounded-full px-2 py-1 text-[11px] font-black ${toneClass}`}>{label}</p>
      <p className="mt-2 text-2xl font-black text-charcoal">{value}</p>
    </div>
  );
}

function Notice({ children, tone, onClose }: { children: ReactNode; tone: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl p-3 text-sm font-bold ${
      tone === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
    }`}>
      <span>{children}</span>
      <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function AdminButton({ children, icon, onClick, disabled, tone = 'olive', title }: { children: ReactNode; icon: ReactNode; onClick: () => void; disabled?: boolean; tone?: 'olive' | 'clay' | 'plain'; title?: string }) {
  const toneClass =
    tone === 'clay' ? 'bg-clay text-white' :
    tone === 'plain' ? 'border border-sand bg-white text-charcoal' :
    'bg-olive text-white';

  return (
    <button title={title} onClick={onClick} disabled={disabled} className={`flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black disabled:opacity-50 ${toneClass}`}>
      {icon}
      {children}
    </button>
  );
}

function IconButton({ children, label, onClick, danger = false }: { children: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-xl ${danger ? 'bg-error/10 text-error' : 'bg-cream-warm text-charcoal'}`}
    >
      {children}
    </button>
  );
}

function ControlSelect({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-xl border border-sand bg-cream px-3 text-sm font-bold text-charcoal outline-none focus:border-olive">
      {children}
    </select>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-black text-charcoal">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-sand px-3 text-sm font-bold outline-none focus:border-olive" />
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-black text-charcoal">{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-sand px-3 py-2 text-sm font-bold outline-none focus:border-olive" />
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-black text-charcoal">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-sand px-3 text-sm font-bold outline-none focus:border-olive">
        {children}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-black ${checked ? 'bg-olive/10 text-olive-dark' : 'bg-cream-warm text-charcoal-muted'}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function Badge({ text, danger = false }: { text: string; danger?: boolean }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${danger ? 'bg-error/10 text-error' : 'bg-clay/10 text-clay-dark'}`}>{text}</span>;
}

function LoadingProducts() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-44 animate-pulse rounded-2xl bg-sand/60" />
      ))}
    </div>
  );
}

function EmptyProducts({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-sand bg-white p-8 text-center shadow-card">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-olive/10 text-olive">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <p className="text-lg font-black text-charcoal">لسه مفيش منتجات</p>
      <p className="mt-1 text-sm font-bold text-charcoal-muted">ابدأ بإضافة أول منتج في سوق البلد.</p>
      <button onClick={onAdd} className="mx-auto mt-4 flex h-11 items-center gap-2 rounded-xl bg-olive px-4 text-sm font-black text-white">
        <Plus className="h-4 w-4" />
        إضافة أول منتج
      </button>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

const quickFilters: Array<{ label: string; value: QuickFilter }> = [
  { label: 'الكل', value: 'all' },
  { label: 'عروض فقط', value: 'offers' },
  { label: 'غير متاح', value: 'unavailable' },
  { label: 'بدون صورة', value: 'no-image' },
  { label: 'مميزة', value: 'featured' },
  { label: 'تحديث اليوم', value: 'updated-today' },
  { label: 'لم تحدث من 30 يوم', value: 'stale' },
  { label: 'بيانات ناقصة', value: 'missing-data' },
  { label: 'سعر ناقص', value: 'missing-price' },
  { label: 'عرض بدون سعر قديم', value: 'offer-missing-old-price' },
  { label: 'المخزون والتوفر', value: 'low-stock' },
];

const productTemplates: Array<{ label: string; value: ProductTemplate }> = [
  { label: 'منتج بقالة', value: 'grocery' },
  { label: 'منتج خضار', value: 'vegetables' },
  { label: 'منتج منظفات', value: 'cleaning' },
  { label: 'منتج عرض', value: 'offer' },
];

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function createPriceDraft(product: Product): PriceDraft {
  return {
    price: String(product.price),
    oldPrice: product.oldPrice ? String(product.oldPrice) : '',
    stockQuantity: String(product.stockQuantity ?? 0),
    available: product.available,
    isOffer: product.isOffer,
  };
}

function validatePriceDraft(draft: PriceDraft) {
  const price = Number(draft.price);
  const oldPrice = draft.oldPrice.trim() ? Number(draft.oldPrice) : undefined;
  const stockQuantity = Number(draft.stockQuantity || 0);
  if (!draft.price.trim()) return 'السعر مطلوب';
  if (Number.isNaN(price) || price < 0) return 'السعر لا يكون أقل من 0';
  if (oldPrice !== undefined && (Number.isNaN(oldPrice) || oldPrice < 0)) return 'السعر القديم لا يكون أقل من 0';
  if (Number.isNaN(stockQuantity) || stockQuantity < 0) return 'الكمية لا تكون أقل من 0';
  if (draft.isOffer && oldPrice !== undefined && oldPrice <= price) return 'السعر القديم لازم يكون أكبر من السعر الحالي في حالة العرض';
  return '';
}

function priceDraftToProductInput(draft: PriceDraft): Partial<ProductInput> {
  return {
    price: Number(draft.price),
    oldPrice: draft.oldPrice.trim() ? Number(draft.oldPrice) : undefined,
    stockQuantity: Number(draft.stockQuantity || 0),
    available: draft.available,
    isOffer: draft.isOffer,
  };
}

function priceDraftToProduct(product: Product, draft: PriceDraft): Partial<Product> {
  return {
    price: Number(draft.price),
    oldPrice: draft.oldPrice.trim() ? Number(draft.oldPrice) : undefined,
    stockQuantity: Number(draft.stockQuantity || 0),
    available: draft.available,
    isOffer: draft.isOffer,
    category: product.category,
  };
}

function formToInput(form: ProductForm): ProductInput {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    categoryId: form.categoryId,
    shopId: form.shopId || undefined,
    price: Number(form.price),
    oldPrice: form.oldPrice.trim() ? Number(form.oldPrice) : undefined,
    unit: form.unit || 'قطعة',
    imageUrl: form.imageUrl || undefined,
    available: form.available,
    stockQuantity: Number(form.stockQuantity || 0),
    isOffer: form.isOffer,
    isLocalProduct: form.isLocalProduct,
    isFeatured: form.isFeatured,
    keywords: splitList(form.keywords),
    tags: splitList(form.tags),
    sortOrder: Number(form.sortOrder || 0),
  };
}

function productToForm(product: Product, categories: Category[]): ProductForm {
  return {
    id: typeof product.id === 'string' ? product.id : undefined,
    name: product.name,
    description: product.description || '',
    categoryId: product.categoryId || categories.find((category) => category.name === product.category)?.id || '',
    shopId: typeof product.shopId === 'string' ? product.shopId : '',
    price: String(product.price),
    oldPrice: product.oldPrice ? String(product.oldPrice) : '',
    unit: product.unit,
    imageUrl: product.imageUrl || '',
    available: product.available,
    stockQuantity: String(product.stockQuantity ?? 0),
    isOffer: product.isOffer,
    isLocalProduct: product.isLocalProduct,
    isFeatured: Boolean(product.isFeatured),
    keywords: product.keywords.join(', '),
    tags: product.tags.join(', '),
    sortOrder: String(product.sortOrder ?? 0),
  };
}

function toInput(product: Product, overrides: Partial<ProductInput> | Partial<Product> = {}): ProductInput {
  const hasOldPriceOverride = Object.prototype.hasOwnProperty.call(overrides, 'oldPrice');
  const rawOldPrice = hasOldPriceOverride ? overrides.oldPrice : product.oldPrice;
  return {
    name: String(overrides.name ?? product.name),
    description: String(overrides.description ?? product.description ?? ''),
    categoryId: String(overrides.categoryId ?? product.categoryId ?? ''),
    shopId: typeof (overrides.shopId ?? product.shopId) === 'string' ? String(overrides.shopId ?? product.shopId) : undefined,
    price: Number(overrides.price ?? product.price),
    oldPrice: rawOldPrice === undefined || rawOldPrice === null ? undefined : Number(rawOldPrice),
    unit: String(overrides.unit ?? product.unit ?? 'قطعة'),
    imageUrl: String(overrides.imageUrl ?? product.imageUrl ?? ''),
    available: Boolean(overrides.available ?? product.available),
    active: Boolean(overrides.active ?? product.active ?? true),
    stockQuantity: Number(overrides.stockQuantity ?? product.stockQuantity ?? 0),
    isOffer: Boolean(overrides.isOffer ?? product.isOffer),
    isLocalProduct: Boolean(overrides.isLocalProduct ?? product.isLocalProduct),
    isFeatured: Boolean(overrides.isFeatured ?? product.isFeatured),
    keywords: product.keywords,
    tags: product.tags,
    sortOrder: Number(overrides.sortOrder ?? product.sortOrder ?? 0),
  };
}

function validateForm(form: ProductForm) {
  const price = Number(form.price);
  const oldPrice = form.oldPrice.trim() ? Number(form.oldPrice) : undefined;
  const stock = Number(form.stockQuantity || 0);
  if (!form.name.trim()) return 'اسم المنتج مطلوب';
  if (!form.categoryId) return 'القسم مطلوب';
  if (!form.price.trim()) return 'السعر مطلوب';
  if (Number.isNaN(price) || price < 0) return 'السعر لا يكون بالسالب';
  if (oldPrice !== undefined && (Number.isNaN(oldPrice) || oldPrice < 0)) return 'السعر القديم لا يكون بالسالب';
  if (form.isOffer && oldPrice !== undefined && oldPrice <= price) return 'السعر القديم لازم يكون أكبر من السعر الحالي في حالة العرض';
  if (Number.isNaN(stock) || stock < 0) return 'الكمية لا تكون بالسالب';
  return '';
}

function validateQuickForm(form: QuickProductForm) {
  const price = Number(form.price);
  const oldPrice = form.oldPrice.trim() ? Number(form.oldPrice) : undefined;
  if (!form.name.trim()) return 'اسم المنتج مطلوب';
  if (!form.categoryId) return 'القسم مطلوب';
  if (!form.price.trim()) return 'السعر مطلوب';
  if (Number.isNaN(price) || price < 0) return 'السعر لا يكون بالسالب';
  if (oldPrice !== undefined && (Number.isNaN(oldPrice) || oldPrice < 0)) return 'السعر القديم لا يكون بالسالب';
  if (form.isOffer && oldPrice !== undefined && oldPrice <= price) return 'السعر القديم لازم يكون أكبر من السعر الحالي في العرض';
  return '';
}

function hasRealImage(product: Product) {
  return Boolean(product.imageUrl && product.imageUrl.trim());
}

function hasMissingPrice(product: Product) {
  const price = Number(product.price);
  return Number.isNaN(price) || price <= 0;
}

function hasMissingData(product: Product) {
  return (
    !hasRealImage(product) ||
    !product.categoryId ||
    !product.category ||
    !product.unit?.trim() ||
    !product.name?.trim() ||
    product.name.trim().length < 3 ||
    hasMissingPrice(product)
  );
}

function parsePriceCsv(text: string, products: Product[]): CsvPriceUpdate[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const productMap = new Map(products.map((product) => [String(product.id), product]));
  const getIndex = (name: string) => headers.indexOf(name);
  const indexes = {
    id: getIndex('id'),
    price: getIndex('price'),
    oldPrice: getIndex('old_price'),
    stockQuantity: getIndex('stock_quantity'),
    available: getIndex('available'),
  };

  return lines.slice(1).map((line, index) => {
    const rowNumber = index + 2;
    const values = parseCsvLine(line);
    const errors: string[] = [];
    const id = readCsvValue(values, indexes.id);
    const product = productMap.get(id);

    if (indexes.id === -1) errors.push('عمود id غير موجود');
    if (!id) errors.push('id مطلوب');
    if (id && !product) errors.push('المنتج غير موجود');

    const price = parseOptionalNumber(readCsvValue(values, indexes.price));
    const oldPrice = parseOptionalNumber(readCsvValue(values, indexes.oldPrice));
    const stockQuantity = parseOptionalNumber(readCsvValue(values, indexes.stockQuantity));
    const available = parseOptionalBoolean(readCsvValue(values, indexes.available));

    if (price.error) errors.push('السعر غير صحيح');
    if (oldPrice.error) errors.push('السعر القديم غير صحيح');
    if (stockQuantity.error) errors.push('الكمية غير صحيحة');
    if (available.error) errors.push('الحالة غير صحيحة');
    if (price.value !== undefined && price.value < 0) errors.push('السعر أقل من صفر');
    if (oldPrice.value !== undefined && oldPrice.value < 0) errors.push('السعر القديم أقل من صفر');
    if (stockQuantity.value !== undefined && stockQuantity.value < 0) errors.push('الكمية أقل من صفر');

    return {
      rowNumber,
      id,
      product,
      price: price.value,
      oldPrice: oldPrice.value,
      stockQuantity: stockQuantity.value,
      available: available.value,
      errors,
    };
  });
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];
    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((value) => value.trim());
}

function readCsvValue(values: string[], index: number) {
  if (index < 0) return '';
  return values[index]?.trim() || '';
}

function parseOptionalNumber(value: string): { value?: number; error: boolean } {
  if (!value) return { value: undefined, error: false };
  const parsed = Number(value);
  return { value: parsed, error: Number.isNaN(parsed) };
}

function parseOptionalBoolean(value: string): { value?: boolean; error: boolean } {
  if (!value) return { value: undefined, error: false };
  const normalized = normalizeSearch(value);
  if (['true', '1', 'yes', 'y', 'متاح', 'available'].includes(normalized)) return { value: true, error: false };
  if (['false', '0', 'no', 'n', 'خلصان', 'غير متاح', 'unavailable'].includes(normalized)) return { value: false, error: false };
  return { value: undefined, error: true };
}

function calculateBulkProduct(product: Product, mode: BulkMode, value: number): Partial<ProductInput> & { price: number } {
  const currentPrice = Number(product.price);
  let price = currentPrice;
  let oldPrice = product.oldPrice;
  let isOffer = product.isOffer;

  if (mode === 'increasePercent') price = currentPrice * (1 + value / 100);
  if (mode === 'decreasePercent') price = currentPrice * (1 - value / 100);
  if (mode === 'addFixed') price = currentPrice + value;
  if (mode === 'subtractFixed') price = currentPrice - value;
  if (mode === 'setOldPrice') oldPrice = currentPrice;
  if (mode === 'setOffer') isOffer = true;
  if (mode === 'clearOffer') isOffer = false;

  return {
    price: roundPrice(price),
    oldPrice,
    isOffer,
  };
}

function roundPrice(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeSearch(value: unknown) {
  return String(value)
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCategoryUnitSuggestions(categoryName: string) {
  const normalized = normalizeSearch(categoryName);
  if (normalized.includes('بقال')) return ['كيلو', 'عبوة'];
  if (normalized.includes('خضار') || normalized.includes('فاكهه')) return ['كيلو'];
  if (normalized.includes('لحوم') || normalized.includes('دواجن')) return ['كيلو'];
  if (normalized.includes('منظف')) return ['عبوة'];
  if (normalized.includes('ادوات') || normalized.includes('منزليه')) return ['قطعة'];
  return ['قطعة', 'كيلو', 'عبوة'];
}

function findSimilarProducts(name: string, products: Product[]) {
  const normalizedName = normalizeProductName(name);
  if (normalizedName.length < 3) return [];
  return products
    .map((product) => ({ product, score: similarityScore(normalizedName, normalizeProductName(product.name)) }))
    .filter((item) => item.score >= 0.58)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
}

function normalizeProductName(value: string) {
  return normalizeSearch(value)
    .replace(/[0-9٠-٩]+/g, '')
    .replace(/\b(كيلو|كجم|جرام|جم|عبوه|عبوة|قطعه|قطعة|لتر)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarityScore(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const aTokens = new Set(a.split(' ').filter(Boolean));
  const bTokens = new Set(b.split(' ').filter(Boolean));
  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function isOlderThan(value: string | undefined, days: number) {
  if (!value) return true;
  const date = parseAppDate(value)?.getTime() ?? 0;
  return Date.now() - date > days * 24 * 60 * 60 * 1000;
}

function changeSourceLabel(source: PriceChangeSource) {
  if (source === 'inline') return 'تعديل سريع';
  if (source === 'quick_update') return 'وضع تحديث الأسعار';
  if (source === 'bulk_update') return 'تحديث جماعي';
  if (source === 'csv_import') return 'استيراد CSV';
  return 'النموذج الكامل';
}

function toCsv(rows: Array<Record<string, unknown>>) {
  const headers = ['id', 'name', 'category', 'price', 'old_price', 'unit', 'stock_quantity', 'available', 'is_offer'];
  const csvRows = rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','));
  return ['\uFEFF' + headers.join(','), ...csvRows].join('\n');
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
