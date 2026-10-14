import { DEMO_USER_ID } from "@/lib/demo";
import { requireUserId } from "@/lib/session";

// Placeholder until the pantry list (Task 12); proves the page is gated.
export default async function PantryPage() {
  const userId = await requireUserId();
  return (
    <>
      <h1 className="font-serif text-heading-2">Pantry</h1>
      <p className="mt-md text-stone">
        {userId === DEMO_USER_ID ? "You're using the shared demo pantry." : "This is your pantry."}
      </p>
    </>
  );
}
