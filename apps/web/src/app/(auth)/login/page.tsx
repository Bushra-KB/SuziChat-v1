import { LoginPanel } from "@/components/auth/login-panel";

export default function LoginPage() {
  return (
    <div className="w-full">
      <LoginPanel
        eyebrow="Sign In"
        title="Welcome back"
        description="Sign in to continue your chats, reconnect with friends, and pick up where you left off."
      />
    </div>
  );
}
