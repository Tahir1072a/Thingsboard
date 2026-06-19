"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Lock,
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Calendar,
  Clock,
  Key,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// --- Helpers ---
const roleLabels = { ADMIN: "Yönetici", OPERATOR: "Operatör", VIEWER: "İzleyici" };
const roleColors = {
  ADMIN: "bg-purple-500/10 text-purple-600 border-purple-200",
  OPERATOR: "bg-blue-500/10 text-blue-600 border-blue-200",
  VIEWER: "bg-gray-500/10 text-gray-600 border-gray-200",
};
const providerLabels = {
  credentials: "E-posta",
  google: "Google",
  invite: "Davet",
};

function getInitials(firstName, lastName) {
  return `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- Profile Schema ---
const profileSchema = z.object({
  firstName: z.string().min(1, "Ad alanı zorunludur."),
  lastName: z.string().min(1, "Soyad alanı zorunludur."),
  phone: z.string().optional(),
  organizationName: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut şifre zorunludur."),
    newPassword: z.string().min(8, "Yeni şifre en az 8 karakter olmalıdır."),
    confirmPassword: z.string().min(1, "Şifre tekrarı zorunludur."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
  });

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      organizationName: "",
    },
  });

  // Password form
  const {
    register: passwordRegister,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/profile");
      const data = await res.json();

      if (res.ok && data.ok) {
        setProfile(data.data);
        resetProfile({
          firstName: data.data.firstName || "",
          lastName: data.data.lastName || "",
          phone: data.data.phone || "",
          organizationName: data.data.organizationName || "",
        });
      } else {
        toast.error(data.message || "Profil bilgileri alınamadı.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  }, [resetProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Save profile
  const onSaveProfile = async (data) => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (res.ok && result.ok) {
        toast.success("Profil güncellendi.");
        fetchProfile();
      } else {
        toast.error(result.message || "Güncelleme başarısız.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu.");
    }
  };

  // Change password
  const onChangePassword = async (data) => {
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      const result = await res.json();

      if (res.ok && result.ok) {
        toast.success("Şifre başarıyla değiştirildi.");
        resetPassword();
      } else {
        toast.error(result.message || "Şifre değiştirme başarısız.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-halo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-gradient">Profilim</h2>
        <p className="text-sm text-text-muted mt-1">
          Hesap bilgilerinizi görüntüleyin ve düzenleyin
        </p>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column — Profil Bilgileri */}
        <div className="glass p-6 space-y-6">
          <h3 className="text-lg font-semibold text-text-main flex items-center gap-2">
            <User className="h-5 w-5 text-halo-600" />
            Profil Bilgileri
          </h3>

          {/* Avatar */}
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-halo-400 to-halo-600 shadow-lg overflow-hidden">
              {profile?.image ? (
                <img
                  src={profile.image}
                  alt="Avatar"
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {getInitials(profile?.firstName, profile?.lastName)}
                </span>
              )}
            </div>
          </div>

          <form
            onSubmit={handleProfileSubmit(onSaveProfile)}
            className="space-y-4"
          >
            {/* First Name */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-text-main">Ad</Label>
              <Input
                placeholder="Adınız"
                className={cn(
                  "h-12 px-4 text-sm text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm",
                  profileErrors.firstName && "border-red-500"
                )}
                {...profileRegister("firstName")}
              />
              {profileErrors.firstName && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {profileErrors.firstName.message}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-text-main">Soyad</Label>
              <Input
                placeholder="Soyadınız"
                className={cn(
                  "h-12 px-4 text-sm text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm",
                  profileErrors.lastName && "border-red-500"
                )}
                {...profileRegister("lastName")}
              />
              {profileErrors.lastName && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {profileErrors.lastName.message}
                </p>
              )}
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-text-main flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> E-posta
              </Label>
              <Input
                readOnly
                value={profile?.email || ""}
                className="h-12 px-4 text-sm text-black bg-gray-100 border-gray-200 cursor-not-allowed"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-text-main flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Telefon
              </Label>
              <Input
                placeholder="+90 5XX XXX XX XX"
                className="h-12 px-4 text-sm text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm"
                {...profileRegister("phone")}
              />
            </div>

            {/* Organization */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-text-main flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5" /> Organizasyon
              </Label>
              <Input
                placeholder="Şirket adınız"
                className="h-12 px-4 text-sm text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm"
                {...profileRegister("organizationName")}
              />
            </div>

            <Button
              type="submit"
              disabled={profileSubmitting}
              className="w-full h-12 bg-halo-600 hover:bg-halo-700 text-white shadow-md hover:shadow-halo-600/30 transition-all flex items-center justify-center"
            >
              {profileSubmitting ? "Kaydediliyor..." : "Kaydet"}
              {!profileSubmitting && <Save className="ml-2 h-5 w-5" />}
            </Button>
          </form>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Card 1: Şifre Değiştir */}
          <div className="glass p-6 space-y-4">
            <h3 className="text-lg font-semibold text-text-main flex items-center gap-2">
              <Lock className="h-5 w-5 text-halo-600" />
              Şifre Değiştir
            </h3>

            <form
              onSubmit={handlePasswordSubmit(onChangePassword)}
              className="space-y-4"
            >
              {/* Current Password */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-text-main">
                  Mevcut Şifre
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className={cn(
                    "h-12 px-4 text-sm text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm",
                    passwordErrors.currentPassword && "border-red-500"
                  )}
                  {...passwordRegister("currentPassword")}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{" "}
                    {passwordErrors.currentPassword.message}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-text-main">
                  Yeni Şifre
                </Label>
                <Input
                  type="password"
                  placeholder="En az 8 karakter"
                  className={cn(
                    "h-12 px-4 text-sm text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm",
                    passwordErrors.newPassword && "border-red-500"
                  )}
                  {...passwordRegister("newPassword")}
                />
                {passwordErrors.newPassword && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{" "}
                    {passwordErrors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-text-main">
                  Şifre Tekrar
                </Label>
                <Input
                  type="password"
                  placeholder="Yeni şifreyi tekrar girin"
                  className={cn(
                    "h-12 px-4 text-sm text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm",
                    passwordErrors.confirmPassword && "border-red-500"
                  )}
                  {...passwordRegister("confirmPassword")}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{" "}
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={passwordSubmitting}
                className="w-full h-12 bg-gradient-to-r from-halo-600 to-halo-700 hover:from-halo-700 hover:to-halo-800 text-white shadow-md transition-all flex items-center justify-center"
              >
                {passwordSubmitting ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
                {!passwordSubmitting && <Key className="ml-2 h-5 w-5" />}
              </Button>
            </form>
          </div>

          {/* Card 2: Hesap Bilgileri (read-only) */}
          <div className="glass p-6 space-y-4">
            <h3 className="text-lg font-semibold text-text-main flex items-center gap-2">
              <Shield className="h-5 w-5 text-halo-600" />
              Hesap Bilgileri
            </h3>

            <div className="space-y-4">
              {/* Rol */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-white/60">
                <span className="text-sm font-medium text-text-muted">Rol</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium",
                    roleColors[profile?.role] || "bg-gray-500/10 text-gray-600"
                  )}
                >
                  {roleLabels[profile?.role] || profile?.role || "—"}
                </Badge>
              </div>

              {/* Kayıt Tarihi */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-white/60">
                <span className="text-sm font-medium text-text-muted flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Kayıt Tarihi
                </span>
                <span className="text-sm font-medium text-text-main">
                  {formatDate(profile?.createdAt)}
                </span>
              </div>

              {/* Son Giriş */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-white/60">
                <span className="text-sm font-medium text-text-muted flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Son Giriş
                </span>
                <span className="text-sm font-medium text-text-main">
                  {formatDate(profile?.lastLoginAt)}
                </span>
              </div>

              {/* Sağlayıcı */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-white/60">
                <span className="text-sm font-medium text-text-muted flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" /> Sağlayıcı
                </span>
                <span className="text-sm font-medium text-text-main">
                  {providerLabels[profile?.provider] || profile?.provider || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
