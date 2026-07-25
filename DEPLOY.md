# نشر النظام على Render (مجاناً)

كل شيء جاهز في الريبو (`render.yaml` + `backend/build.sh`). المطلوب منك 4 خطوات فقط:

1. **أنشئ حساب** على [render.com](https://render.com) (سجّل بحساب GitHub `MohamedBeheri` — أسهل)
2. من اللوحة: **New ← Blueprint**
3. اختر ريبو **`MohamedBeheri/doctor-clinic`** (لو أول مرة هيطلب صلاحية الوصول للريبو — وافق)
4. اضغط **Apply** وانتظر ~5 دقائق حتى ينتهي البناء

## الرابط بعد النشر
`https://doctor-clinic.onrender.com` (أو باسم مشابه لو الاسم محجوز)

- الدخول: `admin` / `admin123` — **غيّر كلمة المرور فوراً من الإعدادات**
- البيانات التجريبية تُزرع مرة واحدة فقط في أول نشر

## ماذا يحدث تلقائياً
- خدمة ويب Python (Django + gunicorn) تخدم الواجهة + API + الميديا من نفس الرابط
- قاعدة بيانات Postgres مجانية (`doctor-clinic-db`) تُنشأ وتُربط تلقائياً
- HTTPS مجاني — وهو مطلوب لتشغيل **بوت الواتساب**:
  - Webhook URL في Meta: `https://doctor-clinic.onrender.com/api/chatbot/webhook/`

## التحديثات لاحقاً
أي تعديل: أعد بناء الفرونت وانسخه ثم ادفع:
```bash
cd frontend && npm run build && rm -rf ../backend/frontend_dist && cp -r dist ../backend/frontend_dist
cd .. && git add -A && git commit -m "تحديث" && git push
```
Render يعيد النشر تلقائياً مع كل push.

## قيود الباقة المجانية
- الخدمة تنام بعد 15 دقيقة خمول (أول طلب بعدها يأخذ ~30 ثانية)
- Postgres المجاني صالح 90 يوماً ثم يحتاج ترقية أو نقل
- الملفات المرفوعة أثناء التشغيل (مرفقات المرضى/تغيير اللوجو) تُمسح مع كل نشر جديد
  (لوجو المركز الحالي دائم لأنه محفوظ داخل الريبو)
