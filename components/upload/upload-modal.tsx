"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpload } from "./image-upload";
import { FileUpload } from "./file-upload";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  fileType: "profile" | "resume" | "transcript";
  currentFileUrl?: string;
  onUploadComplete?: (url: string) => void;
}

const modalConfig = {
  profile: {
    title: "Upload Profile Picture",
    description: "Upload a profile picture for this student (JPG or PNG)",
  },
  resume: {
    title: "Upload Resume",
    description: "Upload the student's resume (PDF format)",
  },
  transcript: {
    title: "Upload Transcript",
    description: "Upload the student's transcript (PDF format)",
  },
};

export function UploadModal({
  open,
  onOpenChange,
  studentId,
  fileType,
  currentFileUrl,
  onUploadComplete,
}: UploadModalProps) {
  const config = modalConfig[fileType];

  const handleUploadComplete = (url: string) => {
    onUploadComplete?.(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {fileType === "profile" ? (
            <ImageUpload
              studentId={studentId}
              currentImageUrl={currentFileUrl}
              onUploadComplete={handleUploadComplete}
            />
          ) : (
            <FileUpload
              studentId={studentId}
              fileType={fileType}
              currentFileUrl={currentFileUrl}
              onUploadComplete={handleUploadComplete}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
