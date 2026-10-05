import { getSessionUser } from "@/app/lib/auth-cookies";
import DashboardClient from "./DashboardClient";

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  return <DashboardClient user={user} />;
}
