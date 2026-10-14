import Link from "next/link";
import { Suspense } from "react";
import { AccountStatus } from "./AccountStatus";

const LINKS = [
  { href: "/pantry", label: "Pantry" },
  { href: "/suggest", label: "Suggest" },
  { href: "/plan/new", label: "Plan" },
] as const;

const linkClass =
  "inline-flex min-h-touch items-center px-xs text-stone no-underline hover:underline";

export function NavBar() {
  return (
    <header className="bg-canvas">
      <nav
        aria-label="Main"
        className="mx-auto flex w-full max-w-page items-center justify-between gap-md px-md py-xs tablet:px-lg"
      >
        <Link href="/" className={`${linkClass} -ml-xs text-button`}>
          CookFlow
        </Link>
        <ul className="flex items-center gap-xxs text-ui tablet:gap-md">
          {LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className={linkClass}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <Suspense fallback={null}>
          <AccountStatus />
        </Suspense>
      </nav>
    </header>
  );
}
