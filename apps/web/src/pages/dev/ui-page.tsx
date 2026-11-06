import {
  AlertBanner,
  Button,
  Card,
  EmptyState,
  SelectField,
  Skeleton,
  SkeletonText,
  StatusBadge,
  TextField,
} from "@noor/ui";
import { type ReactNode } from "react";
import { AccessDenied } from "@/components/access-denied";
import { PageTitle } from "@/components/page-title";
import { useI18n } from "@/i18n/locale-data";
import { DialogDemo, PinPadDemo } from "./ui-demos";

// Sample text for design review only; real screens take their text from the dictionaries.
const SAMPLES = {
  ar: {
    save: "حفظ",
    cancel: "إلغاء",
    remove: "حذف",
    name: "اسم الطفل",
    nameHint: "الاسم الذي يظهر في التطبيق",
    nameError: "هذا الحقل مطلوب",
    age: "العمر",
    cardTitle: "مهمة اليوم",
    cardBody: "ساعد في ترتيب المائدة قبل العشاء.",
    pending: "بانتظار المراجعة",
    reviewed: "تمت المراجعة",
    needsRetry: "أعد المحاولة",
    notAssessed: "لم يُقَس بعد",
    unavailable: "غير متاح",
    offlineTitle: "لا يوجد اتصال بالإنترنت",
    offlineBody: "قد لا تظهر بعض الأشياء حتى يعود الاتصال.",
    savedBody: "تم حفظ الملاحظة.",
    emptyTitle: "لا توجد مهمات اليوم",
    emptyBody: "يمكنك تصفح المكتبة واختيار نشاط تحبه.",
    start: "ابدأ المهمة",
    dialog: {
      open: "الخروج من وضع الطفل",
      title: "الخروج من وضع الطفل؟",
      body: "سيُطلب منك رمز ولي الأمر.",
      confirm: "متابعة",
      cancel: "إلغاء",
    },
    pin: {
      pad: "أدخل الرمز السري",
      back: "حذف آخر رقم",
      progress: "{entered} من {total}",
      done: "تم إدخال الرمز",
    },
  },
  en: {
    save: "Save",
    cancel: "Cancel",
    remove: "Delete",
    name: "Child's name",
    nameHint: "The name shown in the app",
    nameError: "This field is required",
    age: "Age",
    cardTitle: "Today's mission",
    cardBody: "Help set the table before dinner.",
    pending: "Pending review",
    reviewed: "Reviewed",
    needsRetry: "Try again",
    notAssessed: "Not assessed yet",
    unavailable: "Unavailable",
    offlineTitle: "You are offline",
    offlineBody: "Some things may not load until the connection is back.",
    savedBody: "Observation saved.",
    emptyTitle: "No missions today",
    emptyBody: "You can browse the library and pick an activity you like.",
    start: "Start mission",
    dialog: {
      open: "Leave child mode",
      title: "Leave child mode?",
      body: "You will be asked for the parent PIN.",
      confirm: "Continue",
      cancel: "Cancel",
    },
    pin: {
      pad: "Enter your PIN",
      back: "Delete last digit",
      progress: "{entered} of {total}",
      done: "PIN entered",
    },
  },
} as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b border-line pb-2 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

// Developer showcase for design review. Only routed in development (see router.tsx).
export function Component() {
  const { locale } = useI18n();
  const s = SAMPLES[locale];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6">
      <PageTitle title="UI kit" />
      <h1 className="text-2xl font-semibold">UI kit · @noor/ui</h1>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button>{s.save}</Button>
          <Button variant="secondary">{s.cancel}</Button>
          <Button variant="ghost">{s.cancel}</Button>
          <Button variant="danger">{s.remove}</Button>
          <Button size="lg">{s.start}</Button>
          <Button loading>{s.save}</Button>
          <Button disabled>{s.save}</Button>
        </div>
      </Section>

      <Section title="TextField · SelectField">
        <div className="grid gap-6 md:grid-cols-2">
          <TextField id="demo-name" label={s.name} hint={s.nameHint} />
          <TextField id="demo-name-error" label={s.name} error={s.nameError} required />
          <SelectField
            id="demo-age"
            label={s.age}
            options={["6", "7", "8", "9", "10", "11", "12", "13", "14"].map((age) => ({
              value: age,
              label: age,
            }))}
          />
        </div>
      </Section>

      <Section title="Card · StatusBadge">
        <div className="grid gap-4 md:grid-cols-2">
          <Card title={s.cardTitle} actions={<Button size="md">{s.start}</Button>}>
            <p className="text-ink-muted">{s.cardBody}</p>
          </Card>
          <div className="flex flex-wrap content-start gap-2">
            <StatusBadge tone="info">{s.pending}</StatusBadge>
            <StatusBadge tone="success">{s.reviewed}</StatusBadge>
            <StatusBadge tone="warning">{s.needsRetry}</StatusBadge>
            <StatusBadge tone="danger">{s.unavailable}</StatusBadge>
            <StatusBadge>{s.notAssessed}</StatusBadge>
          </div>
        </div>
      </Section>

      <Section title="AlertBanner">
        <AlertBanner tone="warning" title={s.offlineTitle}>
          {s.offlineBody}
        </AlertBanner>
        <AlertBanner tone="success">{s.savedBody}</AlertBanner>
      </Section>

      <Section title="EmptyState · AccessDenied (X06)">
        <EmptyState
          title={s.emptyTitle}
          description={s.emptyBody}
          action={<Button>{s.start}</Button>}
        />
        <AccessDenied />
      </Section>

      <Section title="Skeleton">
        <Skeleton className="h-8 w-1/3" />
        <SkeletonText lines={3} />
      </Section>

      <Section title="Dialog · PinPad">
        <DialogDemo labels={s.dialog} />
        <PinPadDemo labels={s.pin} />
      </Section>
    </main>
  );
}
