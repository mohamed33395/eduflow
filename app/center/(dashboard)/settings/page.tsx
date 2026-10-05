"use client";

import { CenterSettingsForm } from "@/app/components/center/CenterSettingsForm";
import { useAuth } from "@/app/hooks/useAuth";
import { useI18n } from "@/app/lib/i18n/client";

export default function CenterSettingsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const centerId = user?.centerId ?? "";

  if (!centerId) {
    return <p className="text-red-600 text-sm">{t("noCenterAssigned")}</p>;
  }

  return (
    <CenterSettingsForm
      centerId={centerId}
      endpoint={`/api/center/settings?centerId=${encodeURIComponent(centerId)}`}
    />
  );
}
