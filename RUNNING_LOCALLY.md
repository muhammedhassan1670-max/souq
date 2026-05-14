# تشغيل المشروع محليًا

## المتطلبات الأساسية

- Node.js مثبت (يفضل الإصدار 18 أو أحدث)
- npm مثبت عبر Node.js

## خطوات التشغيل

1. افتح الطرفية داخل مجلد المشروع:

```bash
cd c:\Users\DELL\Downloads\Souq_ElBalad_Admin_Upgraded\app
```

2. ثبت الحزم:

```bash
npm install
```

3. ابدأ خادم التطوير:

```bash
npm run dev
```

4. افتح المتصفح وادخل العنوان الذي يظهر في الطرفية، عادةً:

```text
http://localhost:5173
```

## بناء المشروع للإنتاج

```bash
npm run build
```

## معاينة النسخة المبنية

بعد الانتهاء من البناء، يمكنك تشغيل المعاينة:

```bash
npm run preview
```

## ملاحظة عن Supabase (اختياري)

إذا كنت تستخدم `supabase` أو لديك إعدادات بيئة، فانسخ الملف التالي:

```bash
cp .env.example .env
```

ثم عدّل المتغيرات داخل `.env` حسب بيانات مشروع Supabase الخاص بك.

## ملاحظات إضافية

- يتم تشغيل المشروع باستخدام Vite وReact وTypeScript.
- إذا ظهرت أي مشكلة في الحزم، تأكد من حذف `node_modules` وإعادة تثبيتها:

```bash
rm -rf node_modules package-lock.json
npm install
```
