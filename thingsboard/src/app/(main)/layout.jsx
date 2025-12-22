import Header from "@/components/common/header";
import Sidebar from "@/components/common/sidebar";

export default function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
