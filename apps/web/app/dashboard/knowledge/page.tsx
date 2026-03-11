"use client";

import { useState, useEffect } from "react";
import {
  FileUp,
  Search,
  Brain,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Database,
  Users,
  Target,
  Trophy,
  Zap,
  Globe,
  RefreshCw,
  FileText,
  Download,
  Eye,
} from "lucide-react";
import { useTeam } from "@/context/team-context";
import {
  subscribeKnowledgeBase,
  subscribeKnowledgeMetadata,
  uploadKnowledgeDocument,
  processKnowledgeBase,
  initRagEngine,
} from "@/lib/db/knowledge";
import type {
  KnowledgeBase,
  KnowledgeMetadata,
  KnowledgeDocument,
} from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function KnowledgeBasePage() {
  const { currentTeam, isAdmin } = useTeam();
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [metadata, setMetadata] = useState<KnowledgeMetadata | null>(null);
  const [uploading, setUploading] = useState(false);
  const [initializingRag, setInitializingRag] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTeam) return;

    const unsubKb = subscribeKnowledgeBase(
      currentTeam.id,
      (data) => {
        setKb(data);
        setLoading(false);
      },
      (err) => console.error(err),
    );

    const unsubMetadata = subscribeKnowledgeMetadata(
      currentTeam.id,
      (data) => setMetadata(data),
      (err) => console.error(err),
    );

    return () => {
      unsubKb();
      unsubMetadata();
    };
  }, [currentTeam]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentTeam || !e.target.files?.length) return;

    setUploading(true);
    try {
      const file = e.target.files[0];
      await uploadKnowledgeDocument(currentTeam.id, file);
      toast.success("Document uploaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleRagInit = async () => {
    if (!currentTeam) return;

    setInitializingRag(true);
    try {
      await initRagEngine(currentTeam.id);
      toast.success("RAG Engine initialized successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to initialize RAG engine");
    } finally {
      setInitializingRag(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-charcoal/20 size-8 animate-spin" />
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold">No team selected</h2>
        <p className="text-warm-gray mt-2">
          Please select or create a team first.
        </p>
      </div>
    );
  }

  const hasDocs = kb && kb.documents.length > 0;
  const isProcessing = kb?.embeddingsIndexStatus === "processing";
  const isReady = kb?.embeddingsIndexStatus === "ready";

  return (
    <div className="animate-fade-in max-w-6xl space-y-8 font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="heading-serif text-charcoal text-3xl md:text-4xl lg:text-5xl">
            Team <em>Knowledge Base.</em>
          </h1>
          <p className="text-warm-gray mt-2 text-base">
            Upload your product documents to power training personas and
            simulations.
          </p>
        </div>
        {(uploading || isProcessing) && (
          <Button
            disabled
            size="lg"
            className="bg-charcoal text-cream shadow-lg transition-all disabled:opacity-80"
          >
            <Loader2 className="mr-2 size-4 animate-spin" />
            {uploading ? "Uploading Documents..." : "Processing Knowledge..."}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Docs & Upload */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-charcoal/5 overflow-hidden shadow-sm">
            <CardHeader className="bg-charcoal/2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="text-charcoal/60 size-5" />
                Documents
              </CardTitle>
              <CardDescription>
                {kb?.documents.length || 0} files uploaded
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {kb?.documents.slice(0, 3).map((doc: KnowledgeDocument) => (
                  <div
                    key={doc.id}
                    className="border-charcoal/5 flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-charcoal truncate font-medium">
                        {doc.name}
                      </p>
                      <p className="text-warm-gray text-xs">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-cream-dark text-charcoal/60 text-[10px]"
                    >
                      {doc.type.split("/")[1]?.toUpperCase()}
                    </Badge>
                  </div>
                ))}

                {kb && kb.documents.length > 3 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-charcoal/60 hover:text-charcoal w-full gap-2 text-xs"
                      >
                        <Eye className="size-3" />
                        View All ({kb.documents.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Database className="size-5" />
                          Knowledge Documents
                        </DialogTitle>
                      </DialogHeader>
                      <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-2">
                        {kb.documents.map((doc: KnowledgeDocument) => (
                          <div
                            key={doc.id}
                            className="border-charcoal/5 bg-charcoal/1 hover:bg-charcoal/2 flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="bg-charcoal/5 rounded-lg p-2">
                                <FileText className="text-charcoal/60 size-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-charcoal truncate font-semibold">
                                  {doc.name}
                                </p>
                                <p className="text-warm-gray text-xs">
                                  {new Date(doc.createdAt).toLocaleDateString()}
                                  {" • "}
                                  {doc.type.split("/")[1]?.toUpperCase()}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-charcoal/10 hover:bg-charcoal/5 shrink-0"
                              asChild
                            >
                              <a href={doc.storageUrl} download={doc.name}>
                                <Download className="mr-2 size-4" />
                                Download
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {!hasDocs && (
                  <div className="py-8 text-center">
                    <AlertCircle className="text-warm-gray/40 mx-auto size-8" />
                    <p className="text-warm-gray mt-2 text-sm font-medium italic">
                      No documents yet.
                    </p>
                  </div>
                )}

                {isAdmin && (
                  <div className="pt-2">
                    <label
                      className={cn(
                        "group relative flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all",
                        isProcessing || uploading
                          ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                          : "border-charcoal/10 bg-cream/30 hover:border-charcoal/20 hover:bg-cream/50 cursor-pointer",
                      )}
                    >
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div
                          className={cn(
                            "rounded-full p-3 transition-colors",
                            isProcessing || uploading
                              ? "bg-gray-100"
                              : "bg-charcoal/5 group-hover:bg-charcoal/10",
                          )}
                        >
                          <FileUp
                            className={cn(
                              "size-6",
                              isProcessing || uploading
                                ? "text-gray-400"
                                : "text-charcoal/60",
                            )}
                          />
                        </div>
                        <div className="text-center">
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              isProcessing || uploading
                                ? "text-gray-400"
                                : "text-charcoal",
                            )}
                          >
                            {isProcessing
                              ? "System Processing"
                              : "Click to upload"}
                          </p>
                          <p className="text-warm-gray text-xs">
                            {isProcessing
                              ? "Please wait for current indexing to finish"
                              : "PDF, DOCX, TXT up to 10MB"}
                          </p>
                        </div>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileUpload}
                        disabled={uploading || isProcessing}
                      />
                      {(uploading || isProcessing) && (
                        <div className="bg-cream/90 absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl">
                          <Loader2 className="text-charcoal size-8 animate-spin" />
                          <p className="text-charcoal text-sm font-medium">
                            {uploading ? "Uploading..." : "Processing..."}
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-charcoal/5 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Status</CardTitle>
              {isReady ? (
                <CheckCircle2 className="size-5 text-green-500" />
              ) : isProcessing ? (
                <Loader2 className="text-charcoal size-5 animate-spin" />
              ) : (
                <AlertCircle className="size-5 text-amber-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-warm-gray">Processing State</span>
                  <span
                    className={cn(
                      "font-medium capitalize",
                      isReady
                        ? "text-green-600"
                        : isProcessing
                          ? "text-charcoal"
                          : "text-amber-600",
                    )}
                  >
                    {kb?.embeddingsIndexStatus || "idle"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-warm-gray">RAG Engine</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-medium",
                        kb?.ragCorpusId ? "text-green-600" : "text-amber-600",
                      )}
                    >
                      {kb?.ragCorpusId ? "Ready" : "Not Initialized"}
                    </span>
                    {!kb?.ragCorpusId && hasDocs && isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRagInit}
                        disabled={initializingRag}
                        className="h-7 px-2 text-xs"
                      >
                        {initializingRag ? (
                          <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 size-3" />
                        )}
                        Initialize
                      </Button>
                    )}
                  </div>
                </div>
                {isProcessing && <Progress value={45} className="h-1" />}
                <p className="text-warm-gray mt-4 text-xs">
                  Personas can only be generated once the knowledge base is
                  "Ready".
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Insights */}
        <div className="space-y-6 lg:col-span-2">
          {metadata ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-charcoal/5 h-auto w-full justify-start gap-2 p-1">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-charcoal data-[state=active]:text-cream"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="customers"
                  className="data-[state=active]:bg-charcoal data-[state=active]:text-cream"
                >
                  Target Customers
                </TabsTrigger>
                <TabsTrigger
                  value="market"
                  className="data-[state=active]:bg-charcoal data-[state=active]:text-cream"
                >
                  Market & Claims
                </TabsTrigger>
                <TabsTrigger
                  value="objections"
                  className="data-[state=active]:bg-charcoal data-[state=active]:text-cream"
                >
                  Objections
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="overview" className="pt-0">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card className="border-charcoal/5 shadow transition-shadow hover:shadow-md">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base font-bold">
                          <Zap className="size-4 text-amber-500" />
                          Category
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-charcoal text-xl font-bold">
                          {metadata.productCategory}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-charcoal/5 shadow transition-shadow hover:shadow-md">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-charcoal flex items-center gap-2 text-base font-bold">
                          <Globe className="size-4 text-blue-500" />
                          Market Positioning
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-charcoal/80 text-sm leading-relaxed">
                          {metadata.icp}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-charcoal/5 shadow transition-shadow hover:shadow-md md:col-span-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-charcoal text-base font-bold">
                          Value Propositions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {metadata.valueProps.map(
                            (prop: string, i: number) => (
                              <li
                                key={i}
                                className="flex items-start gap-3 rounded-lg bg-green-50/50 p-3 font-medium italic"
                              >
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
                                <span className="text-sm text-green-900">
                                  {prop}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="customers">
                  <Card className="border-charcoal/5 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="text-charcoal/60 size-5" />
                        Buyer Roles
                      </CardTitle>
                      <CardDescription>
                        Key stakeholders identified in your knowledge base.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {metadata.buyerRoles.map((role: string, i: number) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="bg-charcoal/5 text-charcoal hover:bg-charcoal/10 border-0 px-4 py-1.5 text-sm"
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-8">
                        <h4 className="text-charcoal mb-4 flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
                          <Target className="size-4" />
                          Ideal Customer Profile (ICP)
                        </h4>
                        <div className="border-charcoal/5 bg-charcoal/1 rounded-xl border p-6">
                          <p className="text-charcoal/80 leading-relaxed">
                            {metadata.icp}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="market">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card className="border-charcoal/5 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base font-bold">
                          Key Differentiators
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {metadata.differentiators.map(
                            (diff: string, i: number) => (
                              <li
                                key={i}
                                className="text-charcoal/80 flex items-center gap-3 text-sm"
                              >
                                <Trophy className="size-4 shrink-0 text-amber-500" />
                                {diff}
                              </li>
                            ),
                          )}
                        </ul>
                      </CardContent>
                    </Card>
                    <Card className="border-charcoal/5 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex flex-col">
                          <CardTitle className="text-base font-bold">
                            Main Competitors
                          </CardTitle>
                        </div>
                      </CardHeader>

                      <CardContent>
                        {metadata.competitorContexts &&
                        metadata.competitorContexts.length > 0 ? (
                          <div className="space-y-4">
                            {metadata.competitorContexts.map(
                              (comp: any, i: number) => (
                                <div
                                  key={i}
                                  className="border-charcoal/10 bg-cream/50 rounded-lg border p-4"
                                >
                                  <div className="mb-2 flex items-center justify-between">
                                    <h4 className="text-charcoal font-bold">
                                      {comp.name}
                                    </h4>
                                    {comp.website && (
                                      <a
                                        href={
                                          comp.website.startsWith("http")
                                            ? comp.website
                                            : `https://${comp.website}`
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                      >
                                        <Globe className="size-3" /> Website
                                      </a>
                                    )}
                                  </div>
                                  <div className="mt-3 space-y-3">
                                    <div>
                                      <span className="text-warm-gray text-xs font-semibold tracking-wide uppercase">
                                        Positioning
                                      </span>
                                      <p className="text-charcoal/90 mt-0.5 text-sm">
                                        {comp.pricingPositioning}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-warm-gray flex items-center gap-1 text-xs font-semibold tracking-wide uppercase">
                                        <AlertCircle className="size-3" /> Pain
                                        Points
                                      </span>
                                      <ul className="mt-1 list-disc space-y-1 pl-4">
                                        {comp.painPoints.map(
                                          (pt: string, j: number) => (
                                            <li
                                              key={j}
                                              className="text-charcoal/80 text-xs"
                                            >
                                              {pt}
                                            </li>
                                          ),
                                        )}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {metadata.competitors.map(
                              (comp: string, i: number) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-charcoal/60 border-charcoal/10 font-medium"
                                >
                                  {comp}
                                </Badge>
                              ),
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="objections">
                  <Card className="border-charcoal/5 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base font-bold">
                        Common Objections
                      </CardTitle>
                      <CardDescription>
                        Issues revealed during extraction from sales playbooks
                        and documentation.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-4">
                        {metadata.objections.map((obj: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-4 rounded-xl border border-red-100 bg-red-50/20 p-4"
                          >
                            <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                              !
                            </div>
                            <span className="text-sm leading-snug font-medium text-red-900">
                              {obj}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <div className="border-charcoal/5 bg-charcoal/1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-32 text-center">
              <div className="bg-charcoal/5 mb-4 flex size-16 items-center justify-center rounded-full">
                <Brain className="text-charcoal/20 size-8" />
              </div>
              <h3 className="text-charcoal text-xl font-bold">
                No Insights Yet
              </h3>
              <p className="text-warm-gray mt-2 max-w-sm">
                Upload knowledge files to automatically generate structured
                metadata for your team.
              </p>
              {!hasDocs && (
                <div className="mt-8 flex items-center gap-2 text-sm font-medium text-amber-600">
                  <AlertCircle className="size-4" />
                  First, upload at least one document
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
