"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

// Zod şeması
const forgotPasswordSchema = z.object({
  email: z.email("Lütfen geçerli bir e-posta adresi girin."),
});

export default function ForgotPasswordForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData?.message || "Bir hata oluştu");
        return;
      }

      toast.success(
        "E-posta adresiniz sistemimizde kayıtlıysa, bir parola sıfırlama bağlantısı gönderilmiştir."
      );
      router.push("/login");
    } catch (err) {
      console.log(err);
      toast.error(err?.message || "Sunucuya bağlanılamadı!");
    }
  };

  return (
    <Card className="bg-transparent border-white/10">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <p className="text-sm text-white/70">
            Parolanızı sıfırlamak için lütfen kayıtlı e-posta adresinizi girin.
          </p>
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@domain.com"
              className="bg-white/[0.02] border-white/10 focus-visible:ring-spotify-400"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl bg-spotify-500 hover:bg-spotify-400 text-white"
          >
            {isSubmitting ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
