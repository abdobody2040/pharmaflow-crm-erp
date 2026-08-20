# تقرير المراجعة الشاملة لنظام PharmaFlow — تحديث المعالجة المحلية

**تاريخ التحديث:** 20 أغسطس 2026  
**النطاق:** مراجعة الأدلة المتاحة محلياً بعد معالجة الفجوات القابلة للتحقق دون بيئة staging أو أجهزة iOS/Android فعلية.  
**منهجية الإثبات:** مراجعة schema وtRPC routers والواجهات واختبارات Vitest، ثم تنفيذ `pnpm check && pnpm test`. النتيجة الحالية هي **43 ملف اختبار و103 اختبارات ناجحة**. لا تمثل هذه النتيجة benchmark أداء أو DAST أو قبولاً تشغيلياً كاملاً على أجهزة مادية.

> **معاني الحالة:** ✅ مبني ومغطى بدليل كود أو اختبار محلي محدد. ⚠️ مبني جزئياً أو يحتاج دليلاً تشغيلياً خارج البيئة الحالية. ❌ غير مبني ضمن النطاق الحالي. ولا تتحول أي حالة إلى ✅ لمجرد وجود واجهة بلا منطق خلفي واختبار.

## 1. الملخص التنفيذي

تمت معالجة البنود ذات الأولوية التي يمكن إثباتها محلياً. يشمل ذلك إصلاح اختبار الحضور التلقائي من مسار GPS، إكمال Customer 360 والعلاقات بين الحسابات، workflow المرافقة الميدانية وبطاقات تقييم المدير، مخزون المستودعات العام، سجل المستندات ذي الإصدارات، وإثبات التوقيع الإلكتروني الإيجابي. كما أضيفت طبقة تكامل ذاتية الاستضافة تضم مفاتيح API بإصدار `v1` وتخزين hash فقط، وwebhooks مضبوطة عبر HTTPS وسجل تسليم append-only.

ما زالت حدود الإثبات واضحة. لا توجد أرقام latency أو نتائج حمل على بيانات staging كبيرة، ولا دليل قبول iOS/Android فعلي أو DAST مستقل أو backup/restore ممارس على قاعدة تشغيلية. تبقى هذه البنود **مؤجلة** ولا ينبغي تفسير اختبارات العقد والإجراءات على أنها بديل عنها.

| المجال | الحالة | الدليل المتاح | الحد المتبقي |
|---|:---:|---|---|
| منطق الأعمال والـ APIs | ✅ | tRPC وZod وDrizzle واختبارات إجراءات/عزل ورخص لجميع الإضافات الجديدة. | اختبار تكاملي مع أنظمة عميل فعلية عند التعاقد. |
| تجربة المستخدم | ⚠️ | صفحات Customer 360 والمخزون والمستندات والتكاملات متصلة بإجراءات tRPC. | لا يوجد تشغيل قبول browser كامل لكل دور في هذه الجولة. |
| العزل متعدد العملاء | ✅ | `resolveTenantScope()` وشروط `tenantId` في الإجراءات الجديدة، مع اختبارات منع الأدوار غير المصرح لها. | property/fuzz testing أوسع للمعرّفات العشوائية. |
| Compliance Part 11-style | ⚠️ | append-only records، audit، توقيع موجب hash-linked وتوقيت خادم. | IQ/OQ/PQ موقّع، NTP runtime، وDR evidence. |
| الأمن | ⚠️ | RBAC، حدود الإدخال، headers/rate limiting، webhook HTTPS guard وسجل تدقيق. | DAST/pentest وrate limiter موزع قبل multi-node. |
| الأداء والسعة | ⚠️ مؤجل | مراجعة query paths وفهرس مركب لقائمة procurement الخاصة بالمندوب. | benchmark/EXPLAIN/load test على MySQL staging. |

## 2. نتيجة البنود المعالجة في هذه الجولة

| البند | الحالة | الدليل التقني المتحقق | ما لا يدعيه النظام |
|---|:---:|---|---|
| الحضور التلقائي من GPS | ✅ | تم إصلاح mock الذي كان يفتقد `.orderBy()`؛ `rep.procedure.test.ts` يثبت استدعاء `autoMarkAttendance` من مسار location-ping. | لا يثبت دقة geofence على جهاز فعلي أو تحت حمل كثيف. |
| Customer 360 وaffiliations | ✅ | `accountAffiliations`، إجراءات list/create/end، وتجميع `crm.account360`، مع اختبار aggregation والتحقق من الإدخال. | لا يوجد account-plan متقدم أو import/reconciliation جماعي. |
| Ride-along وmanager scorecards | ✅ | `rideAlongSessions` و`coachingScorecards`، schedule/complete/create/acknowledge، واختبار يمنع المندوب من تحكم المدير. | لا يوجد قياس longitudinal للتحسن أو marketplace للتدريب. |
| Warehouse عام | ✅ | sites، ledger مستقل append-only، balances، reorder levels، واجهة، واختبار منع المندوب من الكتابات. | لا يوجد FEFO/FIFO أو reconciliation مادي أو تنبيه انتهاء صلاحية. |
| Document Management System | ✅ | `documentRecords` مع document number/version/previous version/file key/retention/status، واجهة register/version/activate/archive، واختبار RBAC. | رفع bytes وvirus scanning وlegal hold ليست ضمن MVP الحالي. |
| التوقيع الإلكتروني الإيجابي | ✅ | `compliance.esignature.test.ts` ينفذ مسار credential صحيح ويثبت `recordBindingHash` و`signedAt` وinsert وaudit event. | ليس OQ على MySQL إنتاجي ولا اختبار replay/lockout خارجي. |
| Arabic/English وRTL | ⚠️ | قاموس مشترك موسّع للمخزون والمستندات وride-along/scorecards ورسائل أخطاء هذه الإجراءات مع switcher و`dir=rtl`. | لا يدعي تغطية ترجمة بشرية كاملة لكل copy تاريخي أو تنسيق locale للأرقام والتواريخ. |
| مراجعة الأداء محلياً | ✅ ضمن النطاق | لا توجد N+1 في قوائم forecasts/procurement/events لأنها استعلامات tenant-scoped مفردة؛ كان forecast/events يملكان indexes ملائمة، وأضيف `tenantId, createdBy, createdAt` لمسار procurement الخاص بالمندوب. | لا توجد نتيجة latency أو claim سعة. |
| Integration gateway MVP | ✅ | `integrationApiKeys` hash-only/versioned، `webhookEndpoints`، `webhookDeliveryLogs` append-only، HTTPS/embedded-credentials/local-host guard، توقيع HMAC وسجل dispatch. | لا يوجد OAuth authorization server أو retries/scheduling أو integration marketplace. |

## 3. قائمة تحقق وحدات الأعمال

| الوحدة | التقييم | الدليل المحدث | الخطوة التالية الواقعية |
|---|:---:|---|---|
| Accounts/HCPs وContacts | ✅ | CRM procedures وواجهات الحسابات/جهات الاتصال وCustomer 360. | import جماعي وحل تكرار. |
| ملف العميل 360° وaffiliations | ✅ | العلاقات الفعالة والمؤرخة وتفاصيل مصادر الحساب موحدة في `crm.account360`. | account-plan goals وstakeholder visualization. |
| Cycle plans والزيارات | ✅ | cycle/planned visits/visit evidence مرتبطة بمسار المندوب. | browser E2E من الخطة إلى dashboard. |
| Electronic signature | ✅ محلياً | credential + explicit action + meaning + server timestamp + hash + audit مثبتة باختبار موجب. | OQ على قاعدة MySQL تشغيلية وnegative replay. |
| Sample custody | ⚠️ | lot/expiry/handoff/custody report موجودة. | سيناريو browser كامل وFEFO/reconciliation. |
| Warehouse/inventory العام | ✅ | مخزون مستقل عن chain-of-custody للعينات مع ledger تعويضي فقط. | cycle counts وانتهاء الصلاحية. |
| Procurement | ✅ MVP | PR → review → PO في العمليات؛ وفهرس قائمة المندوب. | goods receipt/invoice match وربط المستودع. |
| Documents/SOPs | ✅ MVP | سجل versioning/retention منفصل عن CLM ولا يحذف النسخ القديمة. | uploads، retention policy engine، legal hold. |
| ERP/HR | ✅ | employee/attendance/GPS/leave/expense/payroll متاحة واختباراتها ناجحة. | malware scan وcalendar/org chart. |
| Fleet maintenance/fuel | ✅ MVP | vehicles/maintenance/fuel داخل Operations Expansion. | overdue notifications وtelematics. |
| Events/Webinars | ✅ MVP | event/attendee model وإجراءات محمية. | lifecycle/spend/consent UI. |
| Marketing وCLM | ⚠️ | campaign/segment/approved-content موجودة؛ live delivery يحتاج مفاتيح عميل. | sandbox provider/webhook/bounce/consent tests. |
| AI وanalytics | ✅/⚠️ | routing، call assistant، NBA، semantic analytics وdaily anomaly موجودة. | لا claim لتشغيل provider فعلي بلا مفتاح عميل أو scheduler staging. |
| BI وexports | ✅ | role-based dashboards وPDF/XLSX contracts. | scale/retention/date filters/saved views. |
| تكاملات خارجية | ✅ MVP | مفاتيح v1 وwebhooks مدققة ذاتية الاستضافة. | OAuth، retries، marketplace، customer-specific contracts. |

## 4. الأمن والعزل والامتثال

### 4.1 العزل وRBAC

كل جدول جديد في هذه الجولة يحمل `tenantId` وكل read/write في routers الجديدة يبني شرط النطاق الفعال. إجراءات المخزون والمستندات والتكاملات لا تسمح بالكتابة إلا للأدوار المحددة، وتغطي الاختبارات رفض representative في inventory/documents/integrations. مفاتيح API لا تخزن خاماً؛ يحتفظ النظام بـ `keyHash` وprefix فقط، ويعاد السر مرة واحدة وقت الإصدار.

| بند | الحالة | الدليل |
|---|:---:|---|
| Tenant scope للميزات الجديدة | ✅ | شروط `eq(table.tenantId, scope.tenantId)` قبل list/read/update/insert وhelpers للتحقق من ملكية السجل. |
| RBAC للميزات الجديدة | ✅ | `tenantRoleProcedure` ومسارات denial في اختبارات inventory/documents/integrations/coaching. |
| سجل مخزون غير قابل للتحرير | ✅ | router لا يعرّض update/delete للـ ledger؛ التصحيح بحركة تعويضية. |
| سجل تسليم webhook غير قابل للتحرير | ✅ | insert-only `webhookDeliveryLogs` مع hash للpayload وملخص response محدود. |
| منع SSRF الأساسي للـ webhook | ✅ | HTTPS فقط، منع credentials المضمّنة وlocalhost/private literal IPs. |
| اختبار أمني مستقل | ⚠️ مؤجل | لا يوجد DAST أو pentest أو DNS-rebinding validation خارجي. |

### 4.2 الامتثال

اختبار التوقيع الإيجابي الحالي يؤكد أن تحقق credential الناجح يسبق insert، وأن hash الربط للسجل وتوقيت الخادم يوضعان مع توقيت verify/action، وأن audit event يكتب للـ tenant والموقّع نفسهما. هذا دليل محلي أقوى من اختبار رفض action فقط، لكنه لا يغني عن حزمة OQ موقعة على بنية العميل.

| بند | الحالة | الحد المتبقي |
|---|:---:|---|
| Append-only visits/samples/signatures/audit | ✅ | negative database-trigger tests على MySQL production/staging. |
| Two-component e-signature | ✅ محلياً | wrong password/replay/cross-tenant OQ وevidence من runtime. |
| NTP server time | ⚠️ مؤجل | chrony/NTP health monitor، drift record، وتنفيذ موثق. |
| Backup/restore | ⚠️ مؤجل | restore drill موثق على قاعدة staging مخصصة. |
| retention/legal hold | ⚠️ | سجل retention للتوثيق موجود؛ policy engine وhold غير مبنيين. |

## 5. المسارات end-to-end

| المسار | الحالة | ما ثبت محلياً | ما يبقى |
|---|:---:|---|---|
| Login → session | ⚠️ | UX loading/error والاختبارات المحلية/Playwright الأساسية السابقة. | authenticated browser role matrix وlockout. |
| Shift → GPS → attendance | ⚠️ | GPS ingestion/attendance mock regression وgeofence procedure tests. | Android/iOS background/permission/network scenarios. |
| Plan → visit → BI | ⚠️ | procedures وBI contracts مترابطة. | سيناريو browser واحد كامل. |
| Positive e-signature | ✅ محلياً | credential/hash/timestamp/audit persistence path مثبت. | production-like MySQL OQ. |
| Warehouse movement → balance → reorder | ✅ محلياً | append-only procedure والواجهة والحساب in-memory واختبار role gate. | load/performance وcycle count. |
| Document register → version → activate | ✅ محلياً | إجراءات version/status وسجل retention وواجهة. | file-upload/virus scan/integration test. |
| API key → webhook dispatch | ✅ MVP | issue/hash/register/status/dispatch/log workflow في code والاختبار role denial. | endpoint حقيقي/retry/secret rotation/OAuth. |

## 6. الأداء والسعة — حدود صريحة

لم يتم إنشاء benchmark صناعي أو ادعاء رقم latency. المراجعة الثانية للكود حددت أن `forecasts.list` يستخدم index `tenantId, periodStart, periodEnd`، و`events.list` يستخدم `tenantId, startsAt`، وكلاهما يطابقان filter/order المستخدمين. أما `procurement.list` للمندوب فيجمع `tenantId` و`createdBy` ويرتب `createdAt`؛ لذلك أضيف index مركب مطابق. لا توجد N+1 في هذه القوائم لأنها لا تنفذ استعلاماً لكل صف.

| مجال الأداء | الحالة | شرط القبول المؤجل |
|---|:---:|---|
| GPS/geofence | ⚠️ مؤجل | MySQL staging مع p95 ingestion/alert وEXPLAIN على حجم ping واقعي. |
| الخرائط/الرحلات | ⚠️ مؤجل | pagination/clustering وقياس 10k+ ping لكل tenant. |
| BI/export | ⚠️ مؤجل | 12 شهراً من بيانات ممثلة وقياس زمن/ذاكرة PDF/XLSX. |
| Forecast/procurement/events | ✅ مراجعة كود | index review مكتمل؛ لا claim latency قبل benchmark. |
| Anomaly monitor | ⚠️ مؤجل | batching/metrics تحت حجم متعدد العملاء. |

## 7. خارطة الطريق بعد هذه المعالجة

| الأولوية | العمل | معيار الإغلاق |
|---|---|---|
| P0 تشغيلي | MySQL staging، benchmark، DAST/SCA، NTP وbackup/restore drills، browser role E2E. | نتائج موقعة وأرقام/سجلات حقيقية بلا تقديرات. |
| P1 regulated | retention/legal hold، virus scanning، e-signature negative/replay OQ، warehouse reconciliation وFEFO. | ضوابط تشغيلية واختبارات قبول قابلة للتكرار. |
| P2 integrations | OAuth، API-key rotation، DNS-rebinding protection، retries/dead-letter وإدارة subscriptions. | عقود customer integration واختبارات endpoint حقيقية. |
| P3 enterprise | shared limiter، MFA/SSO، observability وDR/failover. | security review خارجي واختبارات recovery. |

## 8. المراجع

[1] [Veeva Vault CRM Help — Call Reporting Overview](https://vaultcrmhelp.veeva.com/doc/Content/CRM_topics/Call_Reporting_2/CallReportingOverview.htm)

[2] [Veeva — Vault CRM Features Brief](https://www.veeva.com/resources/veeva-vault-crm-features-brief/)

[3] [Salesforce — Agentforce Sales / Sales Cloud](https://www.salesforce.com/sales/cloud/)
