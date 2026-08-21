# تقرير QA والفحص الأمني المحلي — PharmaFlow CRM/ERP

**تاريخ التقييم:** 21 أغسطس 2026  
**النطاق:** فحص محلي قابل لإعادة التشغيل للكود والتبعيات والـ API وخادم الإنتاج المؤقت ومسارات الواجهة بعقود tRPC مقلدة. لا يمثل التقرير اختبار اختراق خارجي أو DAST على staging.

## الملخص

أثبتت جولة QA المحلية أن مسارات الأعمال والعقود والواجهات التشغيلية تستمر في العمل بعد ترقيات التبعيات ومعالجات الأمان. أضيف اختبار Playwright يزور كل المسارات التشغيلية المسجلة بمستخدم إداري وعقود محلية مقلدة، مع رصد أخطاء الصفحة غير المعالجة، كما يهيئ fixture مصادق tenant ومستخدم admin مؤقتين وينظفهما ضمن نفس تشغيل الاختبار. حُسّنت أيضاً سلسلة التبعيات وأزيلت كل الثغرات العالية التي كان يعيدها تدقيق تبعيات الإنتاج.

| مجال                         |   النتيجة المحلية   | دليل قابل لإعادة التشغيل                                                                      |
| ---------------------------- | :-----------------: | --------------------------------------------------------------------------------------------- |
| TypeScript والبناء           |         ✅          | `pnpm check` و`pnpm build`                                                                    |
| اختبارات منطق الأعمال والعزل |         ✅          | `pnpm test`؛ تغطي العقود وRBAC والتدفقات والـ compliance                                      |
| E2E محلي                     | ✅ بخادم مؤقت وmock | `pnpm exec playwright test`؛ يشمل دخولاً مصادقاً مؤقتاً وRTL وGPS mock وكل المسارات التشغيلية |
| SAST                         |   ✅ بلا findings   | `semgrep scan --config p/owasp-top-ten ...`، 0 findings على الملفات المتتبعة                  |
| تدقيق تبعيات الإنتاج         | ✅ لا high/critical | `pnpm audit --prod --audit-level=high`؛ يبقى تنبيه moderate واحد موثق أدناه                   |
| فحص HTTP الإنتاجي            |      ✅ محلياً      | تشغيل بنية مؤقتة على منفذ منفصل والتحقق من CSP وHSTS والرؤوس                                  |

## تغطية QA وE2E

تغطي اختبارات Vitest إجراءات الوحدات ومداخلها وحالات الرفض والعزل بين العملاء، بما فيها CRM وGPS/attendance والتوجيه وHR والتسويق والـ AI والـ BI والامتثال والمخزون والمستندات والتكاملات. يثبت `local-workflows.e2e.test.ts` سلاسل procurement → approval → purchase order، وcoaching acknowledgement، وdocument version → activation مع أحداث تدقيق.

يمر اختبار `e2e/all-routes.smoke.spec.ts` عبر جميع المسارات التشغيلية المسجلة، ومنها CRM وتفاصيل الحساب وعمليات الزيارات والمندوب والـ AI وHR والتتبع والتوجيه والتسويق والمخزون والمستندات والتكاملات والامتثال وBI. يُحاكي العقد `auth.me` كمستخدم admin ويعيد استجابات آمنة للقراءات، ثم يفشل عند أي `pageerror` أو واجهة error boundary غير معالجة. لا يعد هذا بديلاً عن كتابة بيانات واقعية أو إدخال ملفات من العميل.

| فئة التحقق                  | مثال الدليل                                                                      |         الحالة          |
| --------------------------- | -------------------------------------------------------------------------------- | :---------------------: |
| الصلاحيات وtenant isolation | `security.contract.test.ts`، اختبارات CRM/HR/inventory/documents/integrations    |           ✅            |
| تدفقات منظمة                | e-signature موجب، sample custody، وثائق versioning، ledger append-only           |        ✅ محلياً        |
| تصدير BI والرواتب           | اختبار PDF/XLSX وCSV بعد استبدال SheetJS                                         |           ✅            |
| واجهة المستخدم              | login، RTL، GPS mock، وكل المسارات التشغيلية بعقد mock                           |        ✅ محلياً        |
| Browser مصادق محلياً        | fixture ينشئ tenant ومستخدم admin مؤقتين ويزيلهما عبر خادم اختبار بسر JWT عشوائي |           ✅            |
| Android/iOS                 | لا توجد أجهزة أو runners فعلية في البيئة                                         | ⚠️ staging/device مطلوب |

## فحص الأمان والمعالجات

### التبعيات

بدأ تدقيق الإنتاج بـ 83 تنبيهاً، منها 24 عالية أو حرجة. تمت ترقية `axios` و`nanoid` وAWS SDK وtRPC وDrizzle وExpress وStreamdown وRecharts. أزيلت مكتبة `xlsx` غير المصححة واستُبدلت بـ `exceljs` للكتابة فقط في تصدير BI والرواتب؛ لا يقرأ النظام ملف Excel من المستخدم ضمن هذا المسار. بعد المعالجة لا يعيد `pnpm audit --prod --audit-level=high` أي تنبيه high أو critical.

يبقى تنبيه **moderate** واحد في `uuid@8.3.2` كتبعـية داخل `exceljs@4.4.0`؛ الإصدار المصحح الذي يعرضه التدقيق ليس ترقية متوافقة مؤكدة مع النسخة الحالية من ExcelJS. لا يُستخدم هذا المسار لمعالجة XLSX وارد من المستخدم. تُلزم [`DEPENDENCY_SECURITY_MONITORING_AR.md`](./DEPENDENCY_SECURITY_MONITORING_AR.md) تدقيقاً أسبوعياً وقبل كل release وترقية ExcelJS فقط بعد اجتياز suite التراجع.

### SAST والفحص الديناميكي المحلي

فحص Semgrep بقواعد OWASP أعاد صفر findings بعد معالجة نتيجة تشغيل Docker كمستخدم root وتمرير `$host` المتحكم به من العميل داخل Nginx. شغّل المسح على 306 ملفات متتبعة. أبلغت الأداة عن حدود تحليل غير حاسمة في عدد قليل من ملفات TSX وعن timeout لتحليل taint في ملفين كبيرين؛ لا تُفسر هذه التحذيرات على أنها pass بديل لفحص أمني خارجي.

| النتيجة أو المعالجة            | الدليل                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| عدم تسريب stack trace عبر tRPC | `withoutServerStack()` واختبار `trpc.error-privacy.test.ts`؛ probe محلي لمسار CRM غير مصادق لا يعيد مسار الخادم                   |
| رفض API غير المصادق            | `crm.accounts.list` يعيد 401 و`UNAUTHORIZED` محلياً                                                                               |
| رؤوس حماية الإنتاج             | CSP بلا `unsafe-eval`، HSTS، `nosniff`، `DENY`، referrer وpermissions policies؛ تحقق تشغيل مؤقت بوضع production                   |
| حراسة webhook                  | redirects محظورة، وفحص HTTPS/credentials وDNS قبل التسجيل والإرسال، وحظر RFC1918 وCGNAT وlink-local وmulticast وIPv6 الخاص/المحلي |
| Docker/Nginx                   | `USER node` في Dockerfile و`$proxy_host` في proxy headers بدلاً من `$host`                                                        |
| rate limit                     | unit regression يثبت 429 فوق الحد؛ Nginx يملك zone لواجهة API                                                                     |

## أوامر إعادة التحقق

```bash
pnpm check
pnpm build
pnpm test
pnpm exec playwright test
pnpm audit --prod --audit-level=high
semgrep scan --config p/owasp-top-ten \
  --exclude node_modules --exclude dist --exclude playwright-report \
  --exclude test-results .
```

## حدود صريحة قبل اعتماد الإنتاج

يتطلب الإغلاق التشغيلي الحقيقي بيئة staging مع MySQL وبيانات disposable: DAST مصادق، rate limiting عبر عدة مثيلات، اختبار reverse proxy وTLS حقيقي، benchmark وEXPLAIN، وNTP/backup-restore. كما يلزم تنفيذ Android وiOS على أجهزة فعلية لمحاكاة أذونات GPS والعمل بالخلفية والمزامنة offline→online. توجد الأوامر والتسلسل وقواعد القبول في [`STAGING_ACTIVATION_CHECKLIST_AR.md`](./STAGING_ACTIVATION_CHECKLIST_AR.md). لا يدّعي هذا التقرير تنفيذ أي من هذه البنود.

## مراجع

[1] [OWASP Top 10](https://owasp.org/www-project-top-ten/)

[2] [Semgrep OSS Documentation](https://semgrep.dev/docs/)

[3] [GitHub Advisory Database](https://github.com/advisories)
