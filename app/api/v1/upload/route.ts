import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_USER_ID } from "@/lib/constants";

const STORAGE_BUCKET = "student-files";

/**
 * Upload file to Supabase Storage
 * POST /api/v1/upload
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const studentId = formData.get("studentId") as string;
    const fileType = formData.get("fileType") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    if (!fileType) {
      return NextResponse.json(
        { error: "File type is required" },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File size must be less than ${maxSizeMB}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = {
      profile: ["image/jpeg", "image/png", "image/jpg"],
      resume: ["application/pdf"],
      transcript: ["application/pdf"],
      essay: ["application/pdf"],
    };

    const allowed = allowedTypes[fileType as keyof typeof allowedTypes];
    if (!allowed || !allowed.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type for ${fileType}` },
        { status: 400 }
      );
    }

    // Generate file path
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const fileName = `${fileType}-${timestamp}.${fileExt}`;
    const filePath = `${studentId}/${fileName}`;

    const supabase = createAdminClient();

    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    // Update student record with file URL
    const columnMap = {
      profile: "profile_picture_url",
      resume: "resume_url",
      transcript: "transcript_url",
    };

    const column = columnMap[fileType as keyof typeof columnMap];
    if (column) {
      await supabase
        .from("students")
        .update({ [column]: urlData.publicUrl })
        .eq("id", studentId);
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (error) {
    console.error("Upload exception:", error);
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Delete file from Supabase Storage
 * DELETE /api/v1/upload
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete exception:", error);
    return NextResponse.json(
      {
        error: "Failed to delete file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
