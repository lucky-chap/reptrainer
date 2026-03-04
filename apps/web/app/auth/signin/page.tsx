"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const { user, loading, loginWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
        <Loader2 className="size-8 text-charcoal animate-spin mb-4" />
        <p className="text-warm-gray text-sm animate-pulse">
          Redirecting you to dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header / Brand */}
      <div className="p-8">
        <div
          className="flex items-center gap-2.5 group cursor-pointer"
          onClick={() => router.push("/")}
        >
          <div className="size-9 rounded-xl bg-charcoal flex items-center justify-center transition-transform group-hover:scale-105">
            <Zap className="size-5 text-cream" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-charcoal">
            Reptrainer
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 -mt-16">
        <div className="w-full max-w-md bg-white rounded-3xl border border-border/60 p-10 shadow-xl shadow-charcoal/5 animate-fade-up">
          <div className="text-center mb-10">
            <h1 className="heading-serif text-4xl text-charcoal mb-3">
              Welcome <em>Back.</em>
            </h1>
            <p className="text-warm-gray text-base leading-relaxed">
              Sign in to access your roleplay sessions, personas, and
              personalized coaching.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => loginWithGoogle()}
              className="w-full h-14 rounded-2xl bg-charcoal text-cream hover:bg-charcoal-light flex items-center justify-center gap-3 text-base font-medium transition-all group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="800px"
                height="800px"
                viewBox="-3 0 262 262"
                preserveAspectRatio="xMidYMid"
                className="size-5"
              >
                <path
                  d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                  fill="#4285F4"
                />
                <path
                  d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                  fill="#34A853"
                />
                <path
                  d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                  fill="#FBBC05"
                />
                <path
                  d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                  fill="#EB4335"
                />
              </svg>
              Continue with Google
              <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Button>

            <p className="text-center text-[11px] text-warm-gray-light mt-6 px-4">
              By continuing, you agree to Reptrainer&apos;s Terms of Service and
              Privacy Policy.
            </p>
          </div>
        </div>

        {/* Floating background elements for aesthetic */}
        <div className="fixed top-1/4 -left-20 size-64 bg-rose-glow/5 rounded-full blur-3xl -z-10" />
        <div className="fixed bottom-1/4 -right-20 size-64 bg-amber-glow/5 rounded-full blur-3xl -z-10" />
      </div>

      {/* Footer Branding */}
      <div className="p-8 text-center">
        <p className="text-xs text-warm-gray-light">
          Built for modern sales teams. &copy; 2026 Reptrainer.
        </p>
      </div>
    </div>
  );
}
