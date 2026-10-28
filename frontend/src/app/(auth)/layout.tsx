/**
 * Auth pages get no marketing header or footer: nothing on the screen but the task. The log in and sign up
 * pages draw their own split screen (AuthShell); the others, such as choosing a new password, use AuthCard.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-screen bg-bg-alt">{children}</div>;
}
