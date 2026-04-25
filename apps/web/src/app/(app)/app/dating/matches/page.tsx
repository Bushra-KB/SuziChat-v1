import { redirect } from "next/navigation";

export default function DatingMatchesRedirectPage() {
  redirect("/app/dating?panel=matches");
}
