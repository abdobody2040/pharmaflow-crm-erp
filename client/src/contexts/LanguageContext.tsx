import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { trpc } from "@/lib/trpc";

export type Language = "en" | "ar";
const dictionary = {
  en: {
    language: "العربية",
    operations: "Operations Expansion",
    commandCenter: "Command Center",
    tenantManagement: "Tenant Management",
    complianceReview: "Compliance Review",
  },
  ar: {
    language: "English",
    operations: "التشغيل والتوسعة",
    commandCenter: "مركز القيادة",
    tenantManagement: "إدارة العملاء",
    complianceReview: "مراجعة الامتثال",
  },
};
const arabicStrings: Record<string, string> = {
  "Compliance control plane": "منصة التحكم بالامتثال",
  "Self-hosted by design": "مصمم للاستضافة الذاتية",
  "Trusted operations, engineered for proof.": "عمليات موثوقة مصممة لإثباتها.",
  "A tenant-isolated workspace for regulated field operations, immutable records, and deliberate access control.":
    "مساحة عمل معزولة بين العملاء للعمليات الميدانية المنظمة والسجلات غير القابلة للتعديل والتحكم المقصود بالوصول.",
  "JWT sessions · Tenant scoping · Immutable compliance evidence":
    "جلسات JWT · نطاق العميل · أدلة امتثال غير قابلة للتعديل",
  "Secure access": "وصول آمن",
  "Welcome back": "مرحباً بعودتك",
  "Sign in to your platform or tenant workspace.":
    "سجّل الدخول إلى مساحة عمل المنصة أو العميل.",
  "Tenant slug": "معرّف العميل",
  "(optional for platform)": "(اختياري للمنصة)",
  "Email address": "عنوان البريد الإلكتروني",
  Password: "كلمة المرور",
  "Establishing secure session…": "جارٍ إنشاء جلسة آمنة…",
  "Sign in securely": "تسجيل دخول آمن",
  "This self-hosted environment never stores browser passwords. Tenant accounts are provisioned by your platform administrator.":
    "لا تحتفظ هذه البيئة المستضافة ذاتياً بكلمات مرور المتصفح. ينشئ مسؤول المنصة حسابات العملاء.",
  "Secure session established.": "تم إنشاء جلسة آمنة.",
  "System assurance overview": "نظرة عامة على ضمان النظام",
  "Good morning": "صباح الخير",
  Operator: "المشغّل",
  "Your platform foundation is configured for tenant-separated operations and durable compliance evidence. Expand modules only through audited, scoped procedures.":
    "تم إعداد أساس المنصة لعمليات معزولة بين العملاء وأدلة امتثال قابلة للحفظ. وسّع الوحدات فقط من خلال إجراءات مدققة ومحددة النطاق.",
  "Session role": "دور الجلسة",
  Scope: "النطاق",
  "Tenant-restricted": "مقيّد بالعميل",
  "Platform-wide": "على مستوى المنصة",
  "Tenant isolation": "عزل العملاء",
  "Mandatory scope guard on every tenant query":
    "حارس نطاق إلزامي في كل استعلام خاص بالعميل",
  "Immutable evidence": "أدلة غير قابلة للتعديل",
  "Insert-only paths for regulated operational records":
    "مسارات إضافة فقط للسجلات التشغيلية المنظمة",
  "Role authority": "سلطة الدور",
  "Procedure-level permissions mapped to business roles":
    "صلاحيات على مستوى الإجراءات مرتبطة بأدوار العمل",
  "Foundation status": "حالة الأساس",
  "Operational control map": "خريطة الضوابط التشغيلية",
  "Database records are tenant-scoped by mandatory query predicates.":
    "سجلات قاعدة البيانات محددة بنطاق العميل عبر شروط استعلام إلزامية.",
  "Compliance log writes expose create-only procedures; no update or deletion routes are registered.":
    "كتابات سجل الامتثال تستخدم إجراءات إنشاء فقط؛ ولا توجد مسارات تحديث أو حذف.",
  "Lifecycle changes use explicit status states and capture hash-linked audit events.":
    "تغييرات دورة الحياة تستخدم حالات صريحة وتوثق أحداث تدقيق مرتبطة بالهاش.",
  "Platform tenants": "عملاء المنصة",
  "Tenant counts are reserved for super-admins.":
    "أعداد العملاء محجوزة للمشرفين العامين.",
  "Controls active": "الضوابط فعّالة",
  "Command Center": "مركز القيادة",
  "Tenant Management": "إدارة العملاء",
  Settings: "الإعدادات",
  "Compliance Review": "مراجعة الامتثال",
  "BI Dashboards": "لوحات ذكاء الأعمال",
  "GPS Operations": "عمليات GPS",
  "Operations Expansion": "التشغيل والتوسعة",
  CRM: "إدارة العملاء",
  Accounts: "الحسابات",
  Contacts: "جهات الاتصال",
  Territories: "المناطق",
  "Cycle Plans": "خطط الدورة",
  Opportunities: "الفرص",
  "Rep Workspace": "مساحة عمل المندوب",
  "Visit Capture": "تسجيل الزيارة",
  Marketing: "التسويق",
  "AI Control Center": "مركز التحكم بالذكاء الاصطناعي",
  Analytics: "التحليلات",
  "HR & Payroll": "الموارد البشرية والرواتب",
  "MVP operations expansion": "توسعة تشغيلية أولية",
  "Forecast, procure, operate, engage, coach":
    "تنبأ، اشترِ، شغّل، تفاعل، ووجّه",
  "Tenant-scoped workflows are deliberately compact in this first release. Every lifecycle action is role-gated and recorded in the audit trail.":
    "تدفقات العمل المحددة بنطاق العميل مركزة عمداً في هذا الإصدار الأول. كل إجراء في دورة الحياة محمي بالدور ومسجل في سجل التدقيق.",
  Forecasting: "التنبؤ",
  Procurement: "المشتريات",
  Fleet: "الأسطول",
  "Fuel log": "سجل الوقود",
  Events: "الفعاليات",
  "Manager coaching": "توجيه المدير",
  "Territory & product baseline forecast": "توقع أساسي للمنطقة والمنتج",
  Product: "المنتج",
  "Forecast value": "قيمة التوقع",
  "Create draft forecast": "إنشاء مسودة توقع",
  "No forecast records for this tenant yet.":
    "لا توجد سجلات توقع لهذا العميل حتى الآن.",
  "Forecast recorded": "تم تسجيل التوقع",
  "Simple purchase requests": "طلبات شراء مبسطة",
  "Product or sample name": "اسم المنتج أو العينة",
  "Requested quantity": "الكمية المطلوبة",
  "Operational rationale": "المبرر التشغيلي",
  "Submit purchase request": "إرسال طلب الشراء",
  "No procurement requests for this tenant yet.":
    "لا توجد طلبات شراء لهذا العميل حتى الآن.",
  "Purchase request submitted": "تم إرسال طلب الشراء",
  "Vehicle maintenance & fuel": "صيانة المركبات والوقود",
  Registration: "رقم التسجيل",
  "Make / model": "الصانع / الطراز",
  "Register vehicle": "تسجيل مركبة",
  "Vehicle ID": "معرّف المركبة",
  "Maintenance type": "نوع الصيانة",
  "Schedule maintenance": "جدولة الصيانة",
  "Register a vehicle before recording maintenance or fuel.":
    "سجّل مركبة قبل إدخال الصيانة أو الوقود.",
  Maintenance: "صيانة",
  "Vehicle registered": "تم تسجيل المركبة",
  "Maintenance scheduled": "تمت جدولة الصيانة",
  "Manual refueling records": "سجلات تعبئة الوقود اليدوية",
  "Odometer km": "عداد الكيلومترات",
  Liters: "لترات",
  "Total cost": "التكلفة الإجمالية",
  "Record fuel": "تسجيل الوقود",
  "No manual fuel entries yet.": "لا توجد إدخالات وقود يدوية حتى الآن.",
  "Fuel log recorded": "تم تسجيل الوقود",
  "Medical events, webinars & launches": "فعاليات طبية وندوات وإطلاقات",
  "Event name": "اسم الفعالية",
  "Venue or webinar URL": "المكان أو رابط الندوة",
  "Create webinar event": "إنشاء فعالية ندوة",
  "No events scheduled for this tenant yet.":
    "لا توجد فعاليات مجدولة لهذا العميل حتى الآن.",
  "Event created": "تم إنشاء الفعالية",
  "Visit feedback & compliance flags": "ملاحظات الزيارة وإشارات الامتثال",
  "Visit log ID": "معرّف سجل الزيارة",
  "Specific coaching feedback": "ملاحظات توجيه محددة",
  "Flag for compliance follow-up": "وضع إشارة لمتابعة الامتثال",
  "Record coaching note": "تسجيل ملاحظة توجيه",
  "No coaching notes visible for this user yet.":
    "لا توجد ملاحظات توجيه ظاهرة لهذا المستخدم حتى الآن.",
  "Compliance flag": "إشارة امتثال",
  Coaching: "توجيه",
  "Coaching note recorded": "تم تسجيل ملاحظة التوجيه",
};
Object.assign(arabicStrings, {
  "Business intelligence": "ذكاء الأعمال",
  "Role-based dashboard": "لوحة معلومات حسب الدور",
  "Tenant-scoped coverage, operations, and KPI reporting.":
    "تقارير التغطية والعمليات ومؤشرات الأداء ضمن نطاق العميل.",
  "Unable to load this permitted BI view:":
    "تعذر تحميل عرض ذكاء الأعمال المسموح:",
  "Report export could not be completed:": "تعذر إكمال تصدير التقرير:",
  "Team coverage heatmap": "خريطة حرارية لتغطية الفريق",
  "Target achievement by representative": "تحقيق المستهدف حسب المندوب",
  "completed of": "مكتملة من",
  "planned calls": "زيارات مخططة",
  "No team call-plan data is available for this reporting period.":
    "لا توجد بيانات لخطة زيارات الفريق في فترة التقرير هذه.",
  "Performance detail": "تفاصيل الأداء",
  "No permitted data is available for this reporting view yet.":
    "لا تتوفر بيانات مسموح بها لعرض التقرير هذا حتى الآن.",
  rep: "مندوب",
  manager: "مدير",
  fleet: "الأسطول",
  exec: "تنفيذي",
  "Warehouse Inventory": "مخزون المستودعات",
  "Inventory control": "إدارة المخزون",
  "General warehouse": "المستودع العام",
  "Tenant-scoped warehouse locations, append-only movements, stock position, and replenishment thresholds. Regulated sample custody remains in its dedicated compliance chain.":
    "مواقع المستودعات وحركات المخزون بالإضافة فقط وأرصدة المخزون وحدود إعادة الطلب ضمن نطاق العميل. تبقى سلسلة حيازة العينات المنظمة في مسار الامتثال المخصص لها.",
  Refresh: "تحديث",
  "Active sites": "المواقع النشطة",
  "Stock positions": "أرصدة المخزون",
  "Reorder attention": "تنبيهات إعادة الطلب",
  Balances: "الأرصدة",
  Ledger: "دفتر الحركات",
  Sites: "المواقع",
  Reorder: "إعادة الطلب",
  "Current stock position": "وضع المخزون الحالي",
  Site: "الموقع",
  "Lot / expiry": "التشغيلة / الصلاحية",
  Quantity: "الكمية",
  Threshold: "الحد",
  "Not set": "غير محدد",
  "No warehouse ledger movements have been recorded yet.":
    "لم يتم تسجيل أي حركات في دفتر المستودع حتى الآن.",
  "Record compensating movement": "تسجيل حركة تعويضية",
  "Select site": "اختر الموقع",
  "Product name": "اسم المنتج",
  "Quantity (+ / -)": "الكمية (+ / -)",
  "Reason for movement": "سبب الحركة",
  "Append movement": "إضافة حركة",
  "Movement ledger": "دفتر الحركات",
  When: "الوقت",
  Movement: "الحركة",
  Reason: "السبب",
  "The ledger is intentionally empty until the first approved movement.":
    "دفتر الحركات فارغ عمداً حتى أول حركة معتمدة.",
  "Add an inventory site": "إضافة موقع مخزون",
  "Site name": "اسم الموقع",
  "Unique site code": "رمز موقع فريد",
  "Create site": "إنشاء موقع",
  "No inventory sites have been configured.":
    "لم يتم إعداد مواقع مخزون حتى الآن.",
  "Set reorder threshold": "تحديد حد إعادة الطلب",
  "Minimum quantity": "الكمية الدنيا",
  "Reorder quantity": "كمية إعادة الطلب",
  "Save threshold": "حفظ الحد",
  "No reorder thresholds have been configured.":
    "لم يتم إعداد حدود لإعادة الطلب حتى الآن.",
  "Document Register": "سجل المستندات",
  "Document register": "سجل المستندات",
  "Governed records": "سجلات محكومة",
  "A tenant-owned register for operational documents, independent of presentation content. Each replacement becomes a new version while older evidence remains retained.":
    "سجل مملوك للعميل للمستندات التشغيلية ومنفصل عن محتوى العروض. كل استبدال ينشئ إصداراً جديداً مع الاحتفاظ بالأدلة السابقة.",
  "Retention tracked": "الاحتفاظ متابع",
  "Registered versions": "الإصدارات المسجلة",
  "Active records": "السجلات النشطة",
  "Historical versions": "الإصدارات السابقة",
  "Register a document": "تسجيل مستند",
  "Document number": "رقم المستند",
  Title: "العنوان",
  "Storage key": "مفتاح التخزين",
  "File name": "اسم الملف",
  "MIME type": "نوع MIME",
  Classification: "التصنيف",
  "Retention date": "تاريخ الاحتفاظ",
  Register: "تسجيل",
  "Create version": "إنشاء إصدار",
  Cancel: "إلغاء",
  "Versioned document evidence": "أدلة المستندات ذات الإصدارات",
  Document: "المستند",
  Version: "الإصدار",
  Retention: "الاحتفاظ",
  Status: "الحالة",
  Actions: "الإجراءات",
  "New version": "إصدار جديد",
  Activate: "تفعيل",
  "No managed documents are registered for this tenant.":
    "لا توجد مستندات مُدارة مسجلة لهذا العميل.",
  "Ride-along": "مرافقة ميدانية",
  "Ride-along sessions": "جلسات المرافقة الميدانية",
  "Schedule ride-along": "جدولة مرافقة ميدانية",
  "Complete ride-along": "إكمال المرافقة الميدانية",
  "Manager scorecard": "بطاقة تقييم المدير",
  Scorecard: "بطاقة التقييم",
  "Create scorecard": "إنشاء بطاقة تقييم",
  "Acknowledge scorecard": "الإقرار ببطاقة التقييم",
  Preparation: "التحضير",
  "Product knowledge": "معرفة المنتج",
  "Call quality": "جودة الزيارة",
  "Follow-up": "المتابعة",
  "Compliance score": "درجة الامتثال",
  "Completion note": "ملاحظة الإكمال",
  "Scheduled for": "موعد الجدولة",
  Representative: "المندوب",
  "No ride-along sessions are visible for this tenant yet.":
    "لا توجد جلسات مرافقة ميدانية ظاهرة لهذا العميل حتى الآن.",
  "No manager scorecards are visible for this tenant yet.":
    "لا توجد بطاقات تقييم للمدير ظاهرة لهذا العميل حتى الآن.",
  "Active inventory site not found in the tenant":
    "لم يتم العثور على موقع مخزون نشط ضمن العميل.",
  "Document record not found in the tenant":
    "لم يتم العثور على سجل المستند ضمن العميل.",
  "Document number already exists; create a new version instead":
    "رقم المستند موجود بالفعل؛ أنشئ إصداراً جديداً بدلاً من ذلك.",
  "An archived document cannot receive a new version":
    "لا يمكن إنشاء إصدار جديد لمستند مؤرشف.",
  "An archived document cannot be activated": "لا يمكن تفعيل مستند مؤرشف.",
  "Credential confirmation failed": "فشل تأكيد بيانات الاعتماد.",
  "Database unavailable": "قاعدة البيانات غير متاحة.",
  "not authorized": "غير مصرح لك بتنفيذ هذا الإجراء.",
});
Object.assign(arabicStrings, {
  Accept: "قبول",
  "Accept and record reviewed visit": "قبول وتسجيل الزيارة المراجعة",
  "Access review": "مراجعة الوصول",
  Account: "الحساب",
  "Account ID": "معرّف الحساب",
  "Account affiliations": "علاقات الحساب",
  "Account relationships": "علاقات الحساب",
  "Accounts reached": "الحسابات التي تم الوصول إليها",
  Acknowledge: "إقرار",
  Action: "إجراء",
  "Add affiliation": "إضافة علاقة",
  "Add contact": "إضافة جهة اتصال",
  "Add or update a term": "إضافة أو تحديث مصطلح",
  "Add to library": "إضافة إلى المكتبة",
  "Affiliated with": "مرتبط بـ",
  Alerts: "التنبيهات",
  "All active accounts": "كل الحسابات النشطة",
  "Allowed test event": "حدث الاختبار المسموح",
  Amount: "المبلغ",
  "An administrator or executive role is required to review regulated evidence and access controls.":
    "يلزم دور مسؤول أو تنفيذي لمراجعة الأدلة المنظمة وضوابط الوصول.",
  "An unavailable private route blocks a sensitive request; the gateway never falls back from a sensitive tenant to a hosted provider.":
    "تعطل المسار الخاص يمنع الطلب الحساس؛ ولا تعود البوابة من عميل حساس إلى مزود مستضاف.",
  "An unexpected error occurred.": "حدث خطأ غير متوقع.",
  "Annual leave": "إجازة سنوية",
  Approve: "موافقة",
  "Approved content": "محتوى معتمد",
  "Approved content for HCP discussion": "محتوى معتمد لمناقشة مقدم الرعاية",
  "Approved semantic metrics only; tenant data never reaches free-form SQL.":
    "تُستخدم المقاييس الدلالية المعتمدة فقط؛ ولا تصل بيانات العميل إلى SQL حر.",
  Archive: "أرشفة",
  Ask: "اسأل",
  "Ask your operational data": "اسأل بياناتك التشغيلية",
  "Associated contacts": "جهات الاتصال المرتبطة",
  Attendance: "الحضور",
  "Attendance evidence": "دليل الحضور",
  "Audience segments": "شرائح الجمهور",
  Audiences: "الجماهير",
  "Audit trail": "سجل التدقيق",
  "Build attribute-based audiences, govern HCP content, stage multi-channel outreach, and retain auditable presentation evidence.":
    "أنشئ جماهير حسب السمات، وأدر محتوى مقدمي الرعاية، وجهّز التواصل متعدد القنوات، واحتفظ بأدلة عرض قابلة للتدقيق.",
  "CLM library": "مكتبة CLM",
  "CRM attribute segment": "شريحة سمات إدارة العملاء",
  "Call assistant": "مساعد الزيارة",
  "Call assistant and account priorities": "مساعد الزيارة وأولويات الحساب",
  "Call planning": "تخطيط الزيارات",
  "Campaign control room": "مركز التحكم بالحملات",
  Campaigns: "الحملات",
  Channel: "القناة",
  "Channel requires live credentials": "القناة تتطلب بيانات اعتماد حية",
  "Check out sample": "صرف عينة",
  "Choose a shift to inspect its idle evidence.":
    "اختر وردية لفحص دليل الخمول الخاص بها.",
  "Choose observed shift": "اختر الوردية المرصودة",
  "Choose related account": "اختر الحساب المرتبط",
  "Commercial context": "السياق التجاري",
  Company: "الشركة",
  Complete: "إكمال",
  "Compliance review access is restricted": "الوصول لمراجعة الامتثال مقيّد",
  "Compliance review center": "مركز مراجعة الامتثال",
  Contact: "جهة الاتصال",
  "Content performance": "أداء المحتوى",
  "Content presentations": "عروض المحتوى",
  "Controlled webhook endpoints": "نقاط webhook المضبوطة",
  "Copy this API key now": "انسخ مفتاح API الآن",
  Create: "إنشاء",
  "Create campaign": "إنشاء حملة",
  "Create cycle plan": "إنشاء خطة دورة",
  "Create geofence": "إنشاء نطاق جغرافي",
  "Create territory": "إنشاء منطقة",
  "Create the first company above to initialize its tenant boundary and administrator.":
    "أنشئ أول شركة أعلاه لتهيئة حدود العميل والمسؤول الخاص بها.",
  "Current password": "كلمة المرور الحالية",
  "Custody hand-off": "تسليم الحيازة",
  "Customer-key activation": "تفعيل مفتاح العميل",
  "Cycle planner": "مخطط الدورة",
  "Daily anomaly monitor": "مراقب الشذوذ اليومي",
  "Daily call plan": "خطة الزيارات اليومية",
  "Daily route optimization": "تحسين المسار اليومي",
  "Data sensitivity": "حساسية البيانات",
  "Default model": "النموذج الافتراضي",
  "Default provider": "المزود الافتراضي",
  Department: "القسم",
  "Dictate or type your note, review every AI-filled field, then explicitly record the visit through the normal immutable workflow.":
    "أملِ أو اكتب ملاحظتك، وراجع كل حقل ملأه الذكاء الاصطناعي، ثم سجل الزيارة صراحة عبر مسار العمل غير القابل للتعديل.",
  Discovery: "استكشاف",
  Dismiss: "تجاهل",
  Dispatch: "إرسال",
  "Distinct CRM accounts with approved content shown.":
    "حسابات إدارة العملاء المميزة التي عُرض لها محتوى معتمد.",
  Distributor: "موزع",
  Duration: "المدة",
  "ERP / HR workspace": "مساحة ERP والموارد البشرية",
  Edit: "تعديل",
  "Edit profile": "تعديل الملف الشخصي",
  Email: "البريد الإلكتروني",
  Employee: "موظف",
  "Employee directory": "دليل الموظفين",
  "Employee lifecycle workflows with geofence-backed attendance, review controls, receipt evidence, and audited payroll exports.":
    "تدفقات دورة حياة الموظف مع حضور مدعوم بنطاق جغرافي، وضوابط مراجعة، وأدلة الإيصالات، وتصديرات رواتب مدققة.",
  "Employee records": "سجلات الموظفين",
  Employees: "الموظفون",
  Employs: "يوظف",
  "Enable daily monitor": "تفعيل المراقب اليومي",
  "Engagement operations": "عمليات التفاعل",
  Enterprise: "مؤسسي",
  Entity: "الكيان",
  "Entries are create-only. Corrections are recorded as superseding evidence rather than edits.":
    "السجلات إضافة فقط. تُسجل التصحيحات كأدلة لاحقة بدلاً من التعديلات.",
  Error: "خطأ",
  "Estimated driving time": "زمن القيادة التقديري",
  "Estimated route distance": "مسافة المسار التقديرية",
  Event: "حدث",
  "Every employee identity is scoped to the active tenant and retains creation metadata. Status transitions are logged rather than deleted.":
    "كل هوية موظف محددة للعميل النشط وتحتفظ ببيانات الإنشاء. تسجل انتقالات الحالة بدلاً من الحذف.",
  Evidence: "دليل",
  "Evidence hash": "هاش الدليل",
  Expense: "مصروف",
  "Expense approvals": "موافقات المصروفات",
  Expenses: "المصروفات",
  Expiry: "انتهاء الصلاحية",
  "External approved link": "رابط خارجي معتمد",
  "Fail-closed privacy": "خصوصية بفشل مغلق",
  "Field force design": "تصميم القوة الميدانية",
  File: "ملف",
  "GPS attendance check-in": "تسجيل حضور عبر GPS",
  "GPS tracking & geofencing": "تتبع GPS والنطاق الجغرافي",
  "Generate export": "إنشاء تصدير",
  "Governed analytics": "تحليلات محكومة",
  Growth: "نمو",
  "HCP / Doctor": "مقدم رعاية / طبيب",
  "HCP lookup and visit capture": "البحث عن مقدم رعاية وتسجيل الزيارة",
  "HCP stop": "محطة مقدم الرعاية",
  "Highly sensitive": "حساس جداً",
  Home: "الرئيسية",
  Hospital: "مستشفى",
  "Human review required": "المراجعة البشرية مطلوبة",
  "Idle events": "أحداث الخمول",
  "Immutable field evidence": "دليل ميداني غير قابل للتعديل",
  Influences: "يؤثر في",
  "Integration administration is restricted": "إدارة التكاملات مقيّدة",
  Invoice: "فاتورة",
  "Issue key once": "إصدار المفتاح مرة واحدة",
  "Issue v1 API key": "إصدار مفتاح API v1",
  Key: "مفتاح",
  "Key label": "تسمية المفتاح",
  Label: "تسمية",
  "Latest delivery evidence": "أحدث أدلة الإرسال",
  Leave: "إجازة",
  "Leave workflow": "مسار الإجازة",
  "Lifecycle action": "إجراء دورة الحياة",
  "Loading tenant registry…": "جارٍ تحميل سجل العملاء…",
  "Loading terminology…": "جارٍ تحميل المصطلحات…",
  "Loading unified account view…": "جارٍ تحميل عرض الحساب الموحد…",
  "Location operations": "عمليات الموقع",
  Lodging: "إقامة",
  "Log a completed visit": "سجل زيارة مكتملة",
  Lost: "خاسرة",
  "Manager anomaly queue": "قائمة شذوذات المدير",
  "Mark reimbursed": "تحديد كمُسدّد",
  "Marketing & approved content": "التسويق والمحتوى المعتمد",
  Meals: "وجبات",
  Meaning: "المعنى",
  "Member of": "عضو في",
  Message: "رسالة",
  Method: "الطريقة",
  Mileage: "المسافة المقطوعة",
  Minimum: "الحد الأدنى",
  More: "المزيد",
  "My Account": "حسابي",
  Name: "الاسم",
  "Natural-language query": "استعلام باللغة الطبيعية",
  Negotiation: "تفاوض",
  "New account": "حساب جديد",
  "New opportunity": "فرصة جديدة",
  "New password": "كلمة مرور جديدة",
  "Next steps": "الخطوات التالية",
  "Next-best-action": "أفضل إجراء تالٍ",
  "No CRM accounts are registered for this tenant.":
    "لا توجد حسابات CRM مسجلة لهذا العميل.",
  "No access-review evidence exists for this tenant yet.":
    "لا يوجد دليل مراجعة وصول لهذا العميل حتى الآن.",
  "No active opportunity or commercial signal.":
    "لا توجد فرصة نشطة أو إشارة تجارية.",
  "No active workforce records": "لا توجد سجلات قوة عاملة نشطة",
  "No activity.": "لا يوجد نشاط.",
  "No affiliations yet.": "لا توجد علاقات حتى الآن.",
  "No approved materials are currently available.":
    "لا توجد مواد معتمدة متاحة حالياً.",
  "No attached content": "لا يوجد محتوى مرفق",
  "No attendance evidence is available.": "لا يتوفر دليل حضور.",
  "No audiences are available.": "لا توجد جماهير متاحة.",
  "No campaigns are available.": "لا توجد حملات متاحة.",
  "No checked-out sample records.": "لا توجد سجلات عينات مصروفة.",
  "No contact relationships recorded.": "لا توجد علاقات جهات اتصال مسجلة.",
  "No contacts.": "لا توجد جهات اتصال.",
  "No content items are available.": "لا توجد عناصر محتوى متاحة.",
  "No coordinate exceptions.": "لا توجد استثناءات إحداثيات.",
  "No coordinate-ready planned visits for this route.":
    "لا توجد زيارات مخططة جاهزة بالإحداثيات لهذا المسار.",
  "No cycle plans defined.": "لا توجد خطط دورة محددة.",
  "No delivery attempts have been made.": "لم تُجر أي محاولات إرسال.",
  "No employee records are available.": "لا توجد سجلات موظفين متاحة.",
  "No expense reports are available.": "لا توجد تقارير مصروفات متاحة.",
  "No geofence or idle events yet.":
    "لا توجد أحداث نطاق جغرافي أو خمول حتى الآن.",
  "No integration API keys have been issued.": "لم تصدر مفاتيح API للتكاملات.",
  "No leave requests are available.": "لا توجد طلبات إجازة متاحة.",
  "No outbound webhook endpoints are enabled.":
    "لا توجد نقاط webhook صادرة مفعلة.",
  "No planned calls assigned for today.": "لا توجد زيارات مخططة مخصصة لليوم.",
  "No specialized terms have been configured for this tenant.":
    "لم يتم إعداد مصطلحات متخصصة لهذا العميل.",
  "No tenants provisioned yet": "لم يتم تجهيز أي عميل حتى الآن",
  "No territories defined.": "لا توجد مناطق محددة.",
  Objective: "الهدف",
  "Open opportunities": "الفرص المفتوحة",
  "Optimize route": "تحسين المسار",
  "Optimized stop sequence": "تسلسل المحطات المحسّن",
  "Optional per-task overrides": "تجاوزات اختيارية لكل مهمة",
  Organization: "المنظمة",
  Other: "أخرى",
  "Parent of": "أصل لـ",
  "Part 11-style controls": "ضوابط بأسلوب Part 11",
  Password: "كلمة المرور",
  Pause: "إيقاف مؤقت",
  "Payroll export": "تصدير الرواتب",
  Pending: "قيد الانتظار",
  "People operations": "عمليات الأفراد",
  "Personal leave": "إجازة شخصية",
  Pharmacy: "صيدلية",
  "Platform registry": "سجل المنصة",
  Prefix: "بادئة",
  "Product / lot": "المنتج / التشغيلة",
  "Products discussed": "المنتجات التي نوقشت",
  Profile: "الملف الشخصي",
  "Propose a controlled change": "اقترح تغييراً مضبوطاً",
  "Provision tenant": "تجهيز عميل",
  "Public HTTPS URL": "رابط HTTPS عام",
  Qualification: "تأهيل",
  Reactivate: "إعادة التفعيل",
  "Reading tenant directory…": "جارٍ قراءة دليل العملاء…",
  Reason: "السبب",
  "Recent geofence & idle events": "أحداث النطاق الجغرافي والخمول الأخيرة",
  "Recent immutable system evidence": "أدلة النظام غير القابلة للتعديل الأخيرة",
  "Recent visits": "الزيارات الأخيرة",
  "Record scorecard": "تسجيل بطاقة تقييم",
  "Record shown": "تم تسجيل العرض",
  "Record visit": "تسجيل الزيارة",
  "Refers to": "يشير إلى",
  "Refresh priorities to rank current accounts.":
    "حدّث الأولويات لترتيب الحسابات الحالية.",
  Region: "المنطقة",
  "Register controlled endpoint": "تسجيل نقطة نهاية مضبوطة",
  "Register outbound webhook": "تسجيل webhook صادر",
  Regulated: "منظم",
  Reject: "رفض",
  Reload: "إعادة تحميل",
  Reopen: "إعادة فتح",
  "Reorder amount": "كمية إعادة الطلب",
  "Rep ID": "معرّف المندوب",
  "Rep field workspace": "مساحة عمل المندوب الميدانية",
  "Rep intelligence": "ذكاء المندوب",
  "Rep user ID": "معرّف مستخدم المندوب",
  "Request leave": "طلب إجازة",
  "Required for sensitive data": "مطلوب للبيانات الحساسة",
  Resolve: "حل",
  "Restricted area": "منطقة مقيّدة",
  Resume: "استئناف",
  Retire: "إيقاف",
  "Reviewable assistance": "مساعدة قابلة للمراجعة",
  "Reviewable draft": "مسودة قابلة للمراجعة",
  Revoke: "إلغاء",
  Role: "الدور",
  "Route date": "تاريخ المسار",
  "Route exceptions": "استثناءات المسار",
  "Routing operations": "عمليات التوجيه",
  "Routing policy": "سياسة التوجيه",
  "Run now": "تشغيل الآن",
  Sample: "عينة",
  "Sample inventory": "مخزون العينات",
  "Sample mentions": "إشارات العينات",
  "Save campaign draft": "حفظ مسودة الحملة",
  "Save changes": "حفظ التغييرات",
  "Save contact": "حفظ جهة الاتصال",
  "Save for review": "حفظ للمراجعة",
  "Save geofence": "حفظ النطاق الجغرافي",
  "Save password": "حفظ كلمة المرور",
  "Save record": "حفظ السجل",
  "Save routing policy": "حفظ سياسة التوجيه",
  "Save segment": "حفظ الشريحة",
  Scopes: "النطاقات",
  "Select account": "اختر حساباً",
  "Select an HCP": "اختر مقدم رعاية",
  "Self-hosted OSRM": "OSRM مستضاف ذاتياً",
  "Self-hosted gateway": "بوابة مستضافة ذاتياً",
  Share: "مشاركة",
  "Sick leave": "إجازة مرضية",
  Signed: "موقّع",
  Signer: "الموقّع",
  "Specialized terminology": "مصطلحات متخصصة",
  "Stage audience": "تجهيز الجمهور",
  Standard: "قياسي",
  Starter: "مبتدئ",
  "Stop shift": "إيقاف الوردية",
  Subject: "الموضوع",
  Submit: "إرسال",
  "Submit expense": "إرسال مصروف",
  "Submit request": "إرسال الطلب",
  Supplies: "مستلزمات",
  Suspend: "تعليق",
  Team: "الفريق",
  "Tenant language governance": "حوكمة لغة العميل",
  "Tenant model control center": "مركز التحكم بنموذج العميل",
  "Tenant-scoped governance": "حوكمة محددة بنطاق العميل",
  "Tenant-scoped records": "سجلات محددة بنطاق العميل",
  "Tenant-scoped workforce": "قوة عاملة محددة بنطاق العميل",
  Territory: "المنطقة",
  "Territory management": "إدارة المناطق",
  "Test delivery": "اختبار الإرسال",
  "This week’s priorities": "أولويات هذا الأسبوع",
  Tier: "الفئة",
  Time: "الوقت",
  "Today’s route": "مسار اليوم",
  "Tracking status": "حالة التتبع",
  Travel: "سفر",
  "Trip history & mileage": "سجل الرحلات والمسافة",
  "Trip idle evidence": "دليل خمول الرحلة",
  Type: "النوع",
  Unpaid: "غير مدفوع",
  "Unpaid leave": "إجازة غير مدفوعة",
  "Usage analytics": "تحليلات الاستخدام",
  "Validated workflow change control": "ضبط تغيير سير العمل المتحقق",
  "Verify location & check in": "تحقق من الموقع وسجل الحضور",
  "Versioned API credentials": "بيانات اعتماد API ذات إصدارات",
  "Video detail aid": "وسيلة إيضاح فيديو",
  View: "عرض",
  Visit: "زيارة",
  "Visit and planned activity": "الزيارة والنشاط المخطط",
  When: "متى",
  "Who can access what": "من يمكنه الوصول إلى ماذا",
  Won: "رابحة",
  "Your current role cannot open this module.":
    "دورك الحالي لا يمكنه فتح هذه الوحدة.",
  active: "نشط",
  archived: "مؤرشف",
  draft: "مسودة",
  superseded: "تم استبداله",
  submitted: "مُرسل",
  approved: "معتمد",
  rejected: "مرفوض",
  cancelled: "ملغي",
  ordered: "تم الطلب",
  received: "تم الاستلام",
  open: "مفتوح",
  acknowledged: "تم الإقرار",
  resolved: "تم الحل",
  dismissed: "تم التجاهل",
  reopened: "أعيد فتحه",
  qualification: "تأهيل",
  discovery: "استكشاف",
  proposal: "عرض",
  negotiation: "تفاوض",
  won: "رابحة",
  lost: "خاسرة",
  annual: "سنوية",
  sick: "مرضية",
  personal: "شخصية",
  unpaid: "غير مدفوعة",
  travel: "سفر",
  lodging: "إقامة",
  meals: "وجبات",
  mileage: "مسافة",
  supplies: "مستلزمات",
  other: "أخرى",
  receipt: "استلام",
  issue: "صرف",
  "transfer in": "تحويل وارد",
  "transfer out": "تحويل صادر",
  return: "إرجاع",
  adjustment: "تسوية",
  "Control Plane": "منصة التحكم",
  Workspace: "مساحة العمل",
  "Rep Tools": "أدوات المندوب",
  "My Field Day": "يومي الميداني",
  "Call Assistant": "مساعد الزيارة",
  People: "الأفراد",
  "ERP / HR": "ERP / الموارد البشرية",
  Engagement: "التفاعل",
  "Marketing & CLM": "التسويق وCLM",
  Intelligence: "الذكاء",
  "Analytics & Alerts": "التحليلات والتنبيهات",
  Routing: "التوجيه",
  "Daily Routes": "المسارات اليومية",
  Operations: "العمليات",
  "Core CRM": "إدارة العملاء الأساسية",
  "Accounts & HCPs": "الحسابات ومقدمو الرعاية",
  "Territories & Plans": "المناطق والخطط",
  "Manage Territories": "إدارة المناطق",
  "Cycle Planner": "مخطط الدورة",
  "Opportunity Pipeline": "مسار الفرص",
  "Employee Directory": "دليل الموظفين",
  "Visit Logs": "سجلات الزيارات",
  "Log Visit": "تسجيل زيارة",
  "Sample Transactions": "معاملات العينات",
  "E-Signatures": "التوقيعات الإلكترونية",
  Governance: "الحوكمة",
  Integrations: "التكاملات",
  Terminology: "المصطلحات",
  "PharmaFlow / Tenant": "PharmaFlow / العميل",
  "CRM account universe": "دليل حسابات إدارة العملاء",
  "Accounts & HCP directory": "دليل الحسابات ومقدمو الرعاية",
  "Connected to server · sync ready": "متصل بالخادم · المزامنة جاهزة",
  "Syncing data with server…": "جارٍ مزامنة البيانات مع الخادم…",
  "Offline · data is protected in this device queue":
    "غير متصل · البيانات محفوظة في قائمة انتظار هذا الجهاز",
  "Connection restored · checking server…":
    "تمت استعادة الاتصال · جارٍ فحص الخادم…",
  "Server unreachable · queued data is protected":
    "الخادم غير متاح · البيانات في قائمة الانتظار محفوظة",
  "No visit data is waiting to sync.": "لا توجد بيانات زيارة بانتظار المزامنة.",
  "{count} visit record(s) waiting to sync.":
    "هناك {count} سجل زيارة بانتظار المزامنة.",
  "Network connection restored. Queued data is ready to sync.":
    "تمت استعادة اتصال الشبكة. البيانات في قائمة الانتظار جاهزة للمزامنة.",
  "Network connection lost. New visit data will be saved safely for later sync.":
    "فُقد اتصال الشبكة. ستُحفظ بيانات الزيارة الجديدة بأمان للمزامنة لاحقاً.",
  "Offline: visit saved to the browser queue for later sync.":
    "غير متصل: حُفظت الزيارة في قائمة انتظار المتصفح للمزامنة لاحقاً.",
  "Network connection lost. Your visit was saved for later sync.":
    "فُقد اتصال الشبكة. حُفظت زيارتك للمزامنة لاحقاً.",
  "Server is unreachable. Your visit was saved and will remain queued until retry.":
    "الخادم غير متاح. حُفظت زيارتك وستبقى في قائمة الانتظار حتى إعادة المحاولة.",
  "Unable to sync visit.": "تعذر مزامنة الزيارة.",
  "Network connection is still unavailable. Queued data remains protected.":
    "اتصال الشبكة لا يزال غير متاح. البيانات في قائمة الانتظار محفوظة.",
  "All queued visit data is now synced.":
    "تمت الآن مزامنة جميع بيانات الزيارات في قائمة الانتظار.",
  "Retry sync": "إعادة محاولة المزامنة",
  Attempts: "المحاولات",
  "Last failure": "آخر فشل",
  "Sync queued visits": "مزامنة الزيارات في قائمة الانتظار",
  "Manage HCPs, doctors, pharmacies, hospitals, distributors, and organizations inside the active tenant boundary.":
    "أدر مقدمي الرعاية والأطباء والصيدليات والمستشفيات والموزعين والمنظمات ضمن حدود العميل النشط.",
});
type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: keyof typeof dictionary.en) => string;
  tr: (english: string) => string;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("pharmaflow-language") === "ar" ? "ar" : "en"
  );
  const originals = useRef(new WeakMap<Text, string>());
  const auth = trpc.auth.me.useQuery();
  const terminology = trpc.terminology.list.useQuery(undefined, {
    enabled: Boolean(auth.data),
    retry: false,
  });
  const termOverrides = useMemo(
    () =>
      new Map(
        (terminology.data ?? []).flatMap(term => [
          [term.termKey, term.arabicTerm],
          [term.englishTerm, term.arabicTerm],
        ])
      ),
    [terminology.data]
  );
  const resolve = (english: string) =>
    language === "ar"
      ? (termOverrides.get(english) ?? arabicStrings[english] ?? english)
      : english;
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    localStorage.setItem("pharmaflow-language", language);
  }, [language]);
  useEffect(() => {
    const translateTree = () => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const parent = node.parentElement;
        if (
          !parent ||
          ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName) ||
          parent.closest("[data-i18n-dynamic]")
        )
          continue;
        const original = originals.current.get(node) ?? node.textContent ?? "";
        if (!original.trim()) continue;
        if (!originals.current.has(node)) originals.current.set(node, original);
        const translated = resolve(original);
        if (node.textContent !== translated) node.textContent = translated;
      }
      document
        .querySelectorAll<
          HTMLInputElement | HTMLTextAreaElement
        >("input[placeholder], textarea[placeholder]")
        .forEach(element => {
          const original =
            element.dataset.pharmaflowPlaceholder ?? element.placeholder;
          element.dataset.pharmaflowPlaceholder = original;
          element.placeholder = resolve(original);
        });
    };
    translateTree();
    const observer = new MutationObserver(translateTree);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [language]);
  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage: () =>
          setLanguage(current => (current === "en" ? "ar" : "en")),
        t: key => dictionary[language][key],
        tr: resolve,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
