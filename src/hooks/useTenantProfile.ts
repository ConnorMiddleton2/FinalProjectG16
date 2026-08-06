"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ProfileLoadState,
  TenantProfile,
  TenantProfileEditable,
  TenantProfileErrors,
} from "@/lib/portal/profile-types";
import {
  editableFromProfile,
  validateTenantProfile,
} from "@/lib/portal/profile-validation";
import {
  emptyTenantMessage,
  getTenant,
  getTenantDemoFixture,
  updateTenant,
} from "@/lib/portal/services/tenantService";

/**
 * Loads and updates tenant profile contact preferences.
 * Legal identity / occupancy fields stay read-only — no unverified identity edits.
 */
export function useTenantProfile() {
  const [state, setState] = useState<ProfileLoadState>({ status: "loading" });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TenantProfileEditable | null>(null);
  const [errors, setErrors] = useState<TenantProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const applyProfile = useCallback(
    (profile: TenantProfile | null, source: "live" | "mock") => {
      if (!profile) {
        setState({
          status: "empty",
          message: emptyTenantMessage(),
        });
        return;
      }
      setState({ status: "success", profile, source });
    },
    []
  );

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setEditing(false);
    setDraft(null);
    setErrors({});
    setSaveError(null);
    try {
      const result = await getTenant();
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      applyProfile(result.data, result.source);
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not load your profile.",
      });
    }
  }, [applyProfile]);

  const loadDemoData = useCallback(() => {
    applyProfile(getTenantDemoFixture(), "mock");
  }, [applyProfile]);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = useCallback(() => {
    if (state.status !== "success") return;
    setDraft(editableFromProfile(state.profile));
    setErrors({});
    setSaveError(null);
    setSuccessMessage(null);
    setEditing(true);
  }, [state]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(null);
    setErrors({});
    setSaveError(null);
  }, []);

  const updateDraft = useCallback(
    <K extends keyof TenantProfileEditable>(
      key: K,
      value: TenantProfileEditable[K]
    ) => {
      setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.form;
        if (key === "preferredName") delete next.preferredName;
        if (key === "email") delete next.email;
        if (key === "phone") delete next.phone;
        if (key === "preferredContactMethod") delete next.preferredContactMethod;
        if (key === "emergencyContact") {
          delete next.emergencyName;
          delete next.emergencyPhone;
          delete next.emergencyRelationship;
        }
        if (key === "vehicle") {
          delete next.vehicleMakeModel;
          delete next.vehicleLicensePlate;
        }
        if (key === "pets") delete next.petSummary;
        return next;
      });
      setSaveError(null);
      setSuccessMessage(null);
    },
    []
  );

  const save = useCallback(async () => {
    if (saving) return false;
    if (state.status !== "success" || !draft) return false;

    const nextErrors = validateTenantProfile(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSaveError("Fix the highlighted fields before saving.");
      return false;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const result = await updateTenant(
        {
          legalName: state.profile.legalName,
          propertyName: state.profile.propertyName,
          unitNumber: state.profile.unitNumber,
          occupancyClass: state.profile.occupancyClass,
          propertyType: state.profile.propertyType,
          tenantId: state.profile.tenantId,
          leaseStatus: state.profile.leaseStatus,
        },
        draft
      );
      if (!result.ok) {
        setSaveError(result.error.message);
        return false;
      }
      setState({ status: "success", profile: result.data, source: result.source });
      setEditing(false);
      setDraft(null);
      setErrors({});
      setSuccessMessage("Profile updated successfully.");
      window.setTimeout(() => setSuccessMessage(null), 4000);
      return true;
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Could not save your profile. Try again."
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [draft, state, saving]);

  return {
    state,
    editing,
    draft,
    errors,
    saving,
    saveError,
    successMessage,
    reload: () => void load(),
    loadDemoData,
    startEdit,
    cancelEdit,
    updateDraft,
    save,
  };
}
