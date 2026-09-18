"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Quote } from "lucide-react";

/**
 * A full-bleed pull quote over a campus photograph.
 *
 * The page is a long run of tables and stat tiles; this is the pause between
 * them — the one place a visitor hears a student rather than reads a figure.
 * It pulls the highest-rated review the college has, so the quote is real
 * content and not decoration.
 *
 * ## The parallax, and why it is the opposite of the hero's
 *
 * This band is entered from *below*, so the photograph travels up through the
 * frame across the whole scroll (y -12% to 12%) rather than starting at rest
 * the way the hero does. `offset: ["start end", "end start"]` covers the
 * section's entire visible life, from its top edge reaching the bottom of the
 * viewport to its bottom edge leaving the top — that full range is what makes
 * the drift readable at a normal scroll speed.
 *
 * The quote itself moves the other way and slower, so the type and the picture
 * separate as the band passes.
 */
export function QuoteParallax({
  quote,
  author,
  course,
  batch,
  photo,
}: {
  quote: string;
  author: string;
  course: string;
  batch: string;
  photo: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  const quoteY = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <section
      ref={ref}
      className="relative isolate flex min-h-[480px] items-center overflow-hidden bg-brand-ink"
    >
      <motion.div
        className="absolute inset-0 -z-10"
        style={reduceMotion ? undefined : { y: imageY, scale: 1.25 }}
      >
        <Image
          src={photo}
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-ink/92 via-brand-ink/70 to-black/75"
      />

      <motion.blockquote
        className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8"
        style={reduceMotion ? undefined : { y: quoteY }}
      >
        <motion.span
          initial={reduceMotion ? false : { opacity: 0, scale: 0.6, rotate: -12 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/20 text-gold ring-1 ring-gold/40"
        >
          <Quote className="h-6 w-6 fill-current" />
        </motion.span>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 28, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="balance mt-8 font-display text-2xl font-bold leading-snug text-white sm:text-3xl lg:text-[2.5rem] lg:leading-[1.25]"
        >
          &ldquo;{quote}&rdquo;
        </motion.p>

        <motion.footer
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8"
        >
          <span aria-hidden className="mx-auto mb-5 block h-px w-16 bg-gold" />
          <cite className="not-italic">
            <span className="font-display text-base font-bold text-gold">{author}</span>
            <span className="mt-1 block text-sm text-white/65">
              {course} &middot; Batch {batch}
            </span>
          </cite>
        </motion.footer>
      </motion.blockquote>
    </section>
  );
}
