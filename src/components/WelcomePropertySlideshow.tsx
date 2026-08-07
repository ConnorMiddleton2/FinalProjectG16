"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { WELCOME_SLIDES } from "@/lib/welcome-slideshow";

const INTERVAL_MS = 5200;

type Props = {
  className?: string;
};

export function WelcomePropertySlideshow({ className = "" }: Props) {
  const [index, setIndex] = useState(0);
  const slides = WELCOME_SLIDES;
  const active = slides[index] ?? slides[0];

  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [slides.length]);

  return (
    <aside
      className={`relative overflow-hidden bg-[var(--harbor-ink)] ${className}`}
      aria-roledescription="carousel"
      aria-label="Current properties"
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== index}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: slide.objectPosition ?? "center center",
            }}
          />
        </div>
      ))}

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--harbor-ink) 20%, transparent) 0%, color-mix(in srgb, var(--harbor-ink) 72%, transparent) 50%, color-mix(in srgb, var(--harbor-ink) 92%, transparent) 100%)",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 p-6 pb-8 sm:p-8 sm:pb-10 lg:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--harbor-on-dark)]/70">
          Current properties
        </p>
        <p className="mt-2 font-display text-2xl leading-tight text-[var(--harbor-on-dark)] drop-shadow sm:text-3xl lg:text-4xl">
          {active.name}
        </p>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-[var(--harbor-on-dark)]/90">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <span>{active.location}</span>
        </p>

        <div
          className="mt-5 flex flex-wrap gap-2 lg:mt-6"
          role="tablist"
          aria-label="Slideshow slides"
        >
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show ${slide.name}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-8 bg-[var(--harbor-mid)]"
                  : "w-1.5 bg-[var(--harbor-on-dark)]/40 hover:bg-[var(--harbor-on-dark)]/70"
              }`}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
