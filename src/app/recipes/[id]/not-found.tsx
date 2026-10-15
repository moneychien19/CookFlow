import Link from "next/link";

export default function RecipeNotFound() {
  return (
    <>
      <h1 className="font-serif text-heading-2">Recipe not found</h1>
      <p className="mt-md text-ink">
        We couldn&apos;t find that recipe.{" "}
        <Link href="/pantry" className="text-stone underline">
          Back to your pantry
        </Link>
        .
      </p>
    </>
  );
}
