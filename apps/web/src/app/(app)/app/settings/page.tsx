import { redirect } from "next/navigation";

export default function LegacySettingsRoutePage() {
  redirect("/app/profile");
}
