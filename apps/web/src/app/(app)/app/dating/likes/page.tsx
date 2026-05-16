import { redirect } from "next/navigation";

export default function DatingLikesRedirectPage() {
  redirect("/app/dating?panel=likes");
}
