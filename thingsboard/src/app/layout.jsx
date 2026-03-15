import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import SessionWrapper from "@/components/providers/SessionWrapper";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Thingsboard IoT",
  description: "IoT cihazlarınızı tek bir yerden yönetin",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <SessionWrapper>
          <Toaster position="top-center" />
          {children}
        </SessionWrapper>
      </body>
    </html>
  );
}

