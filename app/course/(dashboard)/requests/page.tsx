import { redirect } from "next/navigation";

/** Landing requests were merged into the course profile form. */
export default function CourseRequestsPage() {
  redirect("/course/profile");
}
