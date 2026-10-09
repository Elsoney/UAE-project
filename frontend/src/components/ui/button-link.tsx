import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "whatsapp" | "inverse";

const styles: Record<Variant, string> = {
  primary: "bg-madder text-plaster hover:bg-madder-deep",
  secondary: "border-2 border-indigo text-indigo hover:bg-indigo hover:text-plaster",
  whatsapp: "bg-palm text-plaster hover:brightness-110",
  inverse: "bg-plaster text-indigo hover:bg-saffron",
};

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-colors";

export function ButtonLink({
  variant = "primary",
  external,
  children,
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; external?: boolean; children: ReactNode }) {
  const cls = `${base} ${styles[variant]} ${className}`;
  if (external) {
    return (
      <a href={String(props.href)} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link {...props} className={cls}>
      {children}
    </Link>
  );
}

export function buttonClass(variant: Variant = "primary") {
  return `${base} ${styles[variant]}`;
}
