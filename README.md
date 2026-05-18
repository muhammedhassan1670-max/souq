# سوق البلد

واجهة Marketplace عربية RTL لطلبات القرية، مع لوحة تحكم حقيقية متصلة بـ Supabase.

## المتطلبات

- Node.js 20 أو أحدث
- حساب Supabase
- متصفح حديث

## إعداد Supabase

1. افتح Supabase وأنشئ مشروع جديد.
2. من Project Settings > API انسخ:
   - Project URL
   - anon public key
3. انسخ ملف البيئة:

```bash
cp .env.example .env
```

4. ضع القيم داخل `.env`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

5. افتح Supabase SQL Editor وشغّل الملف:

```text
supabase/schema.sql
```

6. الملف ينشئ الجداول و RLS policies و bucket باسم `market-images`.
   يشمل ذلك جدول `product_price_history` المستخدم في سجل تغييرات الأسعار داخل الأدمن.
   لو لم يظهر bucket تلقائيًا، أنشئه يدويًا من Storage واجعله Public.

7. من Authentication > Users أنشئ admin user بالبريد وكلمة المرور.

## التشغيل المحلي

```bash
npm install
npm run dev
```

افتح:

```text
http://127.0.0.1:5173
```

لو مفاتيح Supabase ناقصة، سيعمل الموقع ببيانات seed للتطوير، وستظهر رسالة واضحة في صفحة دخول الأدمن.

## تجربة الأدمن

1. افتح:

```text
/admin/login
```

2. سجّل دخولك بحساب Supabase Auth.
3. افتح `/admin/categories` وأضف قسم.
4. افتح `/admin/shops` وأضف محل.
5. افتح `/admin/products` وأضف منتج بصورة وسعر وقسم.
6. افتح صفحة العملاء `/products` وتأكد أن المنتج ظهر.
7. عدّل السعر من الأدمن وتأكد أن السعر يتحدث للعميل.
8. اجعل المنتج غير متاح وتأكد أنه يظهر `خلصان حاليًا`.

## لوحة التشغيل اليومية

- `/admin`: Daily Operation Dashboard لحالة السوق اليوم، آخر الطلبات، التنبيهات، والمهام اليومية.
- `/admin/products?mode=price-update`: وضع تحديث الأسعار السريع.
- `/admin/offers`: إدارة عروض اليوم وتصديرها.
- `/admin/inventory`: مراجعة المنتجات الناقصة والكمية القليلة.
- `/admin/requests`: مركز طلبات "اطلب أي حاجة" وطلبات البائعين.

أي تغيير سعر من الأدمن عبر inline edit أو وضع تحديث الأسعار أو التحديث الجماعي أو CSV أو النموذج الكامل يتم حفظه في `product_price_history`.

## تجربة طلب واتساب

1. من صفحة العميل أضف منتجين للسلة.
2. افتح Checkout.
3. اكتب الاسم ورقم الموبايل والعنوان.
4. اضغط `ابعت الطلب واتساب`.
5. يتم حفظ الطلب في `orders` وحفظ المنتجات في `order_items`.
6. يفتح واتساب برسالة منظمة.
7. تفضى السلة بعد نجاح الحفظ.
8. يظهر الطلب في `/admin/orders`.
9. رقم المنصة الافتراضي للاتصال والواتساب هو `01019851670`.
10. عند تغيير حالة الطلب من `/admin/orders` يتم تحديث الحالة داخل لوحة الأدمن ومحاولة إرسال تحديث واتساب تلقائيًا في الخلفية.
11. زر `نسخ التحديث` يظل متاحًا كخطة بديلة بدون فتح واتساب.

### إرسال واتساب تلقائيًا

الإرسال الصامت من الصفحة يحتاج WhatsApp Cloud API عبر Vercel Serverless Function. أضف هذه المتغيرات في Vercel:

```bash
WHATSAPP_ACCESS_TOKEN=your_meta_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_GRAPH_API_VERSION=v20.0
```

اختياريًا، لو عندك قالب واتساب معتمد لحالات الطلب:

```bash
WHATSAPP_STATUS_TEMPLATE_NAME=order_status_update
WHATSAPP_STATUS_TEMPLATE_LANGUAGE=ar
```

لو متغيرات واتساب غير موجودة، سيستمر تحديث حالة الطلب داخل الأدمن بدون فتح واتساب، مع توضيح أن الإرسال التلقائي غير مفعّل.

## أوامر الفحص

```bash
npm run lint
npm run build
```

كلاهما يجب أن يمر قبل النشر.

## ملفات مهمة

- `supabase/schema.sql`: الجداول، RLS، Storage policies.
- `src/lib/supabase.ts`: Supabase client و env validation.
- `src/services/*Service.ts`: طبقة القراءة والكتابة.
- `src/pages/admin/*`: صفحات لوحة التحكم الحقيقية.
- `docs/ADMIN_FIRST_RUN.md`: Checklist أول تشغيل للأدمن.
