import { m, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef, type ElementType, type ReactNode } from "react";

export const EASE_OUT_EXPO = [0.19, 1, 0.22, 1] as const;

/** Fades and lifts content once as it enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "p" | "span" | "header" | "article";
}) {
  const reduce = useReducedMotion();
  const Component = m[as] as ElementType;
  return (
    <Component
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay }}
    >
      {children}
    </Component>
  );
}

/**
 * Headline whose lines rise out of a clipping mask, staggered. Each entry in
 * `lines` is one visual line (keeps the break intentional on every screen).
 */
export function LineReveal({
  lines,
  as: Tag = "h2",
  className,
  lineClassName = "",
  delay = 0,
  immediate = false,
}: {
  lines: ReactNode[];
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  lineClassName?: string;
  delay?: number;
  immediate?: boolean;
}) {
  const reduce = useReducedMotion();
  const trigger = immediate ? { animate: { y: "0%" } } : { whileInView: { y: "0%" } };
  return (
    <Tag className={className}>
      {lines.map((line, index) => (
        <span key={index} className={`sv-reveal-line ${lineClassName}`}>
          <m.span
            initial={reduce ? false : { y: "108%" }}
            {...trigger}
            viewport={{ once: true, margin: "0px 0px -8% 0px" }}
            transition={{ duration: 1.15, ease: EASE_OUT_EXPO, delay: delay + index * 0.09 }}
          >
            {line}
          </m.span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * A paragraph whose words light from shadow to ivory as it scrolls through the
 * viewport — the reader's attention becomes the candle. Plain text for screen
 * readers; the animated copy is aria-hidden.
 */
export function ScrollLitText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");

  if (reduce) return <p className={className}>{text}</p>;

  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <Word
            key={`${word}-${index}`}
            progress={scrollYProgress}
            range={[index / words.length, (index + 1) / words.length]}
          >
            {word}
          </Word>
        ))}
      </span>
    </p>
  );
}

function Word({
  children,
  progress,
  range,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <m.span style={{ opacity }} className="inline-block whitespace-pre">
      {children}{" "}
    </m.span>
  );
}
