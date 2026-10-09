import { business } from "@/config/business";
import type { Dictionary } from "@/i18n/dictionary";

export function HoursList({ days }: { days: Dictionary["contact"]["days"] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
      {business.hours.map((slot) => (
        <div key={slot.days.join()} className="contents">
          <dt className="font-semibold">
            {slot.days.length > 2 ? `${days[slot.days[0]]} – ${days[slot.days[slot.days.length - 1]]}` : slot.days.map((d) => days[d]).join(" / ")}
          </dt>
          <dd className="tabular">
            <span dir="ltr">
              {slot.opens}–{slot.closes}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
