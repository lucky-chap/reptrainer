"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import type { Session, Persona, Product } from "@/lib/db";
import { getSession, getPersona, getProduct } from "@/lib/db";
import { SessionResults } from "@/components/session-results";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";

export default function SessionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();

  const sessionId = useMemo(() => {
    const raw = params?.sessionId;
    if (Array.isArray(raw)) return raw[0];
    return raw;
  }, [params]);

  const [session, setSession] = useState<Session | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !sessionId) return;
    let cancelled = false;

    const loadSession = async () => {
      try {
        setLoading(true);
        setError(null);

        const sessionDoc = await getSession(sessionId);
        if (!sessionDoc) {
          if (!cancelled) {
            setError("Session not found.");
            setLoading(false);
          }
          return;
        }

        if (sessionDoc.userId && sessionDoc.userId !== user.uid) {
          if (!cancelled) {
            setError("You don't have access to this session.");
            setLoading(false);
          }
          return;
        }

        const [personaDoc, productDoc] = await Promise.all([
          getPersona(sessionDoc.personaId),
          sessionDoc.productId
            ? getProduct(sessionDoc.productId)
            : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setSession(sessionDoc);
          setPersona(personaDoc || null);
          setProduct(productDoc || null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load session:", err);
        if (!cancelled) {
          setError("Failed to load session.");
          setLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [user, sessionId]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="text-warm-gray text-sm">
          Sign in to view this session.
        </div>
        <Button asChild variant="brand">
          <Link href="/auth/signin">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="border-charcoal/20 border-t-charcoal size-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-rose-100">
          <AlertTriangle className="size-6 text-rose-600" />
        </div>
        <div className="text-charcoal text-lg font-semibold">
          {error || "Session unavailable."}
        </div>
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/dashboard/history">
            <ArrowLeft className="size-4" />
            Back to history
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <SessionResults
      session={session}
      persona={persona}
      product={product}
      onBack={() => router.push("/dashboard/history")}
    />
  );
}
