import { GoogleOAuthProvider } from "@react-oauth/google";

export default function AuthLayout({ children }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
      <div className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-red-600/40 rounded-full blur-[120px]" />
        {children}
      </div>
    </GoogleOAuthProvider>
  );
}
