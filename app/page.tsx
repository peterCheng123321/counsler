import { redirect } from "next/navigation";

// Mark as dynamic to prevent static generation issues
export const dynamic = "force-dynamic";

export default function Home() {
  redirect("/chatbot");
}





