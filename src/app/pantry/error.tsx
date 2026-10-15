"use client";

import { Button } from "@/components/ui/Button";

export default function PantryError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-md">
      <h1 className="font-serif text-heading-2">Pantry</h1>
      <p className="text-ink">Something went wrong with your pantry. Try again in a moment.</p>
      <Button onClick={retry}>Try again</Button>
    </div>
  );
}
