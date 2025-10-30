"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from "lucide-react";
import { apiClient, type CreateStudentInput } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedStudent {
  row: number;
  data: CreateStudentInput;
  errors: string[];
}

export function BulkUploadModal({ open, onOpenChange }: BulkUploadModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const parseCSV = (text: string): ParsedStudent[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must have a header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const students: ParsedStudent[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const errors: string[] = [];

      const getField = (name: string) => {
        const index = headers.indexOf(name);
        return index >= 0 ? values[index] : '';
      };

      const firstName = getField('first_name') || getField('firstname');
      const lastName = getField('last_name') || getField('lastname');
      const email = getField('email');
      const graduationYear = parseInt(getField('graduation_year') || getField('graduationyear'));

      // Validation
      if (!firstName) errors.push('First name is required');
      if (!lastName) errors.push('Last name is required');
      if (!email) errors.push('Email is required');
      if (!graduationYear || isNaN(graduationYear)) {
        errors.push('Valid graduation year is required');
      }

      const student: CreateStudentInput = {
        firstName,
        lastName,
        email,
        graduationYear,
        phone: getField('phone'),
        dateOfBirth: getField('date_of_birth') || getField('dateofbirth'),
        gpaUnweighted: parseFloat(getField('gpa_unweighted') || getField('gpaunweighted')) || undefined,
        gpaWeighted: parseFloat(getField('gpa_weighted') || getField('gpaweighted')) || undefined,
        satScore: parseInt(getField('sat_score') || getField('satscore')) || undefined,
        actScore: parseInt(getField('act_score') || getField('actscore')) || undefined,
        applicationProgress: parseInt(getField('application_progress') || getField('applicationprogress')) || 0,
        resumeUrl: getField('resume_url') || getField('resumeurl'),
        transcriptUrl: getField('transcript_url') || getField('transcripturl'),
        profilePictureUrl: getField('profile_picture_url') || getField('profilepictureurl'),
      };

      students.push({
        row: i + 1,
        data: student,
        errors,
      });
    }

    return students;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "error",
      });
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setParsedStudents(parsed);

      const validCount = parsed.filter(s => s.errors.length === 0).length;
      const invalidCount = parsed.filter(s => s.errors.length > 0).length;

      toast({
        title: "File parsed",
        description: `Found ${validCount} valid students, ${invalidCount} with errors`,
        variant: validCount > 0 ? "success" : "error",
      });
    } catch (error) {
      toast({
        title: "Parse error",
        description: error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "error",
      });
    }
  };

  const handleUpload = async () => {
    const validStudents = parsedStudents.filter(s => s.errors.length === 0);
    if (validStudents.length === 0) {
      toast({
        title: "No valid students",
        description: "Please fix errors before uploading",
        variant: "error",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < validStudents.length; i++) {
      try {
        await apiClient.createStudent(validStudents[i].data);
        successCount++;
      } catch (error) {
        errors.push(
          `Row ${validStudents[i].row}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      setUploadProgress(((i + 1) / validStudents.length) * 100);
    }

    setUploadResults({
      success: successCount,
      failed: errors.length,
      errors,
    });

    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    }

    setIsUploading(false);
  };

  const handleClose = () => {
    setParsedStudents([]);
    setUploadResults(null);
    setUploadProgress(0);
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const template = `first_name,last_name,email,phone,date_of_birth,graduation_year,gpa_unweighted,gpa_weighted,sat_score,act_score,application_progress,resume_url,transcript_url,profile_picture_url
John,Doe,john.doe@example.com,(555) 123-4567,2006-05-15,2025,3.85,4.20,1450,32,45,https://example.com/resume.pdf,https://example.com/transcript.pdf,https://example.com/photo.jpg
Jane,Smith,jane.smith@example.com,(555) 987-6543,2006-08-22,2025,3.92,4.35,1520,34,60,,,`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Template downloaded",
      description: "Use this template to format your student data",
      variant: "success",
    });
  };

  const validCount = parsedStudents.filter(s => s.errors.length === 0).length;
  const invalidCount = parsedStudents.filter(s => s.errors.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Students</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add multiple students at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <div className="rounded-lg border border-border bg-surface/50 p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-text-primary mb-1">
                  Need a template?
                </h4>
                <p className="text-sm text-text-secondary mb-2">
                  Download our CSV template with all required fields and example data
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          {!uploadResults && (
            <div
              className="relative rounded-lg border-2 border-dashed border-border bg-surface/30 p-8 text-center cursor-pointer hover:bg-surface/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="h-12 w-12 mx-auto mb-4 text-text-tertiary" />
              <p className="text-sm font-medium text-text-primary mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-text-secondary">
                CSV files only
              </p>
            </div>
          )}

          {/* Parsed Data Summary */}
          {parsedStudents.length > 0 && !uploadResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-text-primary">
                  Parsed Students
                </h4>
                <span className="text-sm text-text-secondary">
                  {parsedStudents.length} total
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Valid: {validCount}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Errors: {invalidCount}</span>
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {invalidCount > 0 && (
                <div className="rounded-lg border border-error bg-error-light p-3 max-h-48 overflow-y-auto">
                  <p className="text-sm font-semibold text-error mb-2">
                    Errors found:
                  </p>
                  <ul className="space-y-1 text-xs text-error">
                    {parsedStudents
                      .filter(s => s.errors.length > 0)
                      .map(s => (
                        <li key={s.row}>
                          Row {s.row}: {s.errors.join(', ')}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Uploading...</span>
                <span className="font-semibold text-text-primary">
                  {Math.round(uploadProgress)}%
                </span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Upload Results */}
          {uploadResults && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-surface p-4">
                <h4 className="text-sm font-semibold text-text-primary mb-3">
                  Upload Complete
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="text-2xl font-bold text-green-700">
                      {uploadResults.success}
                    </div>
                    <div className="text-xs text-green-600">Successful</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="text-2xl font-bold text-red-700">
                      {uploadResults.failed}
                    </div>
                    <div className="text-xs text-red-600">Failed</div>
                  </div>
                </div>

                {uploadResults.errors.length > 0 && (
                  <div className="rounded-lg border border-error bg-error-light p-3 max-h-32 overflow-y-auto">
                    <p className="text-sm font-semibold text-error mb-2">
                      Failed uploads:
                    </p>
                    <ul className="space-y-1 text-xs text-error">
                      {uploadResults.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-900 font-semibold mb-2">
              CSV Format Instructions:
            </p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Required fields: first_name, last_name, email, graduation_year</li>
              <li>• Optional fields: phone, date_of_birth, gpa_unweighted, gpa_weighted, sat_score, act_score, application_progress, resume_url, transcript_url, profile_picture_url</li>
              <li>• First row must be headers (column names)</li>
              <li>• Use comma (,) as separator</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            {uploadResults ? "Close" : "Cancel"}
          </Button>
          {!uploadResults && parsedStudents.length > 0 && (
            <Button
              onClick={handleUpload}
              disabled={isUploading || validCount === 0}
            >
              {isUploading
                ? "Uploading..."
                : `Upload ${validCount} Student${validCount !== 1 ? 's' : ''}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
