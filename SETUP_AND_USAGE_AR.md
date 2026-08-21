# دليل الإعداد والتشغيل والاستخدام — PharmaFlow CRM/ERP

**الإصدار المرجعي:** 1.0.0  
**نوع النشر:** ذاتي الاستضافة (Self-hosted) على VPS أو بيئة داخلية  
**قاعدة البيانات التشغيلية المستهدفة:** MySQL 8.4 فقط  
**اللغة:** العربية، مع واجهة عربية/إنجليزية ودعم RTL

> هذا الدليل يشرح الإعداد المحلي والإنتاجي، تهيئة أول مشرف، استخدام الوحدات الرئيسية، والإجراءات التشغيلية الآمنة. لا يشكل الدليل شهادة امتثال تنظيمية أو بديلاً عن إجراءات العميل المعتمدة الخاصة بالتحقق والنسخ الاحتياطي والأمن.

## 1. ما الذي يشغله النظام؟

PharmaFlow منصة متعددة العملاء لإدارة علاقات العملاء والعمليات الميدانية والموارد البشرية والامتثال. تجمع المنصة بين واجهة React، وخادم Node.js/Express مع tRPC، وقاعدة MySQL، وتعمل من خلال Docker Compose خلف Nginx. لا تُعرّض MySQL مباشرة إلى الإنترنت؛ المنفذ العام مخصص لـ Nginx فقط.

| المكوّن          | التقنية                               | الوظيفة                                                         |
| ---------------- | ------------------------------------- | --------------------------------------------------------------- |
| الواجهة والخادم  | React 19 + Node.js/Express + tRPC     | شاشات الإدارة، منطق الأعمال، التحقق من الصلاحيات، وواجهات API.  |
| قاعدة البيانات   | MySQL 8.4                             | بيانات العملاء، العمليات، السجلات التنظيمية، وسجل التدقيق.      |
| ORM والمخططات    | Drizzle ORM                           | تعريف schema، migrations، والفهارس.                             |
| المصادقة         | JWT محلي                              | تسجيل دخول محلي بكلمات مرور مشفرة `scrypt` وجلسات لمدة 8 ساعات. |
| الوكيل العكسي    | Nginx                                 | توجيه HTTP، headers أمنية، حدود body، وrate limiting طرفي.      |
| التوجيه الجغرافي | OSRM ذاتي الاستضافة                   | تحسين المسارات، مع fallback Haversine عند عدم توفر OSRM.        |
| الذكاء الاصطناعي | OpenAI/Anthropic/Gemini أو local vLLM | اختياري؛ يفعّل فقط بمفاتيح العميل وسياسات tenant.               |

## 2. المتطلبات قبل البدء

| المتطلب                        |                 الحد الأدنى | ملاحظات عملية                                             |
| ------------------------------ | --------------------------: | --------------------------------------------------------- |
| نظام التشغيل                   |        Ubuntu 22.04 أو أحدث | يوصى بـ VPS محدث ومقيد الوصول عبر SSH.                    |
| Docker Engine                  |          حديث مع Compose v2 | مطلوب للنشر الذاتي المتكامل.                              |
| Node.js                        |                        22.x | مطلوب فقط للتطوير المحلي أو تشغيل الاختبارات خارج Docker. |
| pnpm                           |                        10.x | يتم تفعيله عبر Corepack.                                  |
| قاعدة البيانات                 |                   MySQL 8.4 | لا تستخدم PostgreSQL أو PostGIS لهذه المنصة التشغيلية.    |
| DNS وTLS                       |       اسم نطاق وشهادة HTTPS | ضروريان للإنتاج؛ لا تستخدم HTTP كإعداد نهائي.             |
| OpenStreetMap Tiles            | tile service ذاتي الاستضافة | مطلوب إذا كانت خريطة GPS ستستخدم في الإنتاج.              |
| بيانات OSRM                    |        ملف `.osm.pbf` محضّر | مطلوب فقط لتفعيل تحسين المسارات الفعلي.                   |
| GPU + NVIDIA Container Toolkit |                     اختياري | مطلوب فقط عند تشغيل `local-ai` عبر vLLM.                  |

قبل أي نشر إنتاجي، جهّز حساب Linux غير root للتشغيل، فعّل جدار حماية يسمح فقط بـ 80 و443 من الإنترنت وSSH من شبكات الإدارة المعتمدة، واضبط مزامنة وقت الخادم عبر NTP/chrony. لا تحفظ كلمات المرور أو مفاتيح API داخل Git.

## 3. تنزيل المصدر وتجهيز بيئة التطوير

يلزم أن يكون لدى المشغل صلاحية الوصول إلى المستودع الخاص:

```bash
git clone https://github.com/abdobody2040/pharmaflow-crm-erp.git
cd pharmaflow-crm-erp
corepack enable
pnpm install
```

تحقق من نسخ الأدوات قبل التشغيل:

```bash
node --version
pnpm --version
docker compose version
```

### 3.1 تشغيل التطوير المحلي مباشرة

يتطلب هذا المسار MySQL متاحاً ومتغيرات بيئة مصدّرة في جلسة الطرفية. يمكن استخدام MySQL محلي أو قاعدة مخصصة للتطوير؛ لا تستخدم قاعدة إنتاجية لأوامر التطوير أو الاختبارات.

```bash
export DATABASE_URL='mysql://pharmaflow_app:CHANGE_ME@127.0.0.1:3306/pharmaflow'
export JWT_SECRET='استبدل_هذه_القيمة_بسلسلة_عشوائية_لا_تقل_عن_32_حرفاً'
export APP_URL='http://localhost:3000'
export OSRM_BASE_URL='http://127.0.0.1:5000'

pnpm drizzle-kit migrate
pnpm dev
```

بعد ظهور رسالة تشغيل الخادم، افتح `http://localhost:3000`. للتأكد من صحة التغييرات قبل اعتمادها، نفّذ:

```bash
pnpm check
pnpm test
pnpm test:e2e
```

| الأمر                       | الاستخدام                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev`                  | تشغيل بيئة التطوير مع مراقبة التغييرات.                                                                                  |
| `pnpm check`                | فحص TypeScript دون إخراج build.                                                                                          |
| `pnpm test`                 | تشغيل اختبارات Vitest.                                                                                                   |
| `pnpm test:e2e`             | تشغيل Playwright عبر خادم اختبار محلي مؤقت على المنفذ 3200 وسر JWT عشوائي؛ يتضمن fixture ينشئ وينظف tenant/user مصادقين. |
| `pnpm build`                | إنتاج ملفات `dist/` للنشر.                                                                                               |
| `pnpm start`                | تشغيل build إنتاجي موجود في `dist/`.                                                                                     |
| `pnpm drizzle-kit generate` | إنشاء migration بعد تعديل `drizzle/schema.ts`.                                                                           |
| `pnpm drizzle-kit migrate`  | تطبيق migrations المراجعة على قاعدة البيانات المحددة في `DATABASE_URL`.                                                  |

> لا تشغّل `drizzle-kit generate` أو `drizzle-kit migrate` على قاعدة تشغيلية قبل مراجعة ملف SQL الناتج، وأخذ نسخة احتياطية، وتوثيق تغيير الإصدار.

## 4. النشر الذاتي باستخدام Docker Compose

### 4.1 تجهيز ملف البيئة

انسخ القالب الموجود في المشروع ولا ترفعه إلى Git:

```bash
cp deploy/env.template .env
chmod 600 .env
```

عدّل ملف `.env` بالقيم الحقيقية. المثال التالي يوضح المقصود فقط؛ لا تستخدم القيم الافتراضية أو النصوص الواضحة في بيئة حقيقية.

```dotenv
MYSQL_DATABASE=pharmaflow
MYSQL_USER=pharmaflow_app
MYSQL_PASSWORD=ضع_كلمة_مرور_طويلة_وفريدة_هنا
MYSQL_ROOT_PASSWORD=ضع_كلمة_مرور_جذر_مختلفة_وطويلة_هنا
JWT_SECRET=ضع_سراً_عشوائياً_لا_يقل_عن_32_حرفاً

APP_PORT=3000
PUBLIC_HTTP_PORT=80
APP_URL=https://crm.example.com
TRUST_PROXY=true

OSM_TILE_BACKEND=http://tiles:8080/
OSRM_BASE_URL=http://osrm:5000
ROUTING_TIMEOUT_MS=5000
OSRM_DATA_DIR=./osrm-data
OSRM_DATASET=region-latest.osrm

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

AI_LOCAL_MODEL_BASE_URL=http://local-ai:8000
AI_LOCAL_MODEL_API_KEY=
AI_LOCAL_MODEL_MODEL=Qwen/Qwen2.5-7B-Instruct
AI_LOCAL_MODEL_MAX_LEN=8192
HF_TOKEN=
```

| المتغير                        |         مطلوب؟          | الاستخدام                                            |
| ------------------------------ | :---------------------: | ---------------------------------------------------- |
| `MYSQL_DATABASE`               |           نعم           | اسم قاعدة بيانات PharmaFlow.                         |
| `MYSQL_USER` و`MYSQL_PASSWORD` |           نعم           | مستخدم التطبيق وكلمة مروره بأقل صلاحيات ممكنة.       |
| `MYSQL_ROOT_PASSWORD`          |           نعم           | حساب إدارة MySQL؛ لا يستخدمه التطبيق اليومي.         |
| `JWT_SECRET`                   |           نعم           | سر توقيع والتحقق من JWT؛ الحد الأدنى 32 حرفاً.       |
| `APP_URL`                      |       نعم للإنتاج       | رابط HTTPS النهائي للنظام.                           |
| `OSM_TILE_BACKEND`             | نعم عند استخدام الخرائط | عنوان خدمة tiles ذاتية الاستضافة داخل الشبكة الخاصة. |
| `OSRM_*`                       |    مطلوب لتشغيل OSRM    | إعدادات بيانات وخدمة التوجيه الخاصة.                 |
| مفاتيح AI المستضافة            |         اختياري         | مفاتيح يزودها العميل فقط؛ اترك غير المستخدم فارغاً.  |
| إعدادات `AI_LOCAL_*`           |         اختياري         | لمسار vLLM الداخلي على GPU.                          |

أنشئ أسراراً مناسبة، مثلاً:

```bash
openssl rand -base64 48
```

تجنب الرموز الخاصة غير المرمّزة في كلمات مرور قواعد البيانات التي ستظهر داخل `DATABASE_URL`. إن استخدمت رمزاً خاصاً، اجعله URL-encoded عند الحاجة.

### 4.2 بناء وتشغيل الخدمات الأساسية

قبل تشغيل OSRM، أضف قيمة لـ `OSRM_DATASET` حتى يتمكن Compose من تفسير الملف. إذا لم تكن بيانات OSRM محضرة بعد، شغّل الخدمات الأساسية بالاسم لتجنب تشغيل حاوية OSRM غير الجاهزة:

```bash
docker compose up -d --build mysql app nginx
docker compose ps
docker compose logs -f app
```

بعد أن تصبح قاعدة MySQL بحالة healthy، طبّق migrations المراجعة:

```bash
docker compose exec app pnpm drizzle-kit migrate
```

تحقق من الخدمات:

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose logs --tail=100 nginx
```

في إصدار مكتمل البيانات الجغرافية يمكن تشغيل كامل المجموعة:

```bash
docker compose up -d --build
```

### 4.3 تفعيل HTTPS

قالب Nginx المرفق يستمع HTTP ليترك اختيار إدارة الشهادات للمشغل. قبل أي استخدام إنتاجي، ضع TLS في Nginx أو عند حافة شبكية موثوقة، وحوّل HTTP إلى HTTPS، ثم اضبط `APP_URL` على الرابط النهائي مثل `https://crm.example.com` وأعد تشغيل التطبيق.

```bash
docker compose up -d --force-recreate nginx app
```

لا تضع `TRUST_PROXY=true` إلا عندما يكون Nginx المرفق أو proxy موثوق هو المصدر المباشر لترويسات IP الممررة إلى التطبيق.

## 5. إعداد OSRM والخرائط والذكاء الاصطناعي

### 5.1 OSRM للمسارات

ضع ملف OpenStreetMap الإقليمي بصيغة `.osm.pbf` داخل المجلد الذي تشير إليه `OSRM_DATA_DIR`. ثم حضّر البيانات باستخدام نسخة OSRM المطابقة:

```bash
docker run --rm -t -v "$(pwd)/osrm-data:/data" osrm/osrm-backend:v5.27.1 \
  osrm-extract -p /opt/car.lua /data/region-latest.osm.pbf
docker run --rm -t -v "$(pwd)/osrm-data:/data" osrm/osrm-backend:v5.27.1 \
  osrm-partition /data/region-latest.osrm
docker run --rm -t -v "$(pwd)/osrm-data:/data" osrm/osrm-backend:v5.27.1 \
  osrm-customize /data/region-latest.osrm

docker compose up -d osrm
```

اضبط `OSRM_DATASET=region-latest.osrm`. عند عدم توفر OSRM، تستمر المنصة في إرجاع fallback حسابي Haversine للمسارات؛ لا تعتبر هذا بديلاً لتحسين طرق الإنتاج.

### 5.2 خرائط GPS

تطلب شاشة GPS tiles من المسار النسبي `/tiles/{z}/{x}/{y}.png` ويحوّل Nginx الطلب إلى `OSM_TILE_BACKEND`. شغّل tile server تابعاً للمنظمة داخل شبكة خاصة، ثم تحقق من نقطة tile قبل إتاحة الخرائط:

```bash
curl -I https://crm.example.com/tiles/0/0/0.png
```

### 5.3 نموذج محلي خاص اختياري

يلزم VPS مزود GPU وNVIDIA Container Toolkit. اضبط `AI_LOCAL_MODEL_API_KEY` و`AI_LOCAL_MODEL_MODEL`، ثم شغّل profile منفصل:

```bash
docker compose --profile local-ai up -d
docker compose logs -f local-ai
```

يبقى `local-ai` على شبكة Docker الخاصة ولا ينشر منفذاً عاماً. تدفقات tenant المصنفة حساسة تفشل بشكل مغلق عند غياب النموذج المحلي؛ لا تتحول تلقائياً إلى مزود مستضاف.

## 6. تهيئة أول مشرف وإضافة العميل الأول

لا توجد صفحة self-registration عامة، وهو مقصود لمنع إنشاء حسابات غير محكومة. يلزم إنشاء **حساب super_admin أولي** ضمن عملية تشغيل مضبوطة. بعد ذلك، استخدم واجهة **Tenant Management** فقط لإنشاء العملاء وحسابات admin الخاصة بهم.

### 6.1 إنشاء hash لكلمة مرور bootstrap

نفّذ الأمر التالي على جهاز موثوق عليه Node.js 22؛ سيطلب كلمة المرور دون طباعتها وينتج hash فقط:

```bash
read -rsp "Bootstrap password: " BOOTSTRAP_PASSWORD; echo
export BOOTSTRAP_PASSWORD
node --input-type=module <<'NODE'
import { randomBytes, scryptSync } from "node:crypto";
const salt = randomBytes(16).toString("base64url");
const derived = scryptSync(process.env.BOOTSTRAP_PASSWORD, salt, 64).toString("base64url");
console.log(`scrypt$${salt}$${derived}`);
NODE
unset BOOTSTRAP_PASSWORD
```

انسخ الناتج فقط، ثم افتح MySQL تفاعلياً كي لا تُسجل كلمة مرور أو hash في تاريخ أوامر shell:

```bash
docker compose exec mysql mysql -u root -p
```

داخل MySQL، أدخل السجل التالي بعد استبدال القيم بين الأقواس. اترك `tenantId` بقيمة `NULL` لأن هذا حساب منصة عالمي، واستخدم بريد المشغل و`openId` فريدين:

```sql
USE pharmaflow;

INSERT INTO users (
  openId, tenantId, name, email, passwordHash, loginMethod,
  role, status, createdAt, updatedAt, lastSignedIn
) VALUES (
  'local:superadmin:operator@example.com',
  NULL,
  'Platform Operator',
  'operator@example.com',
  'scrypt$REPLACE_WITH_THE_GENERATED_HASH',
  'local_jwt',
  'super_admin',
  'active',
  UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP()
);
```

> هذا bootstrap الاستثنائي يجب أن يسجل في change-control الخاص بالعميل: هوية المشغل، وقت الإنشاء، وسيلة حفظ كلمة المرور، وسبب الإنشاء. لا تستخدم SQL لاحقاً لإدارة العملاء أو الأدوار اليومية؛ استخدم الواجهات والإجراءات المدققة داخل النظام.

### 6.2 تسجيل الدخول وإنشاء tenant

1. افتح رابط التطبيق وسجل دخولاً بالبريد وكلمة مرور super_admin. اترك **Tenant slug** فارغاً لحساب المنصة العالمي.
2. افتح **Tenant Management** من القائمة.
3. اختر إنشاء tenant جديد وأدخل الاسم القانوني، الاسم المعروض، slug فريد، الخطة والمنطقة، وبيانات أول tenant admin.
4. استخدم كلمة مرور admin لا تقل عن 14 حرفاً؛ يجري تشفيرها قبل التخزين.
5. سجل خروجك ثم اختبر دخول tenant admin باستخدام البريد وكلمة المرور و`tenantSlug` الذي تم إنشاؤه.

إنشاء tenant من الواجهة يضيف الشركة والأدوار الافتراضية وأول admin وسجل تدقيق مرتبط بالعملية. لا تجعل اسم النطاق أو subdomain بديلاً عن عزل tenant؛ العزل يفرضه الخادم عبر `tenantId` والصلاحيات.

## 7. الأدوار والصلاحيات التشغيلية

| الدور         | الاستخدام الأساسي                                                                  |
| ------------- | ---------------------------------------------------------------------------------- |
| `super_admin` | إنشاء العملاء، تغيير خطة/حالة tenant، وإدارة المنصة. لا يستخدم لعمليات عميل يومية. |
| `admin`       | إعداد tenant، المستخدمون، الامتثال، المخزون، المستندات، والتكاملات.                |
| `manager`     | خطط العمل، إدارة الحسابات، coaching، الموافقات والتشغيل الميداني وفق الإجراءات.    |
| `rep`         | الوردية، GPS بموافقة، قائمة الزيارات، تسجيل الزيارة والعينات والتوقيع.             |
| `hr`          | الموظفون، الحضور، الإجازات، المصروفات والرواتب ضمن tenant.                         |
| `exec`        | القراءة التنفيذية ولوحات BI والتقارير وفق الصلاحيات.                               |

لا تمنح حساباً أكثر من الدور المطلوب. عند مغادرة موظف أو تعليق عميل، غيّر الحالة إلى `archived` أو `suspended` من الواجهة بدلاً من حذف السجلات.

## 8. دليل الاستخدام اليومي حسب الوحدة

### 8.1 CRM وCustomer 360

ابدأ من **Accounts & HCPs** لإنشاء أو مراجعة حسابات HCP والصيدليات والمستشفيات. افتح صفحة الحساب للحصول على Customer 360 الذي يجمع جهات الاتصال والزيارات والفرص والإشارات التجارية والعلاقات `affiliations`. استخدم العلاقات فقط عندما يكون لديك مصدر تجاري أو تشغيلي موثق، وحدد تاريخ البداية والنهاية عند انتهاء العلاقة بدلاً من حذفها.

يستخدم المدير **Territories & Plans** و**Cycle Planner** لتحديد زيارات المندوبين وأولوياتهم. لا تكتب البيانات التنظيمية مباشرة في قاعدة البيانات؛ يجب أن تمر الزيارات والعينات والتواقيع عبر إجراءات التطبيق المدققة.

### 8.2 تطبيق المندوب والـ GPS

1. يسجل المندوب الدخول بحسابه وtenant slug الصحيح.
2. يقرأ شاشة الموافقة على التتبع قبل منح صلاحية الموقع.
3. يبدأ الوردية؛ يظهر أن التتبع نشط.
4. يجمع التطبيق الموقع أثناء الوردية/المسار النشط فقط، وليس طوال اليوم.
5. يتوقف التتبع فور اختيار **Stop Shift/Route**.
6. يسجل المندوب الزيارة والمنتجات والعينات والخطوات التالية، ثم يوقّع عند الحاجة بإجراء صريح وكلمة مرور صحيحة.

يستخدم النظام interval أساسي 60 ثانية، ويجوز له تقليله قرب محطة زيارة مخططة لتحسين geofencing. لا تعتمد تشغيل الخلفية على جهاز فعلي قبل إجراء اختبارات Android/iOS المناسبة في بيئة العميل.

### 8.3 الحضور والموارد البشرية

يمكن للحضور أن يتسجل تلقائياً من ping GPS المقبول داخل geofence المكتب أو المنطقة وفق السياسة. يقدم الموظف طلب إجازة أو مصروفات من وحدة HR، ويجري المدير/HR المراجعة عبر حالات workflow. لا تحذف طلباً أو مصروفاً؛ استخدم حالة الإلغاء أو الرفض مع الملاحظة المطلوبة.

### 8.4 المخزون العام والعينات

تُدار **العينات المنظمة** من سجل chain-of-custody المخصص. أما **Warehouse Inventory** فهو مخزون عام مستقل يتضمن:

| الإجراء         | الاستخدام الصحيح                                                                        |
| --------------- | --------------------------------------------------------------------------------------- |
| إنشاء Site      | عرّف المستودع/المكتب/المركبة أو المخزون الميداني بكود فريد داخل tenant.                 |
| Append movement | سجل receipt أو issue أو transfer أو return أو adjustment مع كمية موجبة/سالبة وسبب واضح. |
| Balances        | راجع الأرصدة المحسوبة من دفتر الحركات؛ لا تعدل الرصيد مباشرة.                           |
| Reorder level   | حدد الحد الأدنى وكمية إعادة الطلب لكل site ومنتج.                                       |

دفتر المخزون **append-only**. إذا سُجلت حركة خاطئة، أنشئ حركة تعويضية جديدة مرتبطة بالسبب؛ لا تعدل أو تحذف الحركة الأصلية.

### 8.5 Coaching: ride-along وscorecards

يقوم المدير بجدولة ride-along لمندوب نشط، ثم يضيف ملاحظة إكمال بعد الجلسة. يمكنه إنشاء scorecard بدرجات التحضير ومعرفة المنتج وجودة الزيارة والامتثال والمتابعة. يستطيع المندوب رؤية سجلاته والإقرار بها، لكنه لا يملك إنشاء أو تعديل تقييم المدير.

### 8.6 سجل المستندات

استخدم **Document Register** للـ SOPs والسياسات والعقود والمستندات التشغيلية، وليس لتقديم محتوى CLM. سجّل رقم المستند والعنوان وstorage key واسم الملف وMIME والتصنيف وتاريخ الاحتفاظ. عند إصدار نسخة جديدة، اختر **New version** بدلاً من استبدال الملف أو حذف السجل القديم. فعّل النسخة المعتمدة فقط بعد المراجعة، ثم تحوّل النسخة النشطة السابقة إلى `superseded` كأثر محفوظ.

هذا MVP يسجل metadata و`fileKey`. تكامل رفع الملف الفعلي وvirus scanning وlegal hold يحتاجان إجراءات تشغيلية/تطوير لاحقة قبل الاعتماد التنظيمي الكامل.

### 8.7 التوقيع الإلكتروني والامتثال

يتطلب التوقيع الإلكتروني ثلاثة عناصر: credential صحيح، اختيار المعنى (`authorship` أو `approval` أو `review` أو `attestation`)، وإجراء توقيع صريح. عند النجاح يحتفظ النظام بتوقيت الخادم وhash ربط للسجل وسجل تدقيق. لا تشارك كلمة مرورك أو تستخدم حساباً مشتركاً.

التصحيح في السجلات المنظمة يتم عبر record جديد superseding أو compensating مع reason-for-change؛ لا توجد مسارات تحديث أو حذف للسجلات التنظيمية في الواجهة.

### 8.8 التكاملات: API keys وwebhooks

تُدار صفحة **Integrations** بواسطة tenant admin فقط.

1. أنشئ مفتاح API `v1` باسم واضح واختر أقل scope مطلوب.
2. انسخ المفتاح فور ظهوره؛ النظام يخزن hash وprefix فقط ولا يمكن استرجاع السر لاحقاً.
3. سجّل webhook بعنوان HTTPS عام فقط ومن دون credentials داخل URL.
4. حدد event type واحداً أو أكثر، ثم استخدم test delivery فقط نحو endpoint تملكه وتراقبه.
5. راقب سجل delivery الذي يحتفظ بحالة الإرسال ورمز HTTP والمدة وhash payload، لا payload الخام.
6. أوقف أو ألغِ المفتاح/endpoint عند تغيير التكامل أو الاشتباه بالتعرض.

الـ webhook MVP لا يقدم OAuth أو retries أو dead-letter queue. لا تربط endpoint داخلياً أو بعنوان `localhost` أو IP خاص، ولا تستخدم test delivery ضد أنظمة إنتاجية غير متوقعة.

### 8.9 اللغة العربية والإنجليزية

استخدم قائمة الملف الشخصي لتبديل العربية والإنجليزية. عند اختيار العربية، يضبط النظام `lang="ar"` و`dir="rtl"` ويحفظ الاختيار في المتصفح. تشمل الترجمة المشتركة عناصر shell والمخزون والمستندات وcoaching ورسائل أخطاء رئيسية؛ يجب مراجعة المصطلحات الخاصة بالعميل من صفحة **Terminology** بواسطة admin أو manager.

## 9. إجراءات التشغيل والصيانة

### 9.1 تطبيق إصدار جديد

نفذ العملية ضمن نافذة تغيير معتمدة وبعد نسخة احتياطية قابلة للاستعادة:

```bash
git pull
docker compose build app
docker compose run --rm app pnpm check
docker compose run --rm app pnpm test
docker compose run --rm app pnpm drizzle-kit migrate
docker compose up -d app nginx
docker compose ps
```

راجع ملفات SQL في `drizzle/` قبل تطبيقها. لا تستخدم `git reset --hard` على VPS التشغيل؛ استخدم release/checkpoint أو rollback معتمد.

### 9.2 النسخ الاحتياطي والاستعادة

احتفظ بنسخ MySQL مشفرة خارج الـ VPS واختبر الاستعادة دورياً في بيئة منفصلة. مثال تصدير يدوي؛ عدّل الاسم والوجهة وفق سياسة العميل:

```bash
mkdir -p backups
docker compose exec -T mysql sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" \
  --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  > "backups/pharmaflow-$(date -u +%Y%m%dT%H%M%SZ).sql"
```

لا تنفذ استعادة على قاعدة إنتاجية حية. اختبر الاستعادة على قاعدة منفصلة ووثق الوقت والنتيجة ونسخة image واسم المشغل. هذا الدليل لا يدعي تنفيذ drill فعلياً.

### 9.3 مراقبة الخدمات والسجلات

```bash
docker compose ps
docker compose logs --tail=200 app
docker compose logs --tail=200 mysql
docker compose logs --tail=200 nginx
docker stats
```

راقب مساحة volume `mysql_data`، استخدام الذاكرة، أخطاء 5xx، وحالة MySQL healthcheck. راقب كذلك NTP على المضيف وسجل نتيجة الفحص ضمن أدلة التشغيل المنظمة.

### 9.4 التحقق من حواجز السجلات غير القابلة للتعديل

بعد migration على MySQL الإنتاجي، راجع triggers قبل go-live:

```bash
docker compose exec mysql mysql -u root -p -e \
  "USE ${MYSQL_DATABASE}; SHOW TRIGGERS;"
```

يجب أن تظهر حواجز `BEFORE UPDATE` و`BEFORE DELETE` للجداول المنظمة مثل `auditEvents` و`visitLogs` و`sampleTransactions` و`electronicSignatures`. نفذ أي اختبار سلبي فقط على tenant وسجلات تجريبية غير منظمة، ولا تلمس بيانات تشغيلية حية.

## 10. استكشاف الأخطاء الشائعة

| العرض                                            | سبب محتمل                                                 | الإجراء الآمن                                                                  |
| ------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| فشل تسجيل الدخول                                 | tenant slug خاطئ أو حساب غير نشط أو كلمة مرور خاطئة.      | تحقق من tenant slug والحالة؛ لا تعدل hash يدوياً إلا ضمن bootstrap مضبوط.      |
| `JWT_SECRET must contain at least 32 characters` | السر قصير أو غير محمّل داخل الحاوية.                      | حدّث `.env` بقيمة طويلة ثم أعد إنشاء app.                                      |
| التطبيق لا يتصل بقاعدة البيانات                  | MySQL لم تصبح healthy أو credentials غير متطابقة.         | افحص `docker compose ps` وlogs، وتحقق من قيم MySQL في `.env`.                  |
| OSRM لا يحسن المسار                              | البيانات غير محضرة أو dataset غير موجود.                  | راجع ملف `.osm.pbf` وخطوات extract/partition/customize ثم logs الخاصة بـ osrm. |
| خريطة GPS بلا tiles                              | `OSM_TILE_BACKEND` غير متاح أو TLS/proxy غير صحيح.        | اختبر `/tiles/0/0/0.png` من المتصفح وNginx logs.                               |
| رفض webhook                                      | URL ليس HTTPS عاماً، endpoint paused، أو event غير مسموح. | صحح URL/الحالة/event، ثم راجع delivery log؛ لا تعطل الحواجز.                   |
| لا يمكن استرجاع API key                          | هذا سلوك مقصود؛ يخزن hash فقط.                            | أنشئ مفتاحاً جديداً ثم ألغِ المفتاح القديم.                                    |
| migration فاشلة                                  | SQL لم يُراجع أو قاعدة البيانات ليست الحالة المتوقعة.     | أوقف النشر، خذ backup، راجع migration وschema، ثم نفذ تغييراً مضبوطاً.         |

## 11. قائمة قبول قبل الاستخدام الإنتاجي

| بند             | التحقق المطلوب                                                           |
| --------------- | ------------------------------------------------------------------------ |
| الأسرار         | ملف `.env` خارج Git، صلاحياته `600`، وسر JWT طويل وفريد.                 |
| TLS             | HTTPS فعّال، HTTP يعاد توجيهه، و`APP_URL` صحيح.                          |
| قاعدة البيانات  | MySQL healthy، migrations مطبقة، وtriggers المنظمة مفعلة ومراجعة.        |
| التحقق البرمجي  | `pnpm check` و`pnpm test` ينجحان على الإصدار المرشح.                     |
| العزل           | اختبار tenant admin وtenant user على tenant تجريبي منفصل.                |
| النسخ الاحتياطي | backup مشفر وrestore test موثق على بيئة منفصلة.                          |
| NTP             | فحص مزامنة الوقت بالمضيف موثق.                                           |
| الخرائط/OSRM    | tile backend وOSRM مختبران إذا كانت هذه الوحدات مفعلة.                   |
| AI              | مفاتيح العميل وسياسات tenant المراجعة فقط؛ لا تستخدم provider غير معتمد. |
| التكاملات       | API keys أقل صلاحيات، webhook URLs عامة ومملوكة، وخطة إلغاء/تدوير.       |
| الأمن           | DAST/SCA أو مراجعة أمنية خارجية قبل إطلاق منظم أو متعدد العقد.           |

## 12. حدود معروفة وخطوات موصى بها لاحقاً

المشروع يغطي المتطلبات المحلية التي يمكن التحقق منها، لكنه لا يدعي نتائج غير منفذة. قبل إطلاق منظم أو توسيع متعدد العقد، نفذ benchmark فعلياً على MySQL staging، وDAST/SCA، واختبارات Android/iOS الفعلية، وbackup/restore drill، وقياس NTP drift. يوصى أيضاً بإضافة OAuth وkey rotation وwebhook retries/dead-letter queue قبل ربط التكاملات الحرجة، وإضافة legal hold وvirus scanning قبل اعتماد مستندات تنظيمية حساسة.
