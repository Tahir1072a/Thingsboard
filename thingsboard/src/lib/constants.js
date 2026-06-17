
export const BUTTON_STYLES = {
  base: "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border shadow-sm transition-all duration-200 cursor-pointer backdrop-blur-sm cursor-pointer",

  variants: {
    // Varsayılan (Default): Beyaz zemin, gri metin, hover olunca Halo (Mor) oluyor
    default:
      "bg-white/80 border-halo-200 text-text-muted " +
      "hover:border-halo-400 hover:text-halo-700 hover:bg-halo-50 " +
      "active:scale-95", // Tıklama efekti eklendi

    // Yıkıcı (Destructive/Sil): Kırmızı tonlar (Global CSS'te tanımlı değilse Tailwind varsayılanlarını kullanırız)
    destructive:
      "bg-white/80 border-red-200 text-red-600 " +
      "hover:border-red-400 hover:bg-red-50 " +
      "active:scale-95",

    // Birincil (Primary): Tamamen dolu mor buton (Örn: "Kaydet" için)
    primary:
      "bg-halo-600 text-white border-transparent " +
      "hover:bg-halo-700 hover:shadow-md " +
      "active:scale-95",
  },
};

export const FORM_STYLES = {
  // Tüm inputlar için ortak temel özellikler (Radius, font, animasyon vb.)
  base: "flex w-full rounded-xl border px-3 py-2 text-base transition-all duration-200 backdrop-blur-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:opacity-100 disabled:cursor-not-allowed",

  variants: {
    // 1. Okuma Modu (Senin beğendiğin "Glass/Disabled" stili)
    // Arka plan daha şeffaf (white/40), border daha silik.
    readOnly:
      "h-12 bg-white/40 border-white/30 text-text-main shadow-sm placeholder:text-black/20",

    // 2. Düzenleme Modu (Aktif Input)
    // Arka plan daha mat (white/80), odaklanınca Halo rengi yanar.
    editable:
      "h-12 bg-white/80 border-white/60 text-text-main focus-visible:ring-2 focus-visible:ring-halo-400 focus-visible:border-halo-500 shadow-sm",

    // 3. Textarea için özel (Yükseklik ayarı ve resize kapalı)
    textareaReadOnly:
      "min-h-[120px] resize-none bg-white/40 border-white/30 text-text-main shadow-sm placeholder:text-black/20 py-3",
    textareaEditable:
      "min-h-[120px] resize-none bg-white/80 border-white/60 text-text-main focus-visible:ring-2 focus-visible:ring-halo-400 py-3",

    // 4. Label Stili
    label: "text-sm font-semibold text-text-muted mb-2 flex items-center gap-2",
  },
};
