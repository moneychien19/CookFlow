import { signInWithGitHub, signInWithGoogle } from "@/app/auth/actions";
import { startDemo } from "@/app/demo/actions";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <>
      <h1 className="font-serif text-heading-2">CookFlow</h1>
      <p className="mt-md text-stone">
        Plan several meals at once around what&apos;s already in your pantry.
      </p>
      <div className="mt-xl flex flex-col gap-sm tablet:flex-row">
        <form action={startDemo}>
          <Button type="submit" variant="primary">
            Try the demo
          </Button>
        </form>
        <form action={signInWithGitHub}>
          <Button type="submit" variant="outline">
            Sign in with GitHub
          </Button>
        </form>
        <form action={signInWithGoogle}>
          <Button type="submit" variant="outline">
            Sign in with Google
          </Button>
        </form>
      </div>
      <p className="mt-md text-body-sm text-stone">
        The demo needs no account: everyone trying it shares one sample pantry.
      </p>
    </>
  );
}
