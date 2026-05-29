import Header from "@/components/common/header";
import Sidebar from "@/components/common/sidebar";
import AuthGuard from "@/components/providers/AuthGuard";

export default function MainLayout({ children }) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
