import { Suspense } from "react";
import LoginForm from "@/components/auth/login";
import Image from "next/image";

export default function LoginPage() {
  return (
    <main className="relative z-10 w-full max-w-[1000px] h-[600px] bg-[#0a0a0a] rounded-[2.5rem] shadow-2xl border border-white/5 grid grid-cols-1 md:grid-cols-2 overflow-hidden m-4">
      {/* --- SOL TARAF --- */}

      <aside className="relative hidden md:block h-full p-4">
        <div className="relative h-full w-full rounded-[2rem] overflow-hidden">
          <Image
            src={"/login.jpeg"}
            alt="LOgin Background"
            fill
            className="object-cover"
            priority
          />

          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605901309584-818e25960b8f?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          <div className="absolute bottom-8 left-8 z-20 text-white">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-bold">
                T
              </div>
              <span className="text-xl font-bold tracking-wide">
                Thingsboard
              </span>
            </div>
            <p className="text-gray-300 text-sm font-medium">
              Tüm IoT cihazlarınızı tek bir yerden yönetin
            </p>
          </div>
        </div>
      </aside>

      {/* --- SAĞ TARAF --- */}
      <section className="w-full flex flex-col justify-center px-8 md:px-16 py-12 bg-[#0a0a0a] text-white">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-medium mb-2 text-white">Welcome back</h1>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            Don't have an account?{" "}
            <a href="/register" className="text-red-400 hover:underline">
              Sign Up
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
