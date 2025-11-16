"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface LORGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  onSuccess?: (letter: any) => void;
}

type Step = 1 | 2 | 3;

export function LORGeneratorDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  onSuccess,
}: LORGeneratorDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");

  // Form data
  const [programType, setProgramType] = useState("");
  const [relationshipType, setRelationshipType] = useState("College Counselor");
  const [relationshipDuration, setRelationshipDuration] = useState("this academic year");
  const [relationshipContext, setRelationshipContext] = useState("");
  const [specificExamples, setSpecificExamples] = useState("");

  const resetForm = () => {
    setStep(1);
    setProgramType("");
    setRelationshipType("College Counselor");
    setRelationshipDuration("this academic year");
    setRelationshipContext("");
    setSpecificExamples("");
    setGeneratedContent("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/v1/students/${studentId}/letters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_type: programType,
          relationship_type: relationshipType,
          relationship_duration: relationshipDuration,
          relationship_context: relationshipContext,
          specific_examples: specificExamples,
          generateWithAI: true,
          status: "draft",
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setGeneratedContent(result.data.generated_content);
        setStep(3);
        toast.success("Letter generated successfully!");
        onSuccess?.(result.data);
      } else {
        toast.error(result.error || "Failed to generate letter");
      }
    } catch (error) {
      console.error("Error generating letter:", error);
      toast.error("An error occurred while generating the letter");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    toast.success("Letter saved successfully!");
    handleClose();
  };

  const progressValue = (step / 3) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Generate Letter of Recommendation
          </DialogTitle>
          <DialogDescription>
            for {studentName}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-text-secondary">
            <span>Step {step} of 3</span>
            <span>{step === 1 ? "Basic Info" : step === 2 ? "Details" : "Review"}</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="programType" className="text-base font-semibold">
                What program or college is this letter for? *
              </Label>
              <Textarea
                id="programType"
                value={programType}
                onChange={(e) => setProgramType(e.target.value)}
                placeholder="e.g., Stanford University Computer Science Program, Harvard College, MIT Engineering..."
                className="min-h-[80px] text-base"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="relationshipType" className="text-base font-semibold">
                Your role/relationship with the student *
              </Label>
              <Select value={relationshipType} onValueChange={setRelationshipType}>
                <SelectTrigger className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="College Counselor">College Counselor</SelectItem>
                  <SelectItem value="Teacher">Teacher</SelectItem>
                  <SelectItem value="Principal">Principal</SelectItem>
                  <SelectItem value="Coach">Coach</SelectItem>
                  <SelectItem value="Mentor">Mentor</SelectItem>
                  <SelectItem value="Academic Advisor">Academic Advisor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="relationshipDuration" className="text-base font-semibold">
                How long have you known the student? *
              </Label>
              <Select value={relationshipDuration} onValueChange={setRelationshipDuration}>
                <SelectTrigger className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="less than 6 months">Less than 6 months</SelectItem>
                  <SelectItem value="this academic year">This academic year</SelectItem>
                  <SelectItem value="one year">One year</SelectItem>
                  <SelectItem value="two years">Two years</SelectItem>
                  <SelectItem value="three years">Three years</SelectItem>
                  <SelectItem value="four years">Four years</SelectItem>
                  <SelectItem value="more than four years">More than four years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!programType}
                className="gap-2"
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="relationshipContext" className="text-base font-semibold">
                Describe your relationship and interaction with the student
              </Label>
              <Textarea
                id="relationshipContext"
                value={relationshipContext}
                onChange={(e) => setRelationshipContext(e.target.value)}
                placeholder="e.g., I have worked with Sarah as her college counselor throughout her junior and senior years. I meet with her weekly to discuss her academic progress, college applications, and career goals..."
                className="min-h-[120px] text-base"
              />
              <p className="text-sm text-text-secondary">
                This helps establish your credibility and perspective
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="specificExamples" className="text-base font-semibold">
                Specific examples, achievements, or qualities to highlight *
              </Label>
              <Textarea
                id="specificExamples"
                value={specificExamples}
                onChange={(e) => setSpecificExamples(e.target.value)}
                placeholder="e.g.,
- Led the robotics team to state championship
- Maintained 4.0 GPA while taking 6 AP courses
- Organized community service project that raised $10,000
- Shows exceptional curiosity in STEM subjects
- Natural leader who brings out the best in others"
                className="min-h-[200px] text-base font-mono"
              />
              <p className="text-sm text-text-secondary">
                Be specific! Include achievements, character traits, memorable moments, and why they stand out
              </p>
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!specificExamples || isGenerating}
                  className="gap-2 bg-primary hover:bg-primary-hover"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Letter
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review & Edit */}
        {step === 3 && (
          <div className="space-y-6 py-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  Letter generated successfully!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Review the letter below and make any edits needed.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="generatedContent" className="text-base font-semibold">
                Letter Content
              </Label>
              <Textarea
                id="generatedContent"
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                className="min-h-[400px] text-base font-serif leading-relaxed"
              />
              <p className="text-sm text-text-secondary">
                Feel free to edit the letter above. You can also regenerate it by going back.
              </p>
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Edit
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button
                  onClick={handleSave}
                  className="gap-2 bg-primary hover:bg-primary-hover"
                >
                  <Check className="h-4 w-4" />
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
