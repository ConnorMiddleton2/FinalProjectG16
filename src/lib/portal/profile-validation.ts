import type {
  TenantProfileEditable,
  TenantProfileErrors,
} from "@/lib/portal/profile-types";
import {
  enforceMaxLength,
  isPlausibleEmail,
  isPlausiblePhone,
  PORTAL_MAX_MEDIUM_TEXT,
  PORTAL_MAX_NAME_LENGTH,
  PORTAL_MAX_SHORT_TEXT,
} from "@/lib/portal/validation-utils";

export function validateTenantProfile(
  values: TenantProfileEditable
): TenantProfileErrors {
  const errors: TenantProfileErrors = {};

  if (!values.preferredName.trim()) {
    errors.preferredName = "Enter a preferred name.";
  } else if (values.preferredName.trim().length < 2) {
    errors.preferredName = "Preferred name must be at least 2 characters.";
  } else {
    const max = enforceMaxLength(
      values.preferredName,
      PORTAL_MAX_NAME_LENGTH,
      "Preferred name"
    );
    if (max) errors.preferredName = max;
  }

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!isPlausibleEmail(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!isPlausiblePhone(values.phone)) {
    errors.phone = "Enter a valid phone number (at least 10 digits).";
  }

  if (!values.preferredContactMethod) {
    errors.preferredContactMethod = "Select a preferred contact method.";
  }

  if (!values.emergencyContact.name.trim()) {
    errors.emergencyName = "Emergency contact name is required.";
  } else {
    const max = enforceMaxLength(
      values.emergencyContact.name,
      PORTAL_MAX_NAME_LENGTH,
      "Emergency contact name"
    );
    if (max) errors.emergencyName = max;
  }
  if (!values.emergencyContact.phone.trim()) {
    errors.emergencyPhone = "Emergency contact phone is required.";
  } else if (!isPlausiblePhone(values.emergencyContact.phone)) {
    errors.emergencyPhone = "Enter a valid emergency contact phone.";
  }
  if (!values.emergencyContact.relationship.trim()) {
    errors.emergencyRelationship = "Describe the relationship.";
  } else {
    const max = enforceMaxLength(
      values.emergencyContact.relationship,
      PORTAL_MAX_SHORT_TEXT,
      "Relationship"
    );
    if (max) errors.emergencyRelationship = max;
  }

  if (values.vehicle.hasVehicle) {
    if (!values.vehicle.makeModel.trim()) {
      errors.vehicleMakeModel = "Enter make and model, or turn off vehicle.";
    } else {
      const max = enforceMaxLength(
        values.vehicle.makeModel,
        PORTAL_MAX_SHORT_TEXT,
        "Make and model"
      );
      if (max) errors.vehicleMakeModel = max;
    }
    if (!values.vehicle.licensePlate.trim()) {
      errors.vehicleLicensePlate =
        "Enter a license plate, or turn off vehicle.";
    } else {
      const max = enforceMaxLength(
        values.vehicle.licensePlate,
        20,
        "License plate"
      );
      if (max) errors.vehicleLicensePlate = max;
    }
    if (values.vehicle.color.trim()) {
      const max = enforceMaxLength(
        values.vehicle.color,
        PORTAL_MAX_SHORT_TEXT,
        "Color"
      );
      if (max) errors.vehicleColor = max;
    }
    if (values.vehicle.parkingPermit.trim()) {
      const max = enforceMaxLength(
        values.vehicle.parkingPermit,
        PORTAL_MAX_SHORT_TEXT,
        "Parking permit"
      );
      if (max) errors.vehicleParkingPermit = max;
    }
  }

  if (values.pets.hasPets) {
    if (!values.pets.summary.trim()) {
      errors.petSummary = "Add a short pet summary, or turn off pets.";
    } else {
      const max = enforceMaxLength(
        values.pets.summary,
        PORTAL_MAX_SHORT_TEXT,
        "Pet summary"
      );
      if (max) errors.petSummary = max;
    }
    if (values.pets.details.trim()) {
      const max = enforceMaxLength(
        values.pets.details,
        PORTAL_MAX_MEDIUM_TEXT,
        "Pet details"
      );
      if (max) errors.petDetails = max;
    }
  }

  if (
    !values.communication.emailUpdates &&
    !values.communication.smsUpdates &&
    !values.communication.portalMessages &&
    !values.communication.phoneCalls
  ) {
    errors.form =
      "Keep at least one communication channel enabled so Harborline can reach you.";
  }

  return errors;
}

export function editableFromProfile(
  profile: TenantProfileEditable
): TenantProfileEditable {
  return {
    preferredName: profile.preferredName,
    email: profile.email,
    phone: profile.phone,
    preferredContactMethod: profile.preferredContactMethod,
    emergencyContact: { ...profile.emergencyContact },
    vehicle: { ...profile.vehicle },
    pets: { ...profile.pets },
    communication: { ...profile.communication },
  };
}

export function labelContactMethod(value: string) {
  switch (value) {
    case "email":
      return "Email";
    case "phone":
      return "Phone call";
    case "text":
      return "Text message";
    case "portal-message":
      return "Portal message";
    default:
      return "—";
  }
}
