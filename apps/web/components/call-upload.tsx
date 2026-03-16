"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileAudio,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CallUploadProps {
  className?: string;
  onUploadComplete?: (sessionId: string) => void;
  inline?: boolean;
}

export function CallUpload({
  className,
  onUploadComplete,
  inline = false,
}: CallUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");

  const { user } = useAuth();
  const { currentTeam } = useTeam();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        !selectedFile.type.startsWith("audio/") &&
        !selectedFile.type.startsWith("video/")
      ) {
        toast.error("Please upload an audio or video file.");
        return;
      }
      setFile(selectedFile);
      setUploadStatus("idle");
    }
  };

  const handleUpload = async () => {
    if (!file || !user || !currentTeam) return;

    setIsUploading(true);
    setUploadStatus("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user.uid);
      formData.append("userName", user.displayName || "Unknown User");
      formData.append("teamId", currentTeam.id);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/upload/call`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_KEY || "dev-secret-key"}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      setUploadStatus("success");
      toast.success("Call uploaded and analyzed successfully!");

      if (onUploadComplete) {
        onUploadComplete(result.sessionId);
      }

      // Close dialog after a short delay
      setTimeout(() => {
        setIsOpen(false);
        setFile(null);
        setUploadStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      toast.error("Failed to upload call. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const uploadContent = (
    <div className="flex flex-col items-center justify-center space-y-4">
      {!file ? (
        <label className="border-border/60 bg-cream/5 hover:bg-cream/10 flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors">
          <Upload className="text-warm-gray mb-2 size-8" />
          <span className="text-warm-gray text-sm font-medium">
            Click or drag audio/video file
          </span>
          <input
            type="file"
            className="hidden"
            accept="audio/*,video/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      ) : (
        <div className="border-border/40 flex w-full items-center gap-3 rounded-lg border bg-white p-4">
          <div className="bg-charcoal/5 flex size-10 items-center justify-center rounded-lg">
            <FileAudio className="text-charcoal size-5" />
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">{file.name}</span>
            <span className="text-warm-gray text-xs">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          {uploadStatus === "idle" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFile(null)}
              className="text-warm-gray hover:text-destructive"
            >
              Remove
            </Button>
          )}
        </div>
      )}

      {uploadStatus === "uploading" && (
        <div className="flex w-full flex-col items-center gap-2 py-4">
          <Loader2 className="text-charcoal size-8 animate-spin" />
          <span className="text-sm font-medium">
            Analyzing your call with Gemini Pro...
          </span>
          <p className="text-warm-gray text-center text-xs">
            This involves full transcription and performance scoring. It may
            take a minute.
          </p>
        </div>
      )}

      {uploadStatus === "success" && (
        <div className="flex w-full flex-col items-center gap-2 py-4 text-green-600">
          <CheckCircle2 className="size-10" />
          <span className="text-sm font-bold">Analysis Complete!</span>
        </div>
      )}

      {uploadStatus === "error" && (
        <div className="text-destructive flex w-full flex-col items-center gap-2 py-4">
          <AlertCircle className="size-10" />
          <span className="text-sm font-medium">
            Upload failed. Please try again.
          </span>
        </div>
      )}

      <div className="mt-4 flex w-full justify-end gap-3">
        {!inline && (
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleUpload}
          disabled={!file || isUploading || uploadStatus === "success"}
          className={cn("min-w-24", inline && "w-full")}
        >
          {isUploading ? "Uploading..." : "Start Analysis"}
        </Button>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className={cn("w-full max-w-md", className)}>{uploadContent}</div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className={cn("gap-2", className)}>
          <Upload className="size-4" />
          <span>Upload for Analysis</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Sales Call</DialogTitle>
          <DialogDescription>
            Upload an actual sales conversation recording for AI transcription
            and performance analysis.
          </DialogDescription>
        </DialogHeader>
        {uploadContent}
      </DialogContent>
    </Dialog>
  );
}
