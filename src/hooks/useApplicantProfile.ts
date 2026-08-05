"use client";

import { useCallback, useEffect, useState } from "react";
import {
  emptyApplicantProfile,
  readApplicantApplications,
  readApplicantProfile,
  writeApplicantProfile,
  type ApplicantApplicationSummary,
  type ApplicantProfile,
} from "@/lib/applicant-profile";

export function useApplicantProfile() {
  const [profile, setProfile] = useState<ApplicantProfile>(
    emptyApplicantProfile
  );
  const [applications, setApplications] = useState<
    ApplicantApplicationSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    setError(null);
    try {
      setProfile(readApplicantProfile());
      setApplications(readApplicantApplications());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load applicant profile from this browser."
      );
      setProfile(emptyApplicantProfile());
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const save = useCallback(async (next: ApplicantProfile) => {
    setSaving(true);
    setError(null);
    try {
      const stamped = {
        ...next,
        updatedAt: new Date().toISOString(),
      };
      writeApplicantProfile(stamped);
      setProfile(stamped);
      return stamped;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not save applicant profile in this browser.";
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    profile,
    applications,
    loading,
    error,
    saving,
    refresh,
    save,
  };
}
