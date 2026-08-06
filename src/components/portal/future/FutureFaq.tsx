"use client";

import { useId, useState } from "react";

const FAQ_ITEMS = [
  {
    question: "Do I need an account to browse units?",
    answer:
      "No. You can browse available personal homes and commercial suites and save them locally without signing in. Starting an application or messaging leasing requires an account.",
  },
  {
    question: "How do tours work?",
    answer:
      "Choose a property, tour type, and available time slot. Harborline leasing will confirm your appointment in the portal.",
  },
  {
    question: "Is the application fee refundable?",
    answer:
      "Application fees are typically non-refundable. Review the fee screen carefully before paying. Pricing can change until a lease is executed.",
  },
  {
    question: "Can I save my application and finish later?",
    answer:
      "Yes. Use Save for later in the application wizard. Your draft stays available when you sign back in.",
  },
] as const;

export function FutureFaq() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, index) => {
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;
        const open = openIndex === index;
        return (
          <div
            key={item.question}
            className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/80"
          >
            <h3>
              <button
                type="button"
                id={buttonId}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-[var(--harbor-ink)] portal-focus rounded-xl"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
              >
                {item.question}
                <span aria-hidden="true" className="text-[var(--harbor-mid)]">
                  {open ? "−" : "+"}
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="px-4 pb-4 text-sm text-[var(--harbor-muted)]"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
