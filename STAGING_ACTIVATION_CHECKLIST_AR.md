# قائمة تفعيل Staging — PharmaFlow CRM/ERP

> **حالة الوثيقة:** جاهزة للتنفيذ عند توفر VPS وMySQL 8.4 ورابط HTTPS غير إنتاجي. لا تشغّل أي أمر هنا على بيانات عميل أو إنتاج. استخدم tenant وusers وdatabase تحمل لاحقة `staging` أو `benchmark` فقط.

## 1. بوابة البدء والتهيئة

نفّذ هذه الخطوات من نسخة الكود التي ستُختبر، ثم سجّل commit hash واسم المشغل ووقت البدء في تذكرة التحقق.

```bash
git clone https://github.com/abdobody2040/pharmaflow-crm-erp.git
cd pharmaflow-crm-erp
git rev-parse HEAD
pnpm install --frozen-lockfile
pnpm check
pnpm test
```

أنشئ ملف `.env` غير متتبع بالقيم المناسبة للبيئة. الحد الأدنى المطابق لـ`docker-compose.yml` هو: `MYSQL_DATABASE` و`MYSQL_USER` و`MYSQL_PASSWORD` و`MYSQL_ROOT_PASSWORD` و`JWT_SECRET` بطول 32 حرفاً أو أكثر و`OSRM_DATASET` و`OSM_TILE_BACKEND` و`APP_URL`. اضبط `TRUST_PROXY=true` خلف Nginx فقط، واستخدم `APP_URL=https://<staging-host>`.

```bash
openssl rand -base64 48
docker compose config
docker compose up -d --build
docker compose ps
curl -fsSI "https://<staging-host>/"
```

**قبول:** HTTPS صالح، CSP الإنتاجي لا يحوي `unsafe-eval`، وواجهة التطبيق و`/api/trpc` متاحتان. لا تضع أسراراً في shell history أو في ملفات Git.

## 2. بيانات اختبار disposable وحسابات الأدوار

أنشئ tenant اختباراً وحساباً نشطاً لكل دور: `rep` و`manager` و`admin` و`hr` و`exec` و`super_admin`. استخدم عناوين `@e2e.invalid` وكلمات مرور عشوائية. شغّل fixture المصادق بعد ضبط سر JWT صالح:

```bash
export E2E_BASE_URL="https://<staging-host>"
pnpm exec playwright test e2e/authenticated.spec.ts
pnpm exec playwright test
```

**قبول:** fixture ينشئ tenant ومستخدم admin مؤقتين ويزيلهما في `finally`. احتفظ بسجل حسابات DAST منفصل عن fixture كي لا تتعارض أدوات الفحص مع تنظيف الاختبار.

## 3. Benchmark وEXPLAIN

شغّل harness غير المدمر على قاعدة مخصصة، ثم احفظ JSON ونسخ EXPLAIN ونسخة قاعدة البيانات. لا تنسب أي latency قبل حفظ الناتج الفعلي.

```bash
export DATABASE_URL='mysql://<user>:<password>@<mysql-host>:3306/pharmaflow_benchmark'
export BENCHMARK_TENANT_COUNT=2
export BENCHMARK_ACCOUNTS_PER_TENANT=25000
export BENCHMARK_VISITS_PER_TENANT=50000
export BENCHMARK_GPS_PINGS_PER_TENANT=100000
node scripts/benchmark.mjs | tee evidence/benchmark-$(date -u +%Y%m%dT%H%M%SZ).log
```

نفّذ `EXPLAIN ANALYZE` من عميل MySQL على مسارات CRM وGPS وBI التي يظهرها harness، واحفظ الخطط وlatency المئوي p50/p95/p99. إذا تجاوز أي استعلام SLO المعتمد، أضف فهرساً موثقاً وأعد القياس قبل اتخاذ قرار سعة VPS.

## 4. NTP وتدقيق التوقيت

```bash
timedatectl status
chronyc tracking || true
chronyc sources -v || true
docker compose exec app date -u +'%Y-%m-%dT%H:%M:%SZ'
```

بعد الالتقاط، نفّذ توقيعاً إلكترونياً disposable ثم قارن وقت audit وsignature مع وقت المضيف UTC. **قبول:** host synchronized وoffset داخل حد العميل المعتمد؛ خلاف ذلك افتح deviation ولا تعتمد أدلة الوقت المتأثرة.

## 5. النسخ الاحتياطي والاستعادة

حدد الحاوية والقاعدة أولاً. يستخدم المثال بيانات حاوية MySQL ولا يطبع كلمة المرور على المضيف.

```bash
export BACKUP_NAME="pharmaflow-staging-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
docker compose exec -T mysql sh -lc \
  'mysqldump --single-transaction --routines --triggers --set-gtid-purged=OFF \
   -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip -9 > "evidence/$BACKUP_NAME"
sha256sum "evidence/$BACKUP_NAME" | tee "evidence/$BACKUP_NAME.sha256"
```

استعد فقط في قاعدة فارغة مستقلة مثل `pharmaflow_restore_staging` بعد إنشائها ومراجعة اسمها:

```bash
gunzip -c "evidence/$BACKUP_NAME" \
  | docker compose exec -T mysql sh -lc \
    'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" pharmaflow_restore_staging'
docker compose exec -T mysql sh -lc \
  'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SHOW TRIGGERS FROM pharmaflow_restore_staging"'
```

**قبول:** checksum سليم، restore بلا أخطاء، schema/triggers/row counts متوافقة، وتجارب UPDATE/DELETE السلبية على سجلات disposable منظمة مرفوضة أو تسجل دليلاً مطابقاً.

## 6. DAST مصادق

استخدم OWASP ZAP أو Burp مع نطاق مكتوب وموافقة ومسار rollback. لا تضع scanner ضد production ولا ترفع concurrency فوق ما يوافق عليه مشغل staging.

```bash
export STAGING_URL="https://<staging-host>"
mkdir -p evidence/dast
# مثال ZAP baseline غير مصادق؛ أضف session script وحسابات disposable لمسح المصادقة الكامل.
docker run --rm -t -v "$PWD/evidence/dast:/zap/wrk/:rw" \
  ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t "$STAGING_URL" -r baseline-report.html
```

للمسح المصادق، غطّ أدوار `rep/manager/admin/hr/exec/super_admin` وعمليات tRPC وZod malformed inputs وcross-tenant identifiers وwebhook SSRF وrate limits. صنّف كل finding، وأعد الاختبار بعد الإصلاح.

## 7. Rate limit موزع وreverse proxy

هذه التجربة تتطلب مثيلين تطبيق على الأقل وstore مشترك للحدود قبل توسيع النظام أفقياً. الإصدار الحالي in-memory مناسب لمثيل VPS واحد فقط.

```bash
for i in $(seq 1 80); do
  curl -sS -o /dev/null -w '%{http_code} %{header_json}\n' \
    "$STAGING_URL/api/trpc/auth.me?batch=1";
done | tee evidence/rate-limit-$(date -u +%Y%m%dT%H%M%SZ).log
```

**قبول:** لا يمكن تجاوز الحد بالتناوب بين المثيلات؛ يظهر `429` و`RateLimit-*` ثم تعود الطلبات المسموحة بعد النافذة. افحص كذلك TLS وHSTS وCSP وheaders عبر Nginx الحقيقي.

## 8. Android وiOS

راجع `mobile/DEVICE_E2E_HARNESS.md` قبل التشغيل. استخدم جهاز Android فعلي وجهاز iOS فعلي أو runners مصرح بها وحسابات tenant disposable. اختبر: consent، start/stop shift، GPS 60/15 ثانية قرب HCP، geofence، offline visit، sync online، إيقاف tracking، واستهلاك البطارية. لا تدّعِ نجاح background location قبل وجود أدلة فيديو/سجل من كل منصة.

```bash
cd mobile
pnpm install --frozen-lockfile
pnpm test 2>/dev/null || true
# نفّذ أوامر Expo المحددة في mobile/DEVICE_E2E_HARNESS.md حسب الجهاز والرابط المعتمد.
```

## 9. حزمة الأدلة وقرار الإغلاق

احفظ النتائج تحت `evidence/<date>/` خارج Git إذا تضمنت أسراراً أو سجلات عملاء. يجب أن تحتوي الحزمة على: commit hash، صور/تقارير DAST، benchmark JSON/EXPLAIN، NTP outputs، checksum backup/restore، سجلات rate limit، نتائج Playwright، وأدلة Android/iOS. لا تتحول أي خانة في `FULL_SYSTEM_REVIEW_AR.md` إلى ✅ قبل مراجعة هذه الأدلة واعتمادها.

## مراجع

[1] [OWASP ZAP](https://www.zaproxy.org/docs/)

[2] [MySQL logical backup guidance](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html)

[3] [Playwright test fixtures](https://playwright.dev/docs/test-fixtures)
