# تقرير المراجعة الشاملة لنظام PharmaFlow

**تاريخ المراجعة:** 20 أغسطس 2026  
**نطاق المراجعة:** CRM، تطبيق المندوبين والمزامنة، ERP/HR، Fleet/GPS والمسارات، التسويق وCLM، طبقة الذكاء الاصطناعي، التحليلات وBI، الـ Compliance، المنصة متعددة العملاء، والتشغيل على VPS.  
**منهجية الإثبات:** مراجعة PRD والـ schema والـ routers والواجهات والوثائق واختبارات المشروع، ثم تنفيذ `pnpm check && pnpm test`. النتيجة: **36 ملف اختبار و94 اختباراً ناجحاً**. لا يساوي ذلك اختبار قبول كامل على أجهزة iOS/Android فعلية أو اختبار حمل على قاعدة بيانات كبيرة؛ تم توضيح هذه الحدود صراحةً بدلاً من افتراض نتائج غير مقاسة.

> **معاني الحالة:** ✅ مبني وله منطق خلفي واختبار أو دليل تشغيلي مناسب. ⚠️ مبني جزئياً أو تم التحقق منه على مستوى procedure/contract فقط ويحتاج إثباتاً أو توسعة. ❌ غير مبني ضمن الإصدار الحالي.

## 1. الملخص التنفيذي

المنصة تمتلك أساساً قوياً متعدد العملاء مع فصل tenant على مستوى الإجراءات والاستعلامات، وتغطي غالبية تدفقات المندوبين وإدارة العملاء والموارد البشرية وGPS والتسويق والـ BI والـ compliance. توجد أدلة آلية جيدة على RBAC، وعزل tenants، وسجلات الزيارات/العينات غير القابلة للحذف، والتقارير، والتحكم في HTTP. أهم الفجوات قبل إطلاق تجاري منظم هي **اختبارات E2E حقيقية للهاتف والمتصفح، قياس أداء على بيانات كبيرة، الميزات المتقدمة للمنافسين (forecasting، procurement، maintenance/fuel، events، coaching، multilingual)، وإثبات تشغيلي لإيجابية التوقيع الإلكتروني وNTP والنسخ الاحتياطي**.

| المجال | التقييم | القراءة التنفيذية |
|---|---:|---|
| منطق الأعمال والـ APIs | ✅ | إجراءات tRPC وZod وDrizzle واختبارات contract/procedure تغطي الوحدات الأساسية. |
| تجربة المستخدم المتكاملة | ⚠️ | الشاشات والمسارات موجودة، لكن لا توجد suite E2E كاملة تدير متصفحاً وهاتفاً ومحاكاة GPS. |
| العزل متعدد العملاء | ✅ | tenant scope واختبارات عزل محددة، مع منع tenant admin من سجل المنصة. |
| Compliance Part 11-style | ⚠️ | ضوابط التصميم قوية؛ ما زال يلزم IQ/OQ/PQ موقّع واختبار MySQL/NTP/استعادة إنتاجي. |
| الأمن | ⚠️ | RBAC والتحقق والمدخلات والـ rate limits موجودة؛ يلزم DAST/Pentest وrate-limit موزع قبل التوسع الأفقي. |
| الأداء والسعة | ❌ | لا توجد benchmark موثقة على حجم بيانات كبير؛ لا يجوز وصف السعة بأنها مثبتة. |

## تحديث Prompt 14 — المعالجة المتاحة بلا بنية تحتية إضافية

تمت إضافة نسخ MVP متعددة العملاء لـ **forecasting، procurement، المركبات/الصيانة/الوقود، الفعاليات، وcoaching** ضمن مساحة تشغيلية موحدة، مع migrations غير مدمرة، فهارس tenant-scoped، إجراءات tRPC محمية، وسجل تدقيق. أضيفت أيضاً قاعدة اختيار العربية/الإنجليزية مع `lang` و`dir=rtl` محفوظين في المتصفح؛ هذه **بنية localization** وليست بعد ترجمة كاملة لكل النصوص في الصفحات التاريخية.

كما أضيف Playwright محلي قابل للتشغيل. اجتاز اختباران فعليان: مسار الدخول غير الموثق ومحاكاة browser GPS المحددة. لا يمثل هذا اختبار هاتف حقيقياً أو تدفقاً مصادقاً كاملاً؛ تظل تلك الأدلة مؤجلة إلى حين توفير emulator/device وtenant اختباري. أما NTP وbackup/restore وDAST والـ distributed rate limit فقد تحولت إلى runbooks قابلة للتنفيذ وموسومة بوضوح بأنها **غير منفذة**.

| بند Prompt 14 | الحالة بعد المعالجة | دليل حالي | ما يبقى مؤجلاً |
|---|---:|---|---|
| Forecasting MVP | ✅ | `territoryForecasts`، moving-average/manual baseline، إجراءات وواجهة واختبار RBAC. | backtesting على sales history حقيقية. |
| Procurement MVP | ✅ | طلب → مراجعة → purchase order في schema/router مع audit. | UI لإصدار PO/استلام goods وربط warehouse ledger. |
| Fleet maintenance/fuel MVP | ✅ | vehicles، maintenance schedules، fuel logs، فهارس وإجراءات وواجهة. | تنبيهات overdue، receipts، وtelematics. |
| Events/Webinars MVP | ✅ | events وattendees model وإجراءات إنشاء/دعوة وواجهة إنشاء. | attendee lifecycle UI وspend/consent follow-up. |
| Coaching MVP | ✅ | manager notes، compliance flag، rep acknowledgement، audit. | coach scorecards/ride-along workflows. |
| Arabic/English | ⚠️ | switcher محفوظ + RTL foundation + ترجمة بعض shell labels. | ترجمة مكتملة لكل الشاشات والمحتوى ورسائل الأخطاء. |
| Web E2E/GPS mock | ⚠️ | Playwright: 2/2 passed على Chromium محلي. | authenticated end-to-end fixture وAndroid/iOS execution. |
| NTP/backup/DAST/distributed RL | ⚠️ مؤجل | runbooks آمنة وجاهزة. | تنفيذ موثق على staging فقط. |
| Large-data performance | ⚠️ مؤجل | مراجعة فهارس وفهارس tenant-scoped للموديلات الجديدة. | أرقام latency/EXPLAIN/load test بعد توفر MySQL staging. |

## 2. قائمة التحقق: CRM وتطبيق المندوبين

| الخاصية في PRD | الحالة | دليل المراجعة والتكامل | المعالجة المطلوبة |
|---|---:|---|---|
| Accounts/HCPs وContacts | ✅ | CRM routers وواجهات Accounts/Contacts واختبارات عقد وترخيص CRM. | إضافة استيراد جماعي وحلّ التكرار عند التوسع. |
| ملف عميل 360°، tiering، history | ⚠️ | tiering وسجل الزيارات والإشارات التجارية موجودة؛ لا يوجد نموذج affiliations كامل أو عرض موحد موثق لكل المصادر. | بناء Customer 360 موحد مع affiliations ومصادر البيانات وتاريخ موحد. |
| Cycle plans وتخطيط الزيارات | ✅ | Plans/Cycle Planner وplanned visits متصلة بمسار المندوب والمسارات. | إضافة قيود سعة وخطة تغطية زمنية قابلة للضبط. |
| Visit logging (أهداف/منتجات/عينات/خطوات) | ✅ | نموذج الزيارة ومسار immutable write وارتباط العينات والتوقيع. | تنفيذ اختبار متصفح/هاتف كامل من إنشاء إلى العرض في BI. |
| توقيع إلكتروني للزيارة/العينة | ⚠️ | معنى التوقيع، credential، explicit action، وتوقيت الخادم مُنفذة؛ الاختبار الحالي يثبت الرفض عند غياب action أكثر من إثبات عملية إيجابية كاملة بمخزن بيانات. | إضافة اختبار إجراء إيجابي/سلبي بكلمة مرور حقيقية وsubject tenant-scoped. |
| عينات ومخزون/lot/expiry/custody | ⚠️ | معاملات عينات وسلسلة custody وتقرير lot/expiry/hand-off موجودة. | إضافة warehouse balances، reconciliation دوري، وقواعد FIFO/FEFO والتنبيه قبل الانتهاء. |
| Territories وalignment | ✅ | Territory Manager، geofence، scope checks، واختبارات GPS. | إضافة simulation لنقل account بين territories مع تاريخ سريان. |
| Opportunity Kanban | ✅ | Opportunity pipeline موجود مع CRM UI وrouter. | إضافة forecast categories وprobability history. |
| Approved content/CLM | ✅ | مكتبة محتوى مع approval وpresentation evidence واستخدام في مساحة المندوب. | إضافة version rollback وexpiry/re-approval للمحتوى. |
| Consent وSunshine-style spend | ⚠️ | consent tracking المرتبط بـGPS موجود؛ لا يظهر سجل spend/transfer-of-value مكتمل. | نمذجة spend transactions وربطها بالـ HCP والحملات والتقارير. |
| Coaching وfeedback للمدير | ❌ | لا يظهر workflow لترك ملاحظات manager على زيارة أو ride-along. | إضافة coaching notes، flags، acknowledgement، وقياس التحسن. |
| Offline-first mobile Android/iOS | ⚠️ | Foundation Expo/SQLite queue ومزامنة idempotent واختبارات mobile transport موجودة. | CI builds للـ Android/iOS واختبار انقطاع/استئناف شبكة وجهاز فعلي. |

## 3. قائمة التحقق: ERP/HR

| الخاصية | الحالة | دليل المراجعة والتكامل | المعالجة المطلوبة |
|---|---:|---|---|
| Employee master data وأدوار | ✅ | Directory وHR وRBAC/tenant scope. | إضافة org chart حقيقي وmanager hierarchy إن كانت مطلوبة. |
| Attendance مع GPS/geofence | ✅ | attendance، GPS-backed check-in، وإجراءات HR/Tracking واختبارات. | اختبار ميداني لنطاقات GPS ونطاقات السماح. |
| Leave request/approval | ✅ | workflow واختبارات HR workflow/procedure. | إضافة calendar/team capacity integration. |
| Expense وreceipt upload/approval | ✅ | receipt constraints، expense workflow، وتخزين S3. | فحص malware/virus للملفات قبل الإنتاج. |
| Payroll CSV/XLSX export | ✅ | HR export وخطوط تدقيق، واختبارات. | إضافة mapping templates خاصة بمزود الحسابات. |
| Warehouse/inventory | ⚠️ | transactions للعينات، لا يوجد warehouse module عام مستقل. | إنشاء stock ledger، sites، adjustments، وreorder levels. |
| Procurement | ❌ | لا توجد purchase request/order workflows. | إضافة PR → approval → PO → receipt → invoice match. |
| Documents (contracts/SOP/certifications) | ⚠️ | receipts وCLM assets موجودة، لا توجد DMS عامة مع versioning/retention. | بناء document register، controlled versions، تدريب وإقرارات. |

## 4. قائمة التحقق: Fleet/GPS والمسارات

| الخاصية | الحالة | دليل المراجعة والتكامل | المعالجة المطلوبة |
|---|---:|---|---|
| Shift-scoped live GPS | ✅ | start/stop shift، consent، telemetry، وTracking UI؛ السياسة لا تسمح بتتبع 24/7. | اختبار battery/permission/backgound على iOS/Android فعلي. |
| Geofencing territory/HCP | ✅ | Haversine MySQL-side، أحداث قرب/دخول/خروج، واختبارات geofence. | load test لعدد كبير من pings وHCPs لكل tenant. |
| OSRM route optimization | ✅ | Compose OSRM، priority-aware routes، preview وmobile handoff. | اختبار زمن الاستجابة وحالات OSRM unavailable على بيانات طريق حقيقية. |
| Trip history/mileage/idle | ✅ | telemetry/idle/trip ومسارات BI fleet. | التحقق من دقة المسافة مقابل مسارات حقيقة. |
| Maintenance/fuel log | ❌ | لا توجد جداول/واجهات صيانة أو وقود. | إضافة vehicle asset، service schedule، fuel receipt، وتنبيهات due. |
| Driver behavior | ❌ | لا يظهر تحليل سرعة/فرملة/حساسات هاتف أو OBD. | إضافة mobile sensor policy أولاً ثم OBD connector اختياري. |

## 5. قائمة التحقق: Marketing وAI وAnalytics/BI

| الخاصية | الحالة | دليل المراجعة والتكامل | المعالجة المطلوبة |
|---|---:|---|---|
| Campaigns Email/SMS/WhatsApp | ⚠️ | builders/adapters واختبارات delivery موجودة؛ الإرسال الحقيقي يتطلب مفاتيح العميل وتهيئة provider. | sandbox integration tests وwebhook delivery/bounce lifecycle. |
| Segmentation | ✅ | segment builder على CRM attributes. | إضافة preview counts، versioning، وsuppression lists. |
| Content usage analytics | ✅ | content presentation evidence والتحليلات موجودة. | إضافة conversion attribution؛ لا توجد حالياً correlation موثقة مع النتائج. |
| Events/webinars | ❌ | لا توجد إدارة events/attendees/medical events. | إضافة event object، invitations، attendance، وspend compliance. |
| AI gateway multi-provider/local | ✅ | OpenAI/Anthropic/Gemini/local routes، policy per tenant، fail-closed sensitive local. | مراقبة تكلفة/latency وkey rotation per tenant. |
| Call assistant وdictation | ✅ | structured draft، transcription route، مراجعة بشرية، وسجل invocation. | اختبار provider حقيقي بمفتاح عميل في بيئة sandbox. |
| Next-best action | ✅ | tenant-scoped ranking من recency/tier/signals. | معايرة الأوزان، feedback loop، وقياس uplift. |
| AI territory/route optimizer | ⚠️ | OSRM optimizer موجود، لكنه ليس مولّد route AI أسبوعي متعدد القيود. | إضافة قيود سعة/أيام/skills وتحسين متعدد الأيام. |
| Forecasting | ❌ | لا يظهر نموذج forecasting للمبيعات أو الطلب. | تجهيز sales history ثم baseline forecast وbacktesting. |
| Conversational analytics | ✅ | allow-listed semantic catalog، charts/tables، history، tenant isolation. | توسيع catalog تدريجياً مع approval وعدم فتح SQL حر. |
| Content recommendation | ❌ | لا يظهر ranking محتوى per HCP. | بناء feature store مبسط وسياسة approval-filtered recommendations. |
| Anomaly detection | ✅ | sample/expense/territory anomaly، lifecycle alerts، daily monitor. | معايرة thresholds من بيانات فعلية وقياس false positives. |
| AI onboarding assistant | ❌ | لا يوجد SOP/product knowledge chat مخصص للتدريب. | بناء RAG محلي على SOPs مع access filtering وcitations. |
| Role BI dashboards + PDF/XLSX | ✅ | rep/manager/fleet/exec، KPI، heatmap، exports، واختبارات BI. | إضافة date/territory filters، saved views، report scheduling. |

## 6. المنصة، العزل، الـ compliance، والأمن

### 6.1 العزل متعدد العملاء

| بند | الحالة | دليل المراجعة | الخطوة التالية |
|---|---:|---|---|
| `tenantId` في النماذج وإجراءات scoped | ✅ | schema/routers تستخدم `resolveTenantScope()` وpredicates؛ اختبارات CRM/BI/analytics وhardening تغطي حالات عزل. | إضافة property-based/fuzz tests لكل router ومعامل ID عشوائي. |
| منع tenant admin من منصة الشركات | ✅ | اختبار جديد يثبت رفض `platform.listTenants` و`provisionTenant` لمدير tenant. | سجل review فصلي لسياسة super-admin. |
| Super-admin provisioning/lifecycle | ✅ | Tenant Management UI وplatform router وسبب lifecycle/audit. | إضافة invite/reset-admin flow وfour-eyes approval للإيقاف. |
| SQL injection | ✅ | Drizzle query builder وZod؛ analytics يعتمد semantic allow-list بدلاً من SQL حر. | DAST وdependency scan وSAST في CI؛ هذا ليس بديلاً عن اختبار خارجي. |

### 6.2 strict compliance

| بند | الحالة | دليل المراجعة | الخطوة التالية |
|---|---:|---|---|
| Append-only visits/samples/signatures/audit | ✅ | لا توجد update/delete procedures لهذه الأدلة، migrations/guards واختبارات compliance strict. | تنفيذ negative tests على MySQL 8.4 الإنتاجي كما في runbook. |
| Reason-for-change/revision evidence | ✅ | regulated-record revision links وreason field. | اختبار إيجابي لعملية supersession كاملة مع audit retrieval. |
| Two-component e-signature | ⚠️ | credential verification + explicit action + meaning + timestamps موجودة؛ إثبات E2E الإيجابي ما زال محدوداً. | OQ test signed subject، wrong credential، replay، وcross-tenant subject. |
| NTP server time | ⚠️ | التوقيت يُنشأ على الخادم والوثائق تطلب NTP؛ لا توجد مراقبة NTP أو evidence runtime في التطبيق. | chrony/NTP health monitor وتنبيه drift واحتفاظ بسجل الحالة. |
| Access review/change control/custody | ✅ | Compliance Review، effective permissions snapshot، change request، custody report. | إضافة export موقّع وscheduled access review. |
| Retention/retrievability | ⚠️ | الاحتفاظ append-only والتقارير البشرية موجودان، لكن لا توجد policy engine/legal hold. | إعداد tenant retention schedules وhold وarchive retrieval tests. |

### 6.3 الأمن

| بند | الحالة | دليل المراجعة | الخطوة التالية |
|---|---:|---|---|
| RBAC لكل API surface | ✅ | tenantRoleProcedure/superAdminProcedure عبر routers، واختبارات role denial. | policy matrix مولد آلياً واختبارات لكل procedure عند CI. |
| Input validation | ✅ | Zod schemas بحدود وصيغ للمدخلات عبر الإجراءات. | fuzzer للـ malformed payloads وupload parsers. |
| Authentication | ✅ | self-hosted JWT/local credentials مع سياق tRPC محمي. | MFA/SSO، password lockout، وsession/device management. |
| Rate limiting | ✅ | in-process 300/min + Nginx 20r/s/40 burst، واختبار 429. | Redis/shared limiter عند تعدد nodes. |
| Headers/body/edge controls | ✅ | CSP، no-store API، anti-frame، nosniff، body caps/timeouts. | TLS config scan وCSP report-only tuning. |
| اختبار أمني مستقل | ❌ | لا يوجد pentest/DAST مستقل أو scan dependency موثق ضمن المراجعة. | OWASP ASVS review وDAST/SCA قبل go-live. |

## 7. مراجعة مسارات المستخدم الرئيسية end-to-end

| المسار | الحالة | ما تم إثباته | النقص لمنح ✅ E2E كامل |
|---|---:|---|---|
| تسجيل الدخول → session | ⚠️ | اختبار logout/auth وعزل الإجراءات المحمية. | Playwright login/logout/session-expiry وlockout scenario. |
| Start Shift → GPS → map/alert | ⚠️ | tracking/geofence/rep procedure tests وواجهة tracking؛ consent/shift policy في الكود. | اختبار هاتف فعلي لخلفية التطبيق، permissions، network loss، وGPS mock. |
| خطة زيارة → visit log → dashboard | ⚠️ | CRM/rep procedures وBI tests تربط المفاهيم. | سيناريو واحد على متصفح من create plan إلى completed visit وrep/manager dashboard. |
| e-signature | ⚠️ | validation للـ explicit action وضوابط static/contract. | positive credential test وتحقق من record-binding hash/audit trail. |
| صرف عينة → hand-off → custody report | ⚠️ | sample/custody model وتقارير compliance. | سيناريو كامل بlot/expiry/hand-off/visit ثم export/report assertion. |
| إجازة ومصروف | ✅ | HR procedure/workflow tests، receipt policy، payroll export. | إضافة browser E2E للتجربة البصرية فقط. |
| حملة تسويقية | ⚠️ | campaign delivery and marketing tests. | provider sandbox، webhook events، unsubscribe/consent test. |
| سؤال AI → chart/table | ⚠️ | allow-listed analytics procedures/contracts. | تنفيذ مع provider configured وrole UI E2E؛ لا يتم ادعاء نجاح provider حقيقي بلا مفتاح عميل. |
| anomaly → manager lifecycle | ⚠️ | anomaly detection/dedup/procedure tests. | تشغيل scheduler على بيئة staging وتأكيد authenticated callback/alert UX. |

## 8. الأداء وقابلية التوسع

لم تُنشأ بيانات كبيرة اصطناعية لهذه المراجعة، التزاماً بعدم اختلاق benchmark أو أرقام أداء. لذلك لا توجد نتيجة زمنية موثقة تثبت أن خرائط GPS أو dashboards تستجيب بسرعة عند عشرات/مئات الآلاف من الأحداث. التصميم الحالي يستخدم MySQL predicates حسب tenant، Haversine على الخادم، وBI aggregations scoped، كما أن المسارات وOSRM خدمات خاصة؛ لكن ذلك **ليس بديلاً عن اختبار حمل**.

| مجال الأداء | الحالة | الخطر | اختبار قبول مقترح |
|---|---:|---|---|
| GPS ingestion/geofence | ⚠️ | bursts من pings قد تضغط MySQL وحساب المسافات. | بيانات staging واقعية مع 500–2,000 جهاز نشط، p95 ingestion/alert، وفحص indexes/explain. |
| خرائط وتاريخ الرحلات | ⚠️ | تحميل نقاط كثيرة في viewport واحد. | pagination/clustering، وقياس payload/render عند 10k+ ping للtenant. |
| BI وexports | ⚠️ | aggregations/exports قد تكبر مع التاريخ. | 12 شهراً من بيانات ممثلة، p95 dashboard ووقت/ذاكرة XLSX/PDF. |
| Anomaly daily job | ⚠️ | scan يومي قد يطيل مع نمو records. | benchmark per tenant، batching، وmetrics للوظيفة. |
| Rate limiting | ✅ | متوفر دفاع مبدئي. | shared Redis limiter قبل replicas/multi-node. |

## 9. الفجوات مقابل Veeva وSalesforce

Veeva Vault CRM يربط call reporting بخطط الحساب والمنتج وأهداف المكالمات وحدود العينات، ويجعل المكالمة submitted غير قابلة للتحرير أو الحذف.[1] كما يذكر قدرات life-sciences مثل omnichannel engagement، key account management، events، approved content، mobile/offline، وAI خاص بالسياق.[2] Salesforce يبرز lead management، account/opportunity management، forecast/pipeline management، automation، quoting/contract approvals، والتقارير والـ dashboards.[3]

| فجوة تنافسية | مقارنة موجزة | الأولوية | توصية تنفيذية |
|---|---|---:|---|
| Forecasting وquoting/contract approval | Salesforce يوفر forecasting/quotes/approvals؛ PharmaFlow لا يقدم forecasting أو quoting. [3] | عالية | إضافة sales/product fact tables، baseline forecast مع backtest، ثم quote/approval workflow. |
| HCP/Key Account 360 وaffiliations | Veeva يركز على account planning وKAM والسجل الموحد. [2] | عالية | HCP affiliations، account-plan goals، stakeholder map، ومؤشرات plan progress. |
| Events/medical events | Veeva يذكر events management وomnichannel. [2] | متوسطة | Event lifecycle، attendees، consent، spend، وfollow-up tasks. |
| Coaching وfield effectiveness | Salesforce يبرز deal insights/coaching؛ لا يوجد coaching module واضح. [3] | متوسطة | manager feedback، ride-along، scorecards، coaching plans. |
| Maintenance/fuel/driver behavior | فئة fleet الأساسية غير مكتملة. | متوسطة | vehicle/fuel/service/behavior modules وربطها بالـ GPS. |
| Enterprise integrations | المنافسون يملكون ecosystem/integrations أوسع؛ PharmaFlow يملك tRPC داخلياً لا public integration platform مكتمل. | عالية | API versioning، OAuth/API keys، webhooks، audit، integration gateway. |
| Multi-language Arabic/English | PRD يطلبها، ولا يظهر i18n كامل. | عالية للأسواق العربية | i18next، RTL، locale-aware dates/numbers، وtranslation governance. |
| Validation-operational maturity | Veeva يدعي pre-validation، بينما PharmaFlow يقدّم framework وdocumentation فقط. [2] | عالية للـ regulated tenants | IQ/OQ/PQ customer package، NTP/backup evidence، qualified release process. |

## 10. خطة إصلاح مرتبة

| الفترة | العمل | معيار الانتهاء |
|---|---|---|
| P0 — قبل أول عميل منظم | Playwright/mobile E2E للمسارات التسعة؛ اختبار e-signature إيجابي؛ MySQL trigger/NTP/backup restore evidence؛ DAST/SCA. | حزمة OQ وsecurity sign-off موثقة، بلا ادعاء غير مثبت. |
| P1 — أول ربع | multi-language/RTL، retention/legal hold، warehouse reconciliation، content/consent spend، performance load suite. | p95/SLO موثق على حجم بيانات متفق عليه، وسياسات retention قابلة للتشغيل. |
| P2 — تمييز تجاري | forecasting، KAM/coaching، events، maintenance/fuel، public API/webhooks. | استخدام فعلي لكل workflow مع audit وtenant isolation tests. |
| P3 — توسع المؤسسة | Redis rate limiter، SSO/MFA، integration marketplace، DR drills، observability. | اختبارات failover/DR وsecurity review خارجي. |

## 11. المراجع

[1] [Veeva Vault CRM Help — Call Reporting Overview](https://vaultcrmhelp.veeva.com/doc/Content/CRM_topics/Call_Reporting_2/CallReportingOverview.htm)

[2] [Veeva — Vault CRM Features Brief](https://www.veeva.com/resources/veeva-vault-crm-features-brief/)

[3] [Salesforce — Agentforce Sales / Sales Cloud](https://www.salesforce.com/sales/cloud/)
