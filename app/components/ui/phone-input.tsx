"use client";

import { useMemo } from "react";
import { useI18n } from "@/app/lib/i18n/client";
import { cn } from "@/app/lib/utils";

interface Country {
  iso: string;
  dial: string;
  flag: string;
  ar: string;
  en: string;
}

/** Countries offered in the selector — extend as needed. */
const COUNTRIES: Country[] = [
  { iso: "SA", dial: "966", flag: "🇸🇦", ar: "السعودية", en: "Saudi Arabia" },
  { iso: "EG", dial: "20", flag: "🇪🇬", ar: "مصر", en: "Egypt" },
  { iso: "AE", dial: "971", flag: "🇦🇪", ar: "الإمارات", en: "UAE" },
  { iso: "KW", dial: "965", flag: "🇰🇼", ar: "الكويت", en: "Kuwait" },
  { iso: "QA", dial: "974", flag: "🇶🇦", ar: "قطر", en: "Qatar" },
  { iso: "BH", dial: "973", flag: "🇧🇭", ar: "البحرين", en: "Bahrain" },
  { iso: "OM", dial: "968", flag: "🇴🇲", ar: "عُمان", en: "Oman" },
  { iso: "JO", dial: "962", flag: "🇯🇴", ar: "الأردن", en: "Jordan" },
  { iso: "IQ", dial: "964", flag: "🇮🇶", ar: "العراق", en: "Iraq" },
  { iso: "PS", dial: "970", flag: "🇵🇸", ar: "فلسطين", en: "Palestine" },
  { iso: "LB", dial: "961", flag: "🇱🇧", ar: "لبنان", en: "Lebanon" },
  { iso: "SY", dial: "963", flag: "🇸🇾", ar: "سوريا", en: "Syria" },
  { iso: "YE", dial: "967", flag: "🇾🇪", ar: "اليمن", en: "Yemen" },
  { iso: "LY", dial: "218", flag: "🇱🇾", ar: "ليبيا", en: "Libya" },
  { iso: "TN", dial: "216", flag: "🇹🇳", ar: "تونس", en: "Tunisia" },
  { iso: "DZ", dial: "213", flag: "🇩🇿", ar: "الجزائر", en: "Algeria" },
  { iso: "MA", dial: "212", flag: "🇲🇦", ar: "المغرب", en: "Morocco" },
  { iso: "SD", dial: "249", flag: "🇸🇩", ar: "السودان", en: "Sudan" },
  { iso: "MR", dial: "222", flag: "🇲🇷", ar: "موريتانيا", en: "Mauritania" },
  { iso: "SO", dial: "252", flag: "🇸🇴", ar: "الصومال", en: "Somalia" },
  { iso: "DJ", dial: "253", flag: "🇩🇯", ar: "جيبوتي", en: "Djibouti" },
  { iso: "KM", dial: "269", flag: "🇰🇲", ar: "جزر القمر", en: "Comoros" },
  { iso: "TR", dial: "90", flag: "🇹🇷", ar: "تركيا", en: "Turkey" },
  { iso: "PK", dial: "92", flag: "🇵🇰", ar: "باكستان", en: "Pakistan" },
  { iso: "IN", dial: "91", flag: "🇮🇳", ar: "الهند", en: "India" },
  { iso: "BD", dial: "880", flag: "🇧🇩", ar: "بنغلادش", en: "Bangladesh" },
  { iso: "MY", dial: "60", flag: "🇲🇾", ar: "ماليزيا", en: "Malaysia" },
  { iso: "ID", dial: "62", flag: "🇮🇩", ar: "إندونيسيا", en: "Indonesia" },
  { iso: "GB", dial: "44", flag: "🇬🇧", ar: "بريطانيا", en: "United Kingdom" },
  { iso: "IE", dial: "353", flag: "🇮🇪", ar: "أيرلندا", en: "Ireland" },
  { iso: "FR", dial: "33", flag: "🇫🇷", ar: "فرنسا", en: "France" },
  { iso: "DE", dial: "49", flag: "🇩🇪", ar: "ألمانيا", en: "Germany" },
  { iso: "IT", dial: "39", flag: "🇮🇹", ar: "إيطاليا", en: "Italy" },
  { iso: "ES", dial: "34", flag: "🇪🇸", ar: "إسبانيا", en: "Spain" },
  { iso: "PT", dial: "351", flag: "🇵🇹", ar: "البرتغال", en: "Portugal" },
  { iso: "NL", dial: "31", flag: "🇳🇱", ar: "هولندا", en: "Netherlands" },
  { iso: "BE", dial: "32", flag: "🇧🇪", ar: "بلجيكا", en: "Belgium" },
  { iso: "CH", dial: "41", flag: "🇨🇭", ar: "سويسرا", en: "Switzerland" },
  { iso: "AT", dial: "43", flag: "🇦🇹", ar: "النمسا", en: "Austria" },
  { iso: "SE", dial: "46", flag: "🇸🇪", ar: "السويد", en: "Sweden" },
  { iso: "NO", dial: "47", flag: "🇳🇴", ar: "النرويج", en: "Norway" },
  { iso: "DK", dial: "45", flag: "🇩🇰", ar: "الدنمارك", en: "Denmark" },
  { iso: "FI", dial: "358", flag: "🇫🇮", ar: "فنلندا", en: "Finland" },
  { iso: "PL", dial: "48", flag: "🇵🇱", ar: "بولندا", en: "Poland" },
  { iso: "CZ", dial: "420", flag: "🇨🇿", ar: "التشيك", en: "Czechia" },
  { iso: "GR", dial: "30", flag: "🇬🇷", ar: "اليونان", en: "Greece" },
  { iso: "RO", dial: "40", flag: "🇷🇴", ar: "رومانيا", en: "Romania" },
  { iso: "HU", dial: "36", flag: "🇭🇺", ar: "المجر", en: "Hungary" },
  { iso: "UA", dial: "380", flag: "🇺🇦", ar: "أوكرانيا", en: "Ukraine" },
  { iso: "RU", dial: "7", flag: "🇷🇺", ar: "روسيا", en: "Russia" },
  { iso: "US", dial: "1", flag: "🇺🇸", ar: "أمريكا", en: "USA" },
  { iso: "CA", dial: "1", flag: "🇨🇦", ar: "كندا", en: "Canada" },
  { iso: "MX", dial: "52", flag: "🇲🇽", ar: "المكسيك", en: "Mexico" },
  { iso: "BR", dial: "55", flag: "🇧🇷", ar: "البرازيل", en: "Brazil" },
  { iso: "AR", dial: "54", flag: "🇦🇷", ar: "الأرجنتين", en: "Argentina" },
  { iso: "AU", dial: "61", flag: "🇦🇺", ar: "أستراليا", en: "Australia" },
  { iso: "NZ", dial: "64", flag: "🇳🇿", ar: "نيوزيلندا", en: "New Zealand" },
  { iso: "CN", dial: "86", flag: "🇨🇳", ar: "الصين", en: "China" },
  { iso: "JP", dial: "81", flag: "🇯🇵", ar: "اليابان", en: "Japan" },
  { iso: "KR", dial: "82", flag: "🇰🇷", ar: "كوريا الجنوبية", en: "South Korea" },
  { iso: "SG", dial: "65", flag: "🇸🇬", ar: "سنغافورة", en: "Singapore" },
  { iso: "ZA", dial: "27", flag: "🇿🇦", ar: "جنوب أفريقيا", en: "South Africa" },
  { iso: "NG", dial: "234", flag: "🇳🇬", ar: "نيجيريا", en: "Nigeria" },
  { iso: "KE", dial: "254", flag: "🇰🇪", ar: "كينيا", en: "Kenya" },
  { iso: "ET", dial: "251", flag: "🇪🇹", ar: "إثيوبيا", en: "Ethiopia" },
  { iso: "GH", dial: "233", flag: "🇬🇭", ar: "غانا", en: "Ghana" },
];

/** Longest dial codes first so detection prefers e.g. 966 over 96. */
const BY_DIAL_LENGTH = [...COUNTRIES].sort(
  (a, b) => b.dial.length - a.dial.length
);

function parsePhone(raw: string): {
  iso: string | null;
  national: string;
  international: boolean;
} {
  const cleaned = raw.trim().replace(/[\s()-]/g, "");
  const international = cleaned.startsWith("+") || cleaned.startsWith("00");
  const digits = cleaned.replace(/^\+|^00/, "").replace(/\D/g, "");
  if (!international) return { iso: null, national: digits, international };
  const match = BY_DIAL_LENGTH.find((c) => digits.startsWith(c.dial));
  if (match) {
    return {
      iso: match.iso,
      national: digits.slice(match.dial.length).replace(/^0+/, ""),
      international,
    };
  }
  return { iso: null, national: digits, international };
}

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Dial code used when the number has no + prefix. Defaults to KSA. */
  defaultDial?: string;
  disabled?: boolean;
  required?: boolean;
}

export function PhoneInput({
  label,
  value,
  onChange,
  defaultDial = "966",
  disabled,
  required,
}: PhoneInputProps) {
  const { locale, t } = useI18n();
  const parsed = useMemo(() => parsePhone(value ?? ""), [value]);
  const fallback =
    COUNTRIES.find((c) => c.dial === defaultDial) ?? COUNTRIES[0];
  const country = parsed.iso
    ? (COUNTRIES.find((c) => c.iso === parsed.iso) ?? fallback)
    : fallback;
  const national = parsed.international
    ? parsed.national
    : parsed.national.replace(/^0+/, "");

  const emit = (dial: string, nationalDigits: string) => {
    const d = nationalDigits.replace(/\D/g, "");
    onChange(d ? `+${dial}${d}` : "");
  };

  const handleNumber = (raw: string) => {
    const s = raw.trim();
    // Full international typed in the field → let parsing detect the country.
    if (s.startsWith("+") || s.startsWith("00")) {
      onChange(`+${s.replace(/^\++|^00/, "").replace(/\D/g, "")}`);
      return;
    }
    emit(country.dial, s);
  };

  const handleCountry = (iso: string) => {
    const next = COUNTRIES.find((c) => c.iso === iso) ?? country;
    emit(next.dial, national);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="ms-1 text-red-500">*</span>}
        </label>
      )}
      <div
        dir="ltr"
        className={cn(
          "flex h-10 w-full items-stretch overflow-hidden rounded-md border border-input bg-background",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <select
          aria-label={t("country")}
          disabled={disabled}
          value={country.iso}
          onChange={(e) => handleCountry(e.target.value)}
          className="w-[6.5rem] shrink-0 cursor-pointer border-e border-input bg-muted/40 px-1.5 text-sm outline-none"
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso + c.dial} value={c.iso}>
              {c.flag} +{c.dial} {locale === "ar" ? c.ar : c.en}
            </option>
          ))}
        </select>
        <span className="flex items-center px-2 text-sm text-muted-foreground" dir="ltr">
          +{country.dial}
        </span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          dir="ltr"
          disabled={disabled}
          required={required}
          value={national}
          onChange={(e) => handleNumber(e.target.value)}
          placeholder={locale === "ar" ? "رقم الهاتف" : "Phone number"}
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
