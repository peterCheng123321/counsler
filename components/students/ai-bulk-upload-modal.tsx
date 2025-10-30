"use client";

import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Download,
  Loader2,
  FileSpreadsheet,
  Brain,
} from "lucide-react";
import { toast } from "sonner";

interface AIBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AIPreview {
  totalRows: number;
  validStudents: number;
  invalidStudents: number;
  students: any[];
  errors: any[];
  corrections: any[];
  aiSuggestions: any[];
}

export function AIBulkUploadModal({ open, onOpenChange }: AIBulkUploadModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<AIPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setPreview(null);
    setImportResults(null);

    try {
      const fileContent = await file.text();

      const response = await fetch("/api/v1/students/bulk-upload-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileContent,
          fileName: file.name,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPreview(result.preview);
        toast.success(`AI processed ${result.preview.totalRows} students`);
      } else {
        toast.error(result.error || "Failed to process file");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Failed to process file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;

    setIsImporting(true);

    try {
      const response = await fetch("/api/v1/students/bulk-upload-ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: preview.students,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setImportResults(result.results);
        queryClient.invalidateQueries({ queryKey: ["students"] });
        toast.success(`Successfully imported ${result.results.success} students`);
      } else {
        toast.error(result.error || "Failed to import students");
      }
    } catch (error) {
      console.error("Error importing:", error);
      toast.error("Failed to import students");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `first_name,last_name,email,phone,date_of_birth,graduation_year,gpa_unweighted,gpa_weighted,sat_score,act_score
John,Doe,john.doe@email.com,(555) 123-4567,2005-06-15,2024,3.8,4.2,1450,32
Jane,Smith,jane.smith@email.com,(555) 987-6543,2006-03-22,2025,3.9,4.3,1500,34`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_upload_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI-Powered Bulk Upload
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file. AI will intelligently parse, fix errors, and import your students.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Section */}
          {!preview && !importResults && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="flex-1 gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Select File
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Template
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="border rounded-lg p-6 bg-primary/5">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Features
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Understands any column naming (FirstName, first_name, First Name, etc.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Automatically fixes typos and formatting errors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Validates and normalizes emails, phone numbers, dates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Detects and removes duplicate entries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Shows all corrections before importing</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Preview Section */}
          {preview && !importResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Valid Students</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{preview.validStudents}</div>
                </div>
                <div className="border rounded-lg p-4 bg-amber-50">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-900">Needs Review</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-600">{preview.invalidStudents}</div>
                </div>
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">AI Corrections</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{preview.corrections.length}</div>
                </div>
              </div>

              <Tabs defaultValue="valid" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="valid">Valid ({preview.validStudents})</TabsTrigger>
                  <TabsTrigger value="corrections">Corrections ({preview.corrections.length})</TabsTrigger>
                  <TabsTrigger value="errors">Errors ({preview.invalidStudents})</TabsTrigger>
                </TabsList>

                <TabsContent value="valid" className="max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {preview.students.map((student, idx) => (
                      <div key={idx} className="border rounded p-3 bg-surface/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-sm text-text-secondary">{student.email}</p>
                          </div>
                          <Badge variant="outline">Row {student.rowNumber}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="corrections" className="max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {preview.corrections.map((correction, idx) => (
                      <div key={idx} className="border rounded p-3 bg-blue-50">
                        <div className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Row {correction.row} - {correction.field}</p>
                            <p className="text-xs text-text-secondary mt-1">
                              &quot;{correction.original}&quot; → &quot;{correction.corrected}&quot;
                            </p>
                            <p className="text-xs text-blue-700 mt-1">{correction.reason}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {preview.corrections.length === 0 && (
                      <p className="text-center text-text-secondary py-4">No corrections needed</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="errors" className="max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {preview.errors.map((error, idx) => (
                      <div key={idx} className="border rounded p-3 bg-red-50">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Row {error.row}</p>
                            <ul className="text-xs text-red-700 mt-1 space-y-1">
                              {error.errors.map((e: any, i: number) => (
                                <li key={i}>• {e.field}: {e.message}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                    {preview.errors.length === 0 && (
                      <p className="text-center text-text-secondary py-4">No errors found</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Results Section */}
          {importResults && (
            <div className="space-y-4">
              <div className="border rounded-lg p-6 bg-green-50">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">Import Complete</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-700">Successfully Imported</p>
                    <p className="text-2xl font-bold text-green-600">{importResults.success}</p>
                  </div>
                  <div>
                    <p className="text-sm text-red-700">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
                  </div>
                </div>
                {importResults.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-red-900 mb-2">Errors:</p>
                    <ul className="text-xs text-red-700 space-y-1">
                      {importResults.errors.slice(0, 5).map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                      {importResults.errors.length > 5 && (
                        <li>... and {importResults.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {preview && !importResults && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setPreview(null);
                  setFileName("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isImporting || preview.validStudents === 0}
                className="gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Import {preview.validStudents} Students
                  </>
                )}
              </Button>
            </>
          )}
          {importResults && (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
