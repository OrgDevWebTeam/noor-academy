# وثيقة تصنيف أخطاء التجويد وقاموس الرسائل الآمنة (Taxonomy & Feedback)

- **المشروع:** أكاديمية نور (Noor Academy)
- **المسؤول:** إسماعيل (AI 2 - البيانات والتجويد والتقييم)
- **الإصدار:** v1.1 (الأسبوع 1، بعد المراجعة)
- **النطاق:** السور الخمس للنموذج الأولي (الفاتحة، الإخلاص، الفلق، الناس، الكوثر)
- **المرجع:** CRS v2.0 (القسمان 5.3 و5.4، FR-QUR-003..008، VAL-006، VAL-013، VAL-014) والمعمارية v2.0 (القسمان 8.2 و8.4)

> **مفتاح الحالة:** البنود المعلَّمة بـ 🔶 **مقترحة وبانتظار قرار** (محمد أو مراجع شرعي مؤهل)، ولا تُفعَّل في الكود قبل اعتمادها. ما سواها مطابق للـ CRS والمعمارية.

---

## 1. تصنيف فئات الأخطاء وأكواد النظام (Error Taxonomy)

هذه الأكواد تظهر في `findings[].code`، وفئتها في `findings[].category` (عقد النتيجة `recitation_result.schema.json`).

| الفئة (`category`) | الكود (`code`) | نوع الخطأ | المصدر المتوقع من النماذج |
| :--- | :--- | :--- | :--- |
| **الحفظ (`memorization`)** | `ERR_MEM_OMISSION` | حذف كلمة كاملة | مقارنة كلمات whisper-quran مع نص المرجع، ومحاذاة أصوات muaalem |
| | `ERR_MEM_SUBSTITUTION` | تبديل كلمة بكلمة | مقارنة كلمات whisper-quran |
| | `ERR_MEM_INSERTION` 🔶 | زيادة كلمة غير موجودة في الآية | مقارنة كلمات whisper-quran. **تُهمَل التكرارات وإعادة البدء** ولا توقف الطفل حتى يُحسم قرار 5.5 |
| **النطق (`pronunciation`)** | `ERR_PRON_LETTER_SUB` | إبدال حرف بحرف (كالصاد سيناً) | فرق الأصوات في muaalem |
| | `ERR_PRON_HARAKA` | لحن جلي في الحركة | أصوات الحركات في muaalem |
| | `ERR_PRON_MADD_ASLI_SHORT` 🔶 | قصر مدّ يغيّر الكلمة نفسها (مثال في نصوصنا: مَٰلِكِ ← مَلِكِ) | أصوات muaalem + إعدادات أطوال المد. **بانتظار تأكيد المراجع الشرعي** |
| **أحكام التجويد (`tajweed`)** | `ERR_TAJ_MADD_SHORT` | قصر في مقدار المد (المتصل، المنفصل، اللازم) | أصوات muaalem + أطوال المد المتوقعة. دقة القياس تُختبر في الأسبوع 4 |
| | `ERR_TAJ_GHONNA_OMIT` | ترك الغنة | صفة الغنة في muaalem |
| | `ERR_TAJ_QALQALA_OMIT` | ترك القلقلة | صفة القلقلة في muaalem |

### 1.1 أولوية التصنيف عند تعدد الخطأ في الكلمة الواحدة
يُسجَّل في الكلمة خطأ رئيسي واحد بالأولوية: **حفظ ← نطق ← تجويد**، وتُحفظ بقية الأخطاء في قائمة `provider_code` للتشخيص.

### 1.2 حالات رفض بوابة الجودة (ليست أخطاء)
الصمت والتشويش **لا يُسجَّلان كأخطاء** ولا يظهران في `findings`. بوابة الجودة (ffmpeg وSilero VAD) ترفض التسجيل قبل التحليل، فلا يُحسب محاولة (FR-QUR-003 وVAL-014).

| الحالة السابقة | تُسجَّل في العقد كـ |
| :--- | :--- |
| `ERR_TECH_NO_SPEECH` | `status = quality_rejected` و `telemetry.quality_gate.reason = no_speech` |
| `ERR_TECH_HIGH_NOISE` | `status = quality_rejected` و `telemetry.quality_gate.reason = high_noise` |
| (جديد) تسجيل قصير جداً / قصّ في الصوت | `reason = too_short` أو `clipped` |

الرسالة للطفل في كل الحالات: `FEEDBACK_AUDIO_UNCLEAR`.

### 1.3 قيم القرار (`decision`)
`accepted` أو `error` أو `uncertain` فقط (المعمارية 8.2). ولا تُستعمل قيمة `needs_practice` في العقد.

---

## 2. مصفوفة قواعد المستويات (ما الذي يوقف الطفل؟)

مطابقة لـ CRS 5.4. **الإيقاف** يعني تظليل الكلمة وإعادتها من المرجع، ولا انتقال حتى تصح القراءة (FR-QUR-005).

- **المستوى المبتدئ (Beginner):**
  - **يوقف عند:** `ERR_MEM_OMISSION` و `ERR_MEM_SUBSTITUTION`.
  - **يُنبَّه عليه دون إيقاف:** أخطاء النطق والتجويد.

- **المستوى المتوسط (Intermediate):**
  - **يوقف عند:** أخطاء الحفظ، وأخطاء النطق (`ERR_PRON_*`).
  - **يُنبَّه عليه دون إيقاف:** أخطاء التجويد.

- **المستوى المتقدم (Advanced):**
  - **يوقف عند:** أخطاء الحفظ والنطق، وأحكام التجويد **المستهدفة في الدرس** فقط (`ERR_TAJ_*`).

ملاحظات:
- `ERR_MEM_INSERTION` 🔶 لا يوقف الطفل في أي مستوى قبل حسم القرار 5.5.
- `ERR_PRON_MADD_ASLI_SHORT` 🔶 يُعامَل كنطق (يوقف من المتوسط) إذا اعتُمد.
- الأخطاء التي لا توقف تُنبَّه برسالة لطيفة وتُحفظ دليلاً أولياً فقط.

### 2.1 القواعد المستهدفة في كل درس (مطلوب للمستوى المتقدم)
المستوى المتقدم يحتاج معرفة الأحكام المستهدفة لكل كلمة. تُنشأ في الأسبوع 3 مع جداول قواعد المستويات ملف بهذا الشكل، ويعتمده مراجع شرعي مؤهل (O-04):

```json
{
  "surah": 1, "ayah": 1,
  "targets": [
    {"word_index": 1, "codes": ["ERR_TAJ_..."], "lesson_id": "TBD"}
  ]
}
```
(الشكل فقط. القيم يملؤها الفريق والمراجع.)

---

## 3. قاموس الرسائل الآمنة والتشجيعية (`message_key`)

**المصدر الوحيد للنصوص هو الملف `safe_messages_v1_1.json`.** الجدول التالي نسخة قراءة منه. تسمية الحقل في العقد هي `message_key`.

قواعد الصياغة:
1. **صيغة محايدة جنسياً:** جمل الوكيل تُسجَّل بصوت بشري مسبقاً (C-02)، وصيغ المخاطَب بالعربية تظهر الجنس بالنطق، فنستعمل صيغة "نحن".
2. لا ادعاء إتقان أو قرب ("متقنة"، "قريب جداً"). نتيجة النموذج أولية فقط (AP-04).
3. جمل قصيرة، وفكرة واحدة، وبلا مصطلحات إلا اسم الحكم الذي يتعلمه الطفل.
4. لا وعد بموعد أو حصة للمراجعة، فقد لا يتوفر المعلم (المعمارية 8.4).
5. نص النموذج الخام لا يُعرض للطفل أبداً، وتحويلات Whisper كذلك.

| المفتاح | العربية | الإنجليزية | الاستعمال |
| :--- | :--- | :--- | :--- |
| `FEEDBACK_CORRECT_EXCELLENT` | ما شاء الله! قراءة جميلة. هيا نكمل. | Masha'Allah! Beautiful recitation. Let's keep going. | decision=accepted |
| `FEEDBACK_LISTEN_AND_REPEAT_WORD` | محاولة طيبة! لنستمع معاً إلى الكلمة الملوّنة، ثم نقرؤها مرة أخرى. | Good try! Let's listen to the colored word together, then say it again. | ERR_PRON_LETTER_SUB |
| `FEEDBACK_CHECK_HARAKA` | محاولة طيبة! لنستمع إلى حركة الحرف الملوّن مرة أخرى. | Good try! Let's listen to the vowel sound on the colored letter once more. | ERR_PRON_HARAKA |
| `FEEDBACK_WORD_MISSED` | لنستمع إلى الكلمة الملوّنة، فقد تخطّيناها. ثم نقرأ الآية مرة أخرى. | Let's listen to the colored word, we skipped it. Then we'll read the verse again. | ERR_MEM_OMISSION |
| `FEEDBACK_WORD_DIFFERENT` | لنستمع مرة أخرى إلى الآية كما وردت، ثم نقرؤها معاً. | Let's listen to the verse once more exactly as it is, then read it together. | ERR_MEM_SUBSTITUTION, ERR_MEM_INSERTION |
| `FEEDBACK_MADD_REMINDER` | لنمدّ صوت الحرف الملوّن قليلاً. هيا نسمعه معاً. | Let's stretch the sound of the colored letter a little. Let's hear it together. | ERR_TAJ_MADD_SHORT |
| `FEEDBACK_GHUNNA_REMINDER` | لنُسمِع صوت الغنّة الخفيف من الأنف عند الحرف الملوّن. | Let's add the soft nasal 'ghunna' sound on the colored letter. | ERR_TAJ_GHONNA_OMIT |
| `FEEDBACK_QALQALA_REMINDER` | لنعطِ الحرف الملوّن نبرة خفيفة ترتدّ، وهذه هي القلقلة. | Let's give the colored letter its little bounce, called qalqala. | ERR_TAJ_QALQALA_OMIT |
| `FEEDBACK_AUDIO_UNCLEAR` | لم يصلنا صوت واضح. لنقترب من الميكروفون ونسجّل مرة أخرى بهدوء. | We couldn't hear a clear voice. Let's move closer to the microphone and record again, calmly. | status=quality_rejected (not counted as an attempt) |
| `FEEDBACK_TEACHER_REVIEW` | جهد مبارك! سيستمع معلمك إلى تلاوتك. | Blessed effort! Your teacher will listen to your recitation. | decision=uncertain, requires_teacher_review=true |
| `FEEDBACK_RETRY_LIMIT_MOVE_ON` | لا بأس! سيساعدنا معلمك في هذه الآية. هيا ننتقل إلى الآية التالية. | That's okay! Your teacher will help us with this verse. Let's move on to the next verse. | escalation after repeated attempts (only if the CRS change is approved) |
| `FEEDBACK_ANALYSIS_DELAYED` | ما زلنا نستمع لتلاوتك. يمكننا المتابعة إلى الآية التالية. | We're still listening to your recitation. We can go on to the next verse. | status=model_unavailable or timeout (Arch 8.4) |
| `FEEDBACK_SESSION_TIMEOUT` | شكراً لجهدك اليوم! سنكمل غداً من حيث توقفنا. | Thank you for your effort today! We'll continue tomorrow from where we stopped. | session INCOMPLETE after 10 minutes (FR-QUR-007) |

كل رسالة تحتاج لاحقاً معرّف ملف صوتي بالعربية والإنجليزية في مكتبة السيناريو.

---

## 4. قواعد التصعيد للمعلم البشري (Teacher-Escalation Rules)

1. **انخفاض الثقة:** ثقة النتيجة أقل من `policy.threshold` → `decision = uncertain` و `requires_teacher_review = true`، والطفل **ينتقل** (FR-QUR-006 وVAL-006).
   - القيمة الحالية **0.70 مؤقتة وقابلة للضبط**. تُقاس في الأسبوع 4 (O-02) وتُثبَّت في الأسبوع 7، وقد تختلف بحسب الفئة والمستوى.
2. **تعارض النموذجين:** اختلاف نتيجة muaalem مع مقارنة whisper-quran → `uncertain` ويُرسل للمعلم (المعمارية 8.4).
3. **انتهاء الوقت (10 دقائق):** تصنف الجلسة `INCOMPLETE`، ويُنبَّه الأب، وتُنشأ ملاحظة للمعلم، وتكمل الجلسة التالية من الآية نفسها (FR-QUR-007).
4. **تعطل الذكاء أو بطؤه أو مفتاح الإيقاف:** تُحفظ المحاولة، وتُوسَم الآية `uncertain`، وتستمر الجلسة (المعمارية 8.4). عند مفتاح الإيقاف تذهب كل الآيات لملاحظات المعلم.
5. **رفض بوابة الجودة:** لا يُحسب محاولة، ويُطلب من الطفل إعادة التسجيل (`FEEDBACK_AUDIO_UNCLEAR`).

### 4.1 قاعدة معلَّقة: حد المحاولات 🔶
**الوضع الحالي (ساري):** لا انتقال حتى تصح القراءة (FR-QUR-005). ويبقى هذا هو المطبَّق.

**اقتراح طلب تغيير (Change Request) لمحمد وأحمد:** إذا أعاد الطفل الكلمة `N` مرات دون نجاح، يُوسَم الآية `uncertain` للمعلم وينتقل برسالة `FEEDBACK_RETRY_LIMIT_MOVE_ON`، لتجنب أن يعلق الطفل. قيمة `N` (المقترحة 2) تُحسم عند الاعتماد. الحقل `word_retry_count` موجود في العقد لهذا الغرض. لا تُفعَّل القاعدة قبل تعديل CRS وآلة حالات أحمد.

---

## 5. بنود مفتوحة تنتظر قراراً

| # | البند | من يقرر |
| :--- | :--- | :--- |
| 5.1 | طلب التغيير لحد المحاولات (القسم 4.1) | محمد + أحمد |
| 5.2 | اعتماد `ERR_PRON_MADD_ASLI_SHORT` وصحة المثال مَٰلِكِ ← مَلِكِ | مراجع شرعي مؤهل (O-04 / OD-07) |
| 5.3 | أطوال المد المتوقعة (إعدادات muaalem) بما يناسب تساهل الأطفال | إسماعيل + قصي + مراجع شرعي |
| 5.4 | القواعد المستهدفة لكل درس (القسم 2.1) | إسماعيل + مراجع شرعي |
| 5.5 | سياسة الزيادة والتكرار وإعادة البدء | محمد |
| 5.6 | قيمة حد الثقة النهائية بحسب الفئة والمستوى | الأسبوع 4 ثم 7 (O-02) |
