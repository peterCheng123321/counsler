"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, type CreateStudentInput } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";

const studentFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  graduationYear: z
    .number()
    .int()
    .min(new Date().getFullYear())
    .max(new Date().getFullYear() + 5),
  gpaUnweighted: z.number().min(0).max(5).optional(),
  gpaWeighted: z.number().min(0).max(5).optional(),
});

type StudentFormData = z.infer<typeof studentFormSchema>;

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddStudentModal({
  open,
  onOpenChange,
}: AddStudentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      graduationYear: new Date().getFullYear() + 1,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateStudentInput) => apiClient.createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({
        title: "Student added",
        description: "Student has been successfully added.",
        variant: "success",
      });
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add student",
        variant: "error",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: StudentFormData) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Enter the student&apos;s information to add them to your list.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-error">*</span>
              </Label>
              <Input
                id="firstName"
                {...register("firstName")}
                placeholder="John"
                error={errors.firstName?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-error">*</span>
              </Label>
              <Input
                id="lastName"
                {...register("lastName")}
                placeholder="Smith"
                error={errors.lastName?.message}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-error">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="john.smith@email.com"
              error={errors.email?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              {...register("phone")}
              placeholder="(555) 123-4567"
              error={errors.phone?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="graduationYear">
              Graduation Year <span className="text-error">*</span>
            </Label>
            <Input
              id="graduationYear"
              type="number"
              {...register("graduationYear", { valueAsNumber: true })}
              min={new Date().getFullYear()}
              max={new Date().getFullYear() + 5}
              error={errors.graduationYear?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gpaUnweighted">GPA (Unweighted)</Label>
              <Input
                id="gpaUnweighted"
                type="number"
                step="0.01"
                min="0"
                max="5"
                {...register("gpaUnweighted", { valueAsNumber: true })}
                placeholder="3.75"
                error={errors.gpaUnweighted?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpaWeighted">GPA (Weighted)</Label>
              <Input
                id="gpaWeighted"
                type="number"
                step="0.01"
                min="0"
                max="5"
                {...register("gpaWeighted", { valueAsNumber: true })}
                placeholder="4.25"
                error={errors.gpaWeighted?.message}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

