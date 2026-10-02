import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  eyebrow = "Clauble",
  title,
  description,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section aria-labelledby="auth-title" className="auth-card">
        <Link className="auth-brand" href="/">{eyebrow}</Link>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-description">{description}</p>
        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
      </section>
    </main>
  );
}
