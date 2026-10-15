import { AccountNav } from "@/components/account-nav";

export default function AccountLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="container dash">
      <AccountNav />
      <div className="dash-main">{children}</div>
    </div>
  );
}
