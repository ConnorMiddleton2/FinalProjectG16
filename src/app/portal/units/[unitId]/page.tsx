import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  CalendarDays,
  Car,
  CheckCircle2,
  CircleDollarSign,
  Droplets,
  ExternalLink,
  FileCheck2,
  Info,
  MapPin,
  PawPrint,
  Ruler,
  ShieldCheck,
  Sparkles,
  UtilityPole,
} from "lucide-react";
import { UnitDetailActions } from "@/components/portal/UnitDetailActions";
import { getAvailableUnit } from "@/lib/available-unit-details";

type Props = { params: Promise<{ unitId: string }> };

export default async function UnitDetailsPage({ params }: Props) {
  const { unitId } = await params;
  const unit = getAvailableUnit(unitId);

  if (!unit) notFound();

  const availabilityClass =
    unit.availability === "Available now"
      ? "badge-success"
      : unit.availability === "Available soon"
        ? "badge-info"
        : "badge-warning";

  const availableDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${unit.availableDate}T12:00:00`));

  return (
    <div className="space-y-8">
      <Link
        href="/portal/units"
        className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/65 hover:text-[var(--harbor-ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to available units
      </Link>

      <section
        className="grid gap-3 lg:grid-cols-[1.65fr_0.8fr]"
        aria-label={`${unit.property} image gallery`}
      >
        <div
          className={`relative min-h-80 overflow-hidden rounded-3xl bg-gradient-to-br ${unit.artwork[0]} lg:min-h-[31rem]`}
          role="img"
          aria-label={`Replaceable main image for ${unit.floorPlan}`}
        >
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_25%_20%,white_0,transparent_32%),linear-gradient(120deg,transparent_45%,white_46%,transparent_47%)]" />
          <span className="absolute bottom-5 left-5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-[var(--harbor-ink)] shadow">
            Main residence view
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {unit.artwork.slice(1).map((artwork, index) => (
            <div
              key={artwork}
              className={`relative min-h-40 overflow-hidden rounded-3xl bg-gradient-to-br ${artwork}`}
              role="img"
              aria-label={`Replaceable ${index === 0 ? "interior" : "amenity"} image for ${unit.floorPlan}`}
            >
              <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(145deg,transparent_42%,white_43%,transparent_45%)]" />
              <span className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-xs font-medium">
                {index === 0 ? "Interior" : "Property amenity"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_21rem]">
        <div className="space-y-8">
          <section>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${availabilityClass}`}>
                    {unit.availability}
                  </span>
                  <span className="badge badge-outline">
                    Move in {availableDate}
                  </span>
                </div>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.15em] text-[var(--harbor-mid)]">
                  {unit.property}
                </p>
                <h1 className="mt-1 font-display text-4xl tracking-tight sm:text-5xl">
                  {unit.floorPlan}
                </h1>
                <p className="mt-3 inline-flex items-center gap-2 text-[var(--harbor-ink)]/65">
                  <MapPin className="h-4 w-4" />
                  {unit.address}
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 px-5 py-4 text-right shadow-sm">
                <p className="font-display text-3xl">
                  ${unit.rent.toLocaleString()}
                </p>
                <p className="text-xs text-[var(--harbor-ink)]/55">per month</p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  icon: BedDouble,
                  label: "Bedrooms",
                  value: unit.beds === 0 ? "Studio" : String(unit.beds),
                },
                { icon: Bath, label: "Bathrooms", value: String(unit.baths) },
                {
                  icon: Ruler,
                  label: "Square feet",
                  value: unit.sqft.toLocaleString(),
                },
                {
                  icon: CalendarDays,
                  label: "Move-in",
                  value: availableDate,
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/75 p-4"
                >
                  <Icon className="h-5 w-5 text-[var(--harbor-mid)]" />
                  <dt className="mt-3 text-xs uppercase tracking-wide text-[var(--harbor-ink)]/50">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-3xl border border-amber-700/15 bg-amber-50/80 p-6">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <h2 className="font-semibold text-amber-950">
                  Pricing and availability notice
                </h2>
                <p className="mt-1 text-sm leading-6 text-amber-950/70">
                  Rent, concessions, deposits, fees, lease terms, and
                  availability may change before a lease is signed. Contact
                  leasing for a current quote and complete disclosure.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-6">
              <CalendarDays className="h-6 w-6 text-[var(--harbor-mid)]" />
              <h2 className="mt-4 font-display text-2xl">Lease terms</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {unit.leaseTerms.map((term) => (
                  <span key={term} className="badge badge-outline">
                    {term}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm text-[var(--harbor-ink)]/65">
                Other terms may affect pricing. Ask leasing for the full quote.
              </p>
            </article>
            <article className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-6">
              <CircleDollarSign className="h-6 w-6 text-[var(--harbor-mid)]" />
              <h2 className="mt-4 font-display text-2xl">Deposit</h2>
              <p className="mt-4 font-semibold">{unit.deposit}</p>
              <p className="mt-2 text-sm text-[var(--harbor-ink)]/65">
                Final deposit depends on screening results and applicable law.
              </p>
            </article>
          </section>

          <section>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-[var(--harbor-mid)]" />
              <h2 className="font-display text-3xl">Amenities</h2>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {unit.amenities.map((amenity) => (
                <li
                  key={amenity}
                  className="flex items-center gap-3 rounded-2xl bg-white/75 p-4 text-sm"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
                  {amenity}
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5">
              <UtilityPole className="h-5 w-5 text-[var(--harbor-mid)]" />
              <h2 className="mt-3 font-semibold">Utilities</h2>
              <ul className="mt-3 space-y-2 text-sm text-[var(--harbor-ink)]/65">
                {unit.utilities.map((utility) => (
                  <li key={utility}>• {utility}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5">
              <PawPrint className="h-5 w-5 text-[var(--harbor-mid)]" />
              <h2 className="mt-3 font-semibold">Pet policy</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--harbor-ink)]/65">
                {unit.petPolicy}
              </p>
            </article>
            <article className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5">
              <Car className="h-5 w-5 text-[var(--harbor-mid)]" />
              <h2 className="mt-3 font-semibold">Parking</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--harbor-ink)]/65">
                {unit.parking}
              </p>
            </article>
          </section>

          <section className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-[var(--harbor-mid)]" />
              <h2 className="font-display text-3xl">Accessibility</h2>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {unit.accessibility.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
                  {feature}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-[var(--harbor-ink)]/60">
              Contact leasing to verify specific dimensions or request a
              reasonable accommodation.
            </p>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-6">
              <h2 className="font-display text-3xl">Illustrative floor plan</h2>
              <p className="mt-2 text-sm text-[var(--harbor-ink)]/55">
                Placeholder diagram — not to scale.
              </p>
              <div className="mt-5 grid min-h-64 grid-cols-2 grid-rows-2 gap-1 rounded-2xl border-4 border-[var(--harbor-ink)]/70 bg-[var(--harbor-sand)] p-1 text-center text-xs font-semibold">
                <div className="flex items-center justify-center border border-[var(--harbor-ink)]/40">
                  Living / dining
                </div>
                <div className="flex items-center justify-center border border-[var(--harbor-ink)]/40">
                  Kitchen
                </div>
                <div className="flex items-center justify-center border border-[var(--harbor-ink)]/40">
                  {unit.beds === 0 ? "Open sleeping area" : "Bedroom"}
                </div>
                <div className="flex items-center justify-center border border-[var(--harbor-ink)]/40">
                  Bath / storage
                </div>
              </div>
            </article>
            <article className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-6">
              <h2 className="font-display text-3xl">Location</h2>
              <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
                {unit.neighborhood}
              </p>
              <div className="relative mt-5 flex min-h-64 items-center justify-center overflow-hidden rounded-2xl bg-[var(--harbor-mist)]">
                <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(35deg,transparent_48%,white_49%,white_52%,transparent_53%),linear-gradient(125deg,transparent_48%,white_49%,white_52%,transparent_53%)] [background-size:70px_70px]" />
                <div className="relative text-center">
                  <span className="inline-flex rounded-full bg-[var(--harbor-ink)] p-3 text-[var(--harbor-sand)] shadow-lg">
                    <MapPin className="h-6 w-6" />
                  </span>
                  <p className="mt-3 max-w-52 text-sm font-semibold">
                    {unit.address}
                  </p>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(unit.address)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline mt-4 w-full gap-2"
              >
                Open map
                <ExternalLink className="h-4 w-4" />
              </a>
            </article>
          </section>

          <section className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-6">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-6 w-6 text-[var(--harbor-mid)]" />
              <h2 className="font-display text-3xl">
                Application requirements
              </h2>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {unit.requirements.map((requirement) => (
                <li key={requirement} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
                  {requirement}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/80 p-6">
            <div className="flex items-center gap-2">
              <Droplets className="h-6 w-6 text-[var(--harbor-mid)]" />
              <h2 className="font-display text-3xl">Fees</h2>
            </div>
            <div className="mt-5 divide-y divide-[var(--harbor-deep)]/10">
              {unit.fees.map((fee) => (
                <div
                  key={fee.label}
                  className="grid gap-1 py-4 first:pt-0 sm:grid-cols-[1fr_auto] sm:gap-5"
                >
                  <div>
                    <h3 className="font-semibold">{fee.label}</h3>
                    <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
                      {fee.note}
                    </p>
                  </div>
                  <strong className="sm:text-right">{fee.amount}</strong>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--harbor-ink)]/55">
              Pet, parking, utility, insurance, and other optional or
              conditional charges may also apply. Request the full fee sheet
              before applying.
            </p>
          </section>
        </div>

        <aside className="sticky top-4 rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-mid)]">
            Interested in this unit?
          </p>
          <h2 className="mt-2 font-display text-2xl">{unit.floorPlan}</h2>
          <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
            Tour, apply, or ask leasing a question.
          </p>
          <div className="mt-5">
            <UnitDetailActions
              unitId={unit.id}
              unitLabel={`${unit.property} ${unit.floorPlan}`}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}