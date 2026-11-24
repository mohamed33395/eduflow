import { redirect } from "next/navigation";

/** Landing requests were merged into the center profile form. */
export default function CenterRequestsPage() {
  redirect("/center/profile");
}
