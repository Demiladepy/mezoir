import { type CSSProperties, type ElementType, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
};

export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: RevealProps) {
  return (
    <Tag
      className={`mezoir-enter ${className}`}
      style={{ animationDelay: `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

export function AnimatedWords({
  text,
  className = "",
  wordClassName = "",
}: {
  text: string;
  className?: string;
  wordClassName?: string;
}) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className={`mezoir-enter inline-block ${wordClassName}`}
          style={{ animationDelay: `${100 + i * 65}ms` }}
        >
          {word}
          {i < words.length - 1 ? "\u00a0" : ""}
        </span>
      ))}
    </span>
  );
}
