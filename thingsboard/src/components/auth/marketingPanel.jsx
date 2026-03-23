import { Check } from "lucide-react";

export default function MarketingPanel({ title, description, features }) {
  return (
    <div className="hidden md:flex bg-[#0a0a0a] border-r border-white/5 text-white p-10 flex-col justify-between">
      <div>
        <h2
          className="text-white text-3xl font-extrabold leading-tight drop-shadow-sm"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <p className="mt-2 text-gray-300 text-sm font-medium">{description}</p>

        <div className="mt-8 space-y-3 text-sm">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-white/10 p-1">
                <Check className="h-4 w-4 text-red-400" />
              </span>
              <span className="text-gray-300">{feature}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs text-gray-500">
        &copy; {new Date().getFullYear()} Pengona A.Ş. Tüm hakları saklıdır.
      </div>
    </div>
  );
}
