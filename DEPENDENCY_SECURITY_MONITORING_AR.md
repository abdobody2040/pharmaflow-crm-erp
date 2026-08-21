# خطة متابعة أمن التبعيات — PharmaFlow CRM/ERP

## الهدف والنطاق

تتابع هذه الخطة التنبيه المتبقي من `pnpm audit --prod`: الحزمة `uuid@8.3.2` الموروثة عبر `exceljs@4.4.0`. لا يُعالج مسار PharmaFlow الحالي ملفات XLSX واردة من المستخدم؛ فهو يستخدم ExcelJS لكتابة ملفات BI والرواتب فقط. هذه ضوابط تقليل أثر وليست بديلاً عن ترقية متوافقة عند توفرها.

## الإيقاع التشغيلي

| متى                   | الأمر أو الإجراء                                     | معيار القرار                                                                                       |
| --------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| أسبوعياً              | `pnpm audit --prod --audit-level=moderate`           | افتح تذكرة إذا ظهر high/critical أو تغير مسار التبعية.                                             |
| قبل كل release        | `pnpm update --interactive` ثم راجع `pnpm why uuid`  | لا تقبل upgrade تلقائياً للحزم الكبرى بدون `pnpm check && pnpm test && pnpm exec playwright test`. |
| شهرياً                | راجع صفحة releases لـ ExcelJS وقاعدة GitHub Advisory | تحقق من إصدار ExcelJS يستخدم `uuid >= 11.1.1` أو يزيل التبعية.                                     |
| عند وصول إصلاح متوافق | حدّث ExcelJS وlockfile فقط                           | شغّل اختبار تصدير BI والرواتب، ثم كامل suite قبل النشر.                                            |

## أوامر المتابعة

```bash
pnpm audit --prod --audit-level=moderate
pnpm why uuid
pnpm view exceljs version
pnpm view exceljs dependencies --json
```

إذا ظهر إصدار مناسب، يكون تسلسل المعالجة:

```bash
pnpm update exceljs@latest
pnpm check
pnpm exec vitest run server/bi.export.test.ts server/hr.workflow.test.ts
pnpm test
pnpm exec playwright test
pnpm audit --prod --audit-level=high
```

## ضوابط القرار

لا يُضاف `pnpm override` قسري لـ `uuid` إلى إصدار رئيسي مختلف ما لم يثبت اختبار كامل أن ExcelJS متوافق معه. لا تُعاد مكتبة SheetJS `xlsx` إلى المشروع، لأنها كانت مصدر تنبيهات عالية غير مصححة. إذا أصبح النظام يدعم استيراد XLSX من العميل قبل معالجة التبعية، فيجب تعليق تلك الميزة أو عزلها في خدمة فحص ملفات مخصصة حتى يتم إغلاق التنبيه.

## المالك والتوثيق

يسجل مسؤول الإصدار تاريخ التشغيل، نتيجة التدقيق، وإصدار ExcelJS وuuid في سجل release. عند تغير النتيجة، يُحدّث `QA_SECURITY_ASSESSMENT_AR.md` و`FULL_SYSTEM_REVIEW_AR.md` بالأدلة الفعلية فقط.

## مراجع

[1] [GitHub Advisory: uuid buffer bounds check](https://github.com/advisories/GHSA-w5hq-g745-h8pq)

[2] [ExcelJS releases](https://github.com/exceljs/exceljs/releases)

[3] [pnpm audit documentation](https://pnpm.io/cli/audit)
