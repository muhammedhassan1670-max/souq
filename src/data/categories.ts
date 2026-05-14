import type { Category, SubscriptionPackage } from './types';

export const categories: Category[] = [
  { id: 'بقالة', name: 'بقالة', icon: 'ShoppingBag', color: '#C4A35A' },
  { id: 'خضار وفاكهة', name: 'خضار وفاكهة', icon: 'Leaf', color: '#4A7C59' },
  { id: 'لحوم ودواجن', name: 'لحوم ودواجن', icon: 'Beef', color: '#B85042' },
  { id: 'أسماك', name: 'أسماك', icon: 'Fish', color: '#5B8DB8' },
  { id: 'منظفات', name: 'منظفات', icon: 'Sparkles', color: '#7A8B6A' },
  { id: 'أدوات منزلية', name: 'أدوات منزلية', icon: 'Home', color: '#B8704F' },
  { id: 'مستلزمات أطفال', name: 'مستلزمات أطفال', icon: 'Baby', color: '#D4956B' },
  { id: 'منتجات بلدي', name: 'منتجات بلدي', icon: 'Heart', color: '#9A7E3C' },
];

export const subscriptionPackages: SubscriptionPackage[] = [
  {
    id: 1,
    name: 'باقة البيت الأساسية',
    description: 'كل احتياجات البيت الأساسية في باقة واحدة',
    items: [
      'أرز 5 كيلو',
      'سكر 3 كيلو',
      'زيت طعام 3 لتر',
      'مكرونة 2 كيلو',
      'شاي 500 جرام',
      'دقيق 2 كيلو',
    ],
    frequency: 'شهري',
    price: 350,
    image: '/images/products/rice.jpg',
  },
  {
    id: 2,
    name: 'باقة خضار الأسبوع',
    description: 'خضار طازج يوصلك كل أسبوع',
    items: [
      'طماطم 2 كيلو',
      'بطاطس 2 كيلو',
      'خيار 1 كيلو',
      'بصل 1 كيلو',
      'فلفل 500 جرام',
      'باذنجان 1 كيلو',
    ],
    frequency: 'أسبوعي',
    price: 80,
    image: '/images/products/tomatoes.jpg',
  },
  {
    id: 3,
    name: 'باقة منظفات الشهر',
    description: 'كل المنظفات اللي محتاجها البيت',
    items: [
      'مسحوق غسيل 2 كيلو',
      'صابون أطباق 2 عبوة',
      'منظف أرضيات 2 لتر',
      'كلور 2 لتر',
      'صابون تواليت 4 قطع',
    ],
    frequency: 'شهري',
    price: 120,
    image: '/images/products/detergent.jpg',
  },
  {
    id: 4,
    name: 'باقة الأطفال',
    description: 'كل احتياجات أطفالك في باقة واحدة',
    items: [
      'حفاضات مقاس 4',
      'مناديل مبللة 2 عبوة',
      'شامبو أطفال',
      'صابون أطفال',
      'كريم مرطب',
    ],
    frequency: 'شهري',
    price: 200,
    image: '/images/products/diapers.jpg',
  },
];
