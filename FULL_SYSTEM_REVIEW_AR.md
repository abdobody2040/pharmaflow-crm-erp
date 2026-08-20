# تقرير المراجعة الشاملة لنظام PharmaFlow — الإصدار المحلي النهائي

**تاريخ التحديث:** 20 أغسطس 2026  
**نطاق الإثبات:** مراجعة كود وschema وواجهات وtRPC وإجراءات Vitest وPlaywright المحلية؛ لا توجد بيانات أو قياسات أو نتائج أمنية من بيئة staging مدفوعة.
**النتيجة المحلية:** `pnpm check` ناجح، و**44 ملف Vitest / 106 اختبارات** ناجحة. كما نجحت **4 اختبارات Playwright محلية** (شاشة الدخول والـ RTL وmock GPS ومسارات الوحدات عبر عقود tRPC مقلدة)، واختبار browser مصادق عليه واحد يبقى متخطياً عمداً إلى أن تتوفر بيانات دخول disposable محلية.

> **قاعدة الحالة:** تعني ✅ دليلاً محلياً قابلاً لإعادة التشغيل، وليست ادعاء benchmark أو اعتماداً تنظيمياً. وتعني ⚠️ أن الدليل المطلوب يحتاج بيئة staging أو أجهزة فعلية. عناصر خارطة الطريق غير المتفق عليها في الـ MVP ليست عيوباً مخفية ولا تُصنف كدليل منجز.

## 1. الملخص التنفيذي

أُغلقت جميع بنود المعالجة القابلة للإثبات محلياً في جولات المراجعة. يشمل ذلك إصلاح حضور GPS، Customer 360 والعلاقات، coaching وride-along، مخزوناً عاماً بدفتر append-only، سجل مستندات ذي إصدارات واحتفاظ، مسار توقيع إلكتروني موجب hash-linked، بوابة تكامل ذاتية الاستضافة، ترجمة عربية/إنجليزية تشغيلية مع RTL وتنسيق locale، ومراجعة أداء ثابتة تشمل كامل طبقة routers.

توجد الآن حدود نتائج صريحة للقوائم القابلة للنمو في CRM والمندوب وHR والتسويق والمخزون والمستندات والتكاملات، إضافة إلى migration غير مدمرة لفهارس CRM وHR المطابقة لمسارات الفرز. لا توجد N+1 في Customer 360؛ فهو يستخدم استعلامات ثابتة متوازية ثم ربطاً داخل الذاكرة. المراجعة التفصيلية محفوظة في [`STATIC_PERFORMANCE_REVIEW_AR.md`](./STATIC_PERFORMANCE_REVIEW_AR.md).

| المجال                  |   الحالة المحلية   | الدليل                                                                                               | حد الإثبات الحقيقي المتبقي                             |
| ----------------------- | :----------------: | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| الوظائف وواجهات API     |         ✅         | إجراءات tenant-scoped وZod وDrizzle، مع اختبارات RBAC والعزل والتدفقات الجديدة.                      | تكاملات العميل الفعلية بعد التعاقد.                    |
| تجربة المستخدم والترجمة |     ✅ محلياً      | قاموس عربي موسع، `dir=rtl`، helpers للرقم/التاريخ، وPlaywright لمسارات الوحدات الرئيسية بعقود مقلدة. | قبول المستخدمين للترجمة المتخصصة على بياناتهم الفعلية. |
| العزل متعدد العملاء     |         ✅         | `resolveTenantScope()`، tenant predicates، واختبارات عزل ورفض صلاحيات.                               | fuzz/property testing أوسع اختياري.                    |
| الأداء البنيوي          |   ✅ مراجعة كود    | فهارس مركبة ونوافذ قوائم وفحص N+1 موثق.                                                              | latency و`EXPLAIN` وthroughput على dataset تمثيلي.     |
| الامتثال Part 11-style  | ✅ كود/اختبار محلي | سجلات append-only وaudit وتوقيع موجب credential/hash/timestamp.                                      | OQ/IQ/PQ موقّع وNTP/restore runtime.                   |
| الأمن التشغيلي          | ✅ كود/اختبار محلي | RBAC وinput bounds وheaders/rate limits وحراسة webhook.                                              | DAST/pentest وdistributed limiter proof.               |

## 2. البنود المعالجة والأدلة القابلة للتشغيل

| البند                       |    الحالة     | الدليل التقني المتحقق                                                                                                                                     |
| --------------------------- | :-----------: | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| الحضور التلقائي من GPS      |      ✅       | إصلاح mock لـ `.orderBy()`؛ `rep.procedure.test.ts` يثبت `autoMarkAttendance` من مسار location ping.                                                      |
| Customer 360 وaffiliations  |      ✅       | `accountAffiliations` وإجراءات list/create/end و`crm.account360` واختبار تجميع وإدخال.                                                                    |
| Ride-along وscorecards      |      ✅       | schedule/complete/create/acknowledge مع منع المندوب من إجراءات المدير وتدفق acknowledgement محلي.                                                         |
| Warehouse العام             |      ✅       | sites وledger append-only وbalances وreorder levels وواجهة واختبار role gate.                                                                             |
| Document Management         |      ✅       | document number/version/previous version/file key/retention/status، ودورة register → version → activate مثبتة باختبار محلي.                               |
| التوقيع الإلكتروني الإيجابي |      ✅       | `compliance.esignature.test.ts` يثبت credential صحيحاً و`recordBindingHash` و`signedAt` وinsert وaudit.                                                   |
| التعريب والـ RTL            |   ✅ محلياً   | `locale.ts` وتحديث القاموس؛ Playwright يثبت RTL وشاشة الدخول العربية، ويغطي 12 مساراً رئيسياً عبر tRPC mock لاكتشاف النصوص التشغيلية الإنجليزية المعروفة. |
| مراجعة الأداء               | ✅ مراجعة كود | migration `0022_grey_alex_power.sql` لثمانية فهارس، وحدود قراءات القوائم، وسجل مراجعة ثابتة شامل.                                                         |
| Integration gateway         |    ✅ MVP     | API keys v1 hash-only، webhooks HTTPS مقيدة، HMAC، وسجل dispatch append-only واختبار denial.                                                              |
| E2E المحلي المتبقي          |      ✅       | `local-workflows.e2e.test.ts` يثبت PR → approval → PO، وcoaching acknowledgement، وdocument version → activation مع audit events.                         |
| الـ runbooks والتنظيف       |      ✅       | تحديث `OPERATIONAL_VALIDATION_RUNBOOKS.md`، حذف تقارير Playwright المؤقتة، وتطبيق Prettier على الملفات المتغيرة.                                          |

## 3. مراجعة الوحدات

| الوحدة                  |  الحالة  | الدليل المحلي                                                                                           |
| ----------------------- | :------: | ------------------------------------------------------------------------------------------------------- |
| CRM وHCPs وCustomer 360 |    ✅    | حسابات وجهات اتصال ومناطق وفرص وعلاقات، ونوافذ قوائم وفهارس وتدفقات عزل.                                |
| Rep وGPS والتوجيه       | ✅ كوداً | consent/shift/location/visit/sample workflows وmock GPS؛ مسار اليوم والبحث وسجل العينات محدودة النتائج. |
| ERP/HR                  |    ✅    | الموظفون والحضور والإجازات والمصروفات والرواتب واختبارات lifecycle.                                     |
| Warehouse وProcurement  |  ✅ MVP  | دفتر مستقل append-only، reorder، PR → PO محلي مثبت.                                                     |
| Documents               |  ✅ MVP  | إصدارات غير محذوفة، retention metadata، ودورة activation مدققة.                                         |
| Marketing وCLM          |  ✅ MVP  | segments ومحتوى معتمد وحملات؛ القوائم والمعاينة محدودة النتائج.                                         |
| AI وAnalytics وBI       | ✅ كوداً | routing وNBA والتحليلات الدلالية وتنبيهات anomaly وexports، مع حدود provider keys الخاصة بالعميل.       |
| Compliance              | ✅ كوداً | append-only evidence وتوقيع credential-confirmed وسجل تدقيق وتقارير وصول.                               |
| Integrations            |  ✅ MVP  | مفاتيح versioned وwebhooks وسجل تسليم مدقق.                                                             |

## 4. قائمة متطلبات staging فقط قبل الادعاء التشغيلي

هذه هي البنود التي **لا يمكن إغلاقها بأمان أو صدق داخل البيئة المحلية الحالية**، وهي الإشارات الفعلية إلى وقت تجهيز staging والإنفاق عليه.

| أولوية | العمل على staging               | دليل القبول المطلوب                                                                              |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| P0     | MySQL benchmark ببيانات تمثيلية | p50/p95 و`EXPLAIN` لاستمارات GPS والخريطة وCustomer 360 وBI والتصدير وسجل المخزون.               |
| P0     | NTP وbackup/restore             | مخرجات chrony/timedatectl، dump مشفر، checksum، restore مستقل، وعدّ/عينات سجلات.                 |
| P0     | DAST/Pentest API                | تقرير authenticated على tenant disposable، findings مصنفة وإعادة اختبار المعالجة.                |
| P0     | distributed rate limiting       | مثيلان أو أكثر مع shared store وإثبات aggregate `429`.                                           |
| P0     | Browser E2E مصادق عليه          | مصفوفة أدوار على حسابات disposable؛ الاختبار مكتوب لكنه لا يعمل بلا `E2E_EMAIL` و`E2E_PASSWORD`. |
| P0     | Android/iOS حقيقيان             | permission/background GPS/offline-resync وإثبات platform-specific.                               |

تشمل خطوات التنفيذ وحدود السلامة في [`OPERATIONAL_VALIDATION_RUNBOOKS.md`](./OPERATIONAL_VALIDATION_RUNBOOKS.md)، وتشمل خطوات النشر والتشغيل اليومي في [`SETUP_AND_USAGE_AR.md`](./SETUP_AND_USAGE_AR.md).

## 5. عناصر خارطة طريق المنتج غير الحاجبة

هذه ليست فجوات إثبات staging ولا يزعم هذا التقرير أنها مكتملة: FEFO/cycle count/reconciliation للمخزون، legal hold وvirus scanning للمستندات، OAuth وretry/dead-letter وrotation للتكاملات، وواجهات provider/consent متخصصة للتسويق. تبقى قرارات نطاق منتج لاحقة بعد تشغيل الـ MVP، ولا تمنع إثبات النسخة الحالية ضمن حدودها الموثقة.

## 6. المراجع

[1] [Veeva Vault CRM Help — Call Reporting Overview](https://vaultcrmhelp.veeva.com/doc/Content/CRM_topics/Call_Reporting_2/CallReportingOverview.htm)

[2] [Veeva — Vault CRM Features Brief](https://www.veeva.com/resources/veeva-vault-crm-features-brief/)

[3] [Salesforce — Agentforce Sales / Sales Cloud](https://www.salesforce.com/sales/cloud/)
