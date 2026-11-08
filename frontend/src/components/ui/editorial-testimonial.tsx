"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export interface TestimonialItem {
  id: number
  quote: string
  author?: string
  role?: string
  company?: string
  image?: string
}

const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 1,
    quote: "CampusAxis kept my attendance above 81% all semester. The bunk calculator and ERP sync gave me total peace of mind.",
  },
  {
    id: 2,
    quote: "The neural search over lecture notes and previous years' question papers saved my grade during end-sems.",
  },
  {
    id: 3,
    quote: "Instead of wasting months jumping across tutorial hell, the roadmaps gave me the exact stack milestones to crack my internship.",
  },
]

export default function TestimonialsEditorial({
  items = DEFAULT_TESTIMONIALS,
  autoPlayInterval = 4500,
}: {
  items?: TestimonialItem[]
  autoPlayInterval?: number
}) {
  const [active, setActive] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const handleChange = (index: number) => {
    if (index === active || isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => {
      setActive(index)
      setTimeout(() => setIsTransitioning(false), 50)
    }, 300)
  }

  const handlePrev = () => {
    const newIndex = active === 0 ? items.length - 1 : active - 1
    handleChange(newIndex)
  }

  const handleNext = () => {
    const newIndex = active === items.length - 1 ? 0 : active + 1
    handleChange(newIndex)
  }

  useEffect(() => {
    if (isPaused || items.length <= 1) return
    const timer = setInterval(() => {
      handleNext()
    }, autoPlayInterval)
    return () => clearInterval(timer)
  }, [active, isPaused, items.length, autoPlayInterval])

  const current = items[active] || items[0]

  return (
    <div
      className="w-full max-w-4xl text-left py-2 md:py-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-start gap-4 sm:gap-6 md:gap-10">
        <span
          className="text-[64px] sm:text-[90px] md:text-[130px] font-light leading-none select-none transition-all duration-500 shrink-0"
          style={{
            fontFeatureSettings: '"tnum"',
            color: "color-mix(in srgb, var(--ows-ink, currentColor) 16%, transparent)",
          }}
        >
          {String(active + 1).padStart(2, "0")}
        </span>

        <div className="flex-1 pt-2 sm:pt-3 md:pt-4">
          <blockquote
            className={`text-xl sm:text-2xl md:text-[30px] font-normal leading-snug sm:leading-[1.28] tracking-tight transition-all duration-300 ${
              isTransitioning ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"
            }`}
            style={{ color: "var(--ows-ink, inherit)" }}
          >
            "{current.quote}"
          </blockquote>

          {(current.author || current.role || current.company) && (
            <div
              className={`mt-4 sm:mt-6 transition-all duration-300 delay-100 ${
                isTransitioning ? "opacity-0" : "opacity-100"
              }`}
            >
              {current.author && (
                <p
                  className="font-medium text-sm sm:text-[15px] tracking-tight"
                  style={{ color: "var(--ows-ink, inherit)" }}
                >
                  {current.author}
                </p>
              )}
              {(current.role || current.company) && (
                <p
                  className="text-xs sm:text-[13px] leading-relaxed"
                  style={{ color: "var(--ows-muted, #888)" }}
                >
                  {current.role}
                  {current.role && current.company && <span className="mx-2 opacity-40">/</span>}
                  {current.company && <span>{current.company}</span>}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 sm:mt-14 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--ows-ink,currentColor)_10%,transparent)] pt-4 sm:pt-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-3">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => handleChange(index)}
                className="group relative py-2 sm:py-3 touch-manipulation"
                aria-label={`Go to slide ${index + 1}`}
              >
                <span
                  className="block h-[2px] rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: index === active ? "32px" : "14px",
                    backgroundColor:
                      index === active
                        ? "var(--ows-ink, currentColor)"
                        : "color-mix(in srgb, var(--ows-ink, currentColor) 22%, transparent)",
                  }}
                />
              </button>
            ))}
          </div>
          <span
            className="text-[11px] sm:text-[11.5px] font-mono tracking-widest uppercase"
            style={{ color: "var(--ows-muted, #888)" }}
          >
            {String(active + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handlePrev}
            className="p-2 sm:p-2.5 rounded-full border border-[color-mix(in_srgb,var(--ows-ink,currentColor)_12%,transparent)] hover:bg-[var(--ows-tint,rgba(255,255,255,0.06))] active:scale-95 transition-all duration-200"
            style={{ color: "var(--ows-ink, inherit)" }}
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-2 sm:p-2.5 rounded-full border border-[color-mix(in_srgb,var(--ows-ink,currentColor)_12%,transparent)] hover:bg-[var(--ows-tint,rgba(255,255,255,0.06))] active:scale-95 transition-all duration-200"
            style={{ color: "var(--ows-ink, inherit)" }}
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
