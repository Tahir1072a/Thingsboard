"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * ConfirmModal — Tarayıcı confirm() yerine kullanılan şık onay diyaloğu.
 *
 * Kullanım:
 * const { confirm, ConfirmDialog } = useConfirm();
 * const ok = await confirm({ title: "Silme Onayı", message: "Emin misiniz?" });
 * if (ok) { ... }
 *
 * JSX: <ConfirmDialog />
 */
export function useConfirm() {
  const [state, setState] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Onayla",
    cancelText: "İptal",
    danger: false,
    resolve: null,
  });

  const confirm = ({ title, message, confirmText, cancelText, danger = true }) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: title || "Onay Gerekli",
        message: message || "Bu işlemi gerçekleştirmek istediğinizden emin misiniz?",
        confirmText: confirmText || "Onayla",
        cancelText: cancelText || "İptal",
        danger,
        resolve,
      });
    });
  };

  const handleClose = (result) => {
    state.resolve?.(result);
    setState((prev) => ({ ...prev, open: false }));
  };

  const ConfirmDialog = () => (
    <Dialog open={state.open} onOpenChange={(open) => !open && handleClose(false)}>
      <DialogContent className="glass-strong sm:max-w-md p-0 overflow-hidden border-white/20">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              state.danger
                ? "bg-red-100 text-red-600"
                : "bg-halo-100 text-halo-600"
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-text-main">
                {state.title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4">
          <DialogDescription className="text-sm text-text-muted leading-relaxed">
            {state.message}
          </DialogDescription>
        </div>

        <DialogFooter className="bg-gray-50/50 px-6 py-4 border-t border-white/10 flex flex-row justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="h-10 px-5 border-gray-300 text-gray-600 bg-white hover:bg-gray-100"
          >
            {state.cancelText}
          </Button>
          <Button
            onClick={() => handleClose(true)}
            className={`h-10 px-5 text-white ${
              state.danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-halo-600 hover:bg-halo-700"
            }`}
          >
            {state.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, ConfirmDialog };
}
