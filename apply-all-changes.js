const fs = require('fs');
const path = require('path');

console.log("Applying all demo mode changes...\n");

const apiFiles = [
  'app/api/v1/chatbot/chat/route.ts',
  'app/api/v1/chatbot/conversations/route.ts',
  'app/api/v1/chatbot/conversations/[id]/route.ts',
  'app/api/v1/students/route.ts',
  'app/api/v1/students/[id]/route.ts',
  'app/api/v1/tasks/route.ts',
  'app/api/v1/tasks/[id]/route.ts'
];

// Step 1: Update all API files to use admin client and DEMO_USER_ID
console.log("Step 1: Updating API routes...");
apiFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Add DEMO_USER_ID import if not present
    if (!content.includes('DEMO_USER_ID')) {
      const importRegex = /^import .+;$/gm;
      const imports = content.match(importRegex);
      if (imports) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const afterLastImport = lastImportIndex + lastImport.length;
        content = content.slice(0, afterLastImport) +
          '\nimport { DEMO_USER_ID } from "@/lib/constants";' +
          content.slice(afterLastImport);
      }
    }

    // Replace createClient with createAdminClient import
    content = content.replace(
      /import \{ createClient \} from ["']@\/lib\/supabase\/server["'];/g,
      'import { createAdminClient } from "@/lib/supabase/admin";'
    );

    // Replace createClient usage
    content = content.replace(
      /const supabase = await createClient\(\);/g,
      'const supabase = createAdminClient(); // Demo mode: Use admin client'
    );

    // Replace all auth.getUser() blocks with demo user ID
    content = content.replace(
      /const \{\s*data: \{ user \},\s*error: authError,?\s*\} = await supabase\.auth\.getUser\(\);\s*if \(authError \|\| !user\) \{\s*return NextResponse\.json\(\{ error: ["']Unauthorized["'] \}, \{ status: 401 \}\);\s*\}/gm,
      '// Demo mode: Skip authentication check\n    const userId = DEMO_USER_ID;'
    );

    // Replace user.id with userId
    content = content.replace(/user\.id/g, 'userId');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ ${file}`);
  }
});

// Step 2: Update middleware
console.log("\nStep 2: Updating middleware...");
const middlewarePath = path.join(__dirname, 'middleware.ts');
const middlewareContent = `import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Demo mode: No authentication checks required
  // Allow access to all routes without auth verification
  return NextResponse.next({
    request,
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
`;
fs.writeFileSync(middlewarePath, middlewareContent, 'utf8');
console.log("  ✓ middleware.ts");

// Step 3: Delete OAuth routes
console.log("\nStep 3: Removing OAuth routes...");
const callbackPath = path.join(__dirname, 'app/auth/callback/route.ts');
const logoutPath = path.join(__dirname, 'app/auth/logout/route.ts');

if (fs.existsSync(callbackPath)) {
  fs.unlinkSync(callbackPath);
  console.log("  ✓ Deleted app/auth/callback/route.ts");
}
if (fs.existsSync(logoutPath)) {
  fs.unlinkSync(logoutPath);
  console.log("  ✓ Deleted app/auth/logout/route.ts");
}

console.log("\n✅ All changes applied successfully!");
console.log("\nNOTE: .env.production was excluded from git to protect API keys");
