"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AssetDetailForm({ asset }) {
  if (!asset) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Varlık Adı</Label>
          <div className="font-medium text-foreground">{asset.name}</div>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Tip</Label>
          <div className="font-medium text-foreground">{asset.type}</div>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Etiket</Label>
          <div className="font-medium text-foreground">{asset.label || "-"}</div>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Açıklama</Label>
        <div className="text-sm text-foreground bg-muted/30 p-3 rounded-md min-h-[80px]">
          {asset.description || "Açıklama bulunmuyor."}
        </div>
      </div>
    </div>
  );
}

export function AssetEditForm({ asset, onSave, onCancel }) {
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      type: "CUSTOM",
      label: "",
      description: "",
    },
  });

  useEffect(() => {
    if (asset) {
      reset({
        name: asset.name || "",
        type: asset.type || "CUSTOM",
        label: asset.label || "",
        description: asset.description || "",
      });
    }
  }, [asset, reset]);

  const onSubmit = (data) => {
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Varlık Adı <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Varlık adı girin"
            {...register("name", { required: "Varlık adı zorunludur" })}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Varlık Tipi</Label>
          <Select
            defaultValue={asset?.type || "CUSTOM"}
            onValueChange={(val) => setValue("type", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tip seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ZONE">Zone (Bölge)</SelectItem>
              <SelectItem value="BUILDING">Building (Bina)</SelectItem>
              <SelectItem value="FLEET">Fleet (Filo)</SelectItem>
              <SelectItem value="LINE">Line (Hat)</SelectItem>
              <SelectItem value="CUSTOM">Custom (Özel)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">Etiket (İsteğe Bağlı)</Label>
          <Input id="label" placeholder="Etiket" {...register("label")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Açıklama</Label>
          <Textarea
            id="description"
            placeholder="Varlık hakkında açıklama"
            className="min-h-[100px]"
            {...register("description")}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit">Kaydet</Button>
      </div>
    </form>
  );
}
