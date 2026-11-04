import type { Metadata } from "next";
import { EmptyState } from "@noor/ui";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.maintenance.title };
}

// X06 — announced maintenance. Operations can route traffic here during a planned outage.
export default async function MaintenancePage() {
  const dict = await getDictionary();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      <EmptyState
        headingLevel={1}
        title={dict.maintenance.title}
        description={dict.maintenance.body}
      />
    </main>
  );
}
