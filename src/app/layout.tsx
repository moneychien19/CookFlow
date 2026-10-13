import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import "@/styles/globals.css";

// Open substitutes for DESIGN.md's faces: Fraunces for Editorial New (headings,
// light weight via the type tokens), Inter for AkkuratLL (everything else).
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CookFlow",
  description:
    "Plan several meals at once around what's already in your pantry.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <NavBar />
        <main className="mx-auto w-full max-w-page px-md pt-xl pb-3xl tablet:px-lg">
          {children}
        </main>
      </body>
    </html>
  );
}
