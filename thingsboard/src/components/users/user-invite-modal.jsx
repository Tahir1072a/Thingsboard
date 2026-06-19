"use client";

import { useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Save, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const inviteSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  firstName: z.string().min(1, "Ad alanı zorunludur."),
  lastName: z.string().min(1, "Soyad alanı zorunludur."),
  role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]).default("OPERATOR"),
});

export default function UserInviteModal({ open, onOpenChange, onSuccess }) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "OPERATOR",
    },
  });

  const onSubmit = useCallback(
    async (data) => {
      try {
        const res = await fetch("/api/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.message || "Hata oluştu");

        toast.success("Davet gönderildi");
        reset();
        onSuccess?.();
        onOpenChange(false);
      } catch (error) {
        console.error("User invite error:", error);
        toast.error(error.message || "Bir hata oluştu");
      }
    },
    [onOpenChange, onSuccess, reset]
  );

  // Reset form when dialog opens
  const handleOpenChange = (isOpen) => {
    if (isOpen) {
      reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg p-0 overflow-hidden border-white/20 max-h-[90vh] flex flex-col">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col h-full overflow-hidden"
        >
          {/* Header */}
          <DialogHeader className="bg-halo-50/50 px-6 py-5 animate-fade-in shrink-0">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-text-main">
              <div className="p-2 bg-halo-100 rounded-lg">
                <UserPlus className="h-6 w-6 text-halo-600" />
              </div>
              Kullanıcı Davet Et
            </DialogTitle>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label className="text-base font-bold text-text-main">
                E-posta <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="ornek@sirket.com"
                className={cn(
                  "h-14 px-4 text-base text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm placeholder:text-gray-400",
                  errors.email && "border-red-500 focus-visible:ring-red-500"
                )}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-red-500 text-xs flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> {errors.email.message}
                </p>
              )}
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label className="text-base font-bold text-text-main">
                Ad <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Ad"
                className={cn(
                  "h-14 px-4 text-base text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm placeholder:text-gray-400",
                  errors.firstName && "border-red-500 focus-visible:ring-red-500"
                )}
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-red-500 text-xs flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> {errors.firstName.message}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label className="text-base font-bold text-text-main">
                Soyad <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Soyad"
                className={cn(
                  "h-14 px-4 text-base text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm placeholder:text-gray-400",
                  errors.lastName && "border-red-500 focus-visible:ring-red-500"
                )}
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-red-500 text-xs flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> {errors.lastName.message}
                </p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label className="text-base font-bold text-text-main">Rol</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="h-14 w-full px-4 text-base bg-white/90 border-gray-200 focus:ring-2 focus:ring-halo-600 cursor-pointer">
                      <SelectValue placeholder="Rol seçiniz" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl">
                      <SelectItem
                        value="ADMIN"
                        className="py-3 cursor-pointer focus:bg-halo-50"
                      >
                        Yönetici
                      </SelectItem>
                      <SelectItem
                        value="OPERATOR"
                        className="py-3 cursor-pointer focus:bg-halo-50"
                      >
                        Operatör
                      </SelectItem>
                      <SelectItem
                        value="VIEWER"
                        className="py-3 cursor-pointer focus:bg-halo-50"
                      >
                        İzleyici
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="bg-halo-50/30 px-6 py-4 border-t border-white/10 shrink-0 flex flex-row justify-end gap-3 backdrop-blur-sm">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 px-6 text-base border-gray-300 text-gray-600 bg-white hover:bg-gray-100"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 px-8 text-base bg-halo-600 hover:bg-halo-700 text-white shadow-md hover:shadow-halo-600/30 transition-all flex items-center"
            >
              {isSubmitting ? "Gönderiliyor..." : "Davet Gönder"}
              {!isSubmitting && <Save className="ml-2 h-5 w-5" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
