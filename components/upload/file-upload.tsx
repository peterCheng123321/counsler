"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface FileUploadProps {
  studentId: string;
  fileType: "resume" | "transcript";
  currentFileUrl?: string;
  onUploadComplete?: (url: string) => void;
  maxSizeMB?: number;
}

export function FileUpload({
  studentId,
  fileType,
  currentFileUrl,
  onUploadComplete,
  maxSizeMB = 5,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileUrl, setFileUrl] = useState<string | null>(currentFileUrl || null);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check file type
    const allowedTypes = ["application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF file");
      return false;
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    setUploadProgress(0);
    setFileName(file.name);

    try {
      // Upload to server
      const formData = new FormData();
      formData.append("file", file);
      formData.append("studentId", studentId);
      formData.append("fileType", fileType);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/v1/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (result.success) {
        setFileUrl(result.url);
        toast.success(`${fileType === "resume" ? "Resume" : "Transcript"} uploaded successfully`);
        onUploadComplete?.(result.url);
      } else {
        toast.error(result.error || "Upload failed");
        setFileUrl(currentFileUrl || null);
        setFileName("");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
      setFileUrl(currentFileUrl || null);
      setFileName("");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
    }
  }, []);

  const handleRemove = () => {
    setFileUrl(null);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {fileUrl ? (
          <div className="p-8">
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">
                    {fileType === "resume" ? "Resume" : "Transcript"} uploaded
                  </p>
                  {fileName && (
                    <p className="text-xs text-green-700 mt-1">{fileName}</p>
                  )}
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-1 inline-block"
                  >
                    View File →
                  </a>
                </div>
              </div>
              {!isUploading && (
                <button
                  onClick={handleRemove}
                  className="p-1 hover:bg-red-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-red-600" />
                </button>
              )}
            </div>

            {isUploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">Uploading...</span>
                  <span className="text-sm font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto h-16 w-16 text-text-tertiary mb-4">
              <FileText className="h-full w-full" />
            </div>
            <p className="text-sm text-text-secondary mb-2">
              Drag and drop a PDF here, or
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Select PDF
                </>
              )}
            </Button>
            <p className="text-xs text-text-tertiary mt-2">
              PDF only, max {maxSizeMB}MB
            </p>

            {isUploading && (
              <div className="mt-4">
                <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                <p className="text-xs text-text-secondary mt-2">{uploadProgress}%</p>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
