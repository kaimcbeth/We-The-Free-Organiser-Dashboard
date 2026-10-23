import { redirect } from "next/navigation";

// Roles are given from People (+ Role) and listed there with "Has a role".
export default function RolesPage() {
  redirect("/people?show=roles");
}
