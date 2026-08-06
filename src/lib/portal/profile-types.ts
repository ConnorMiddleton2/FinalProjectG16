import type {
  OccupancyClass,
  PortalPropertyType,
} from "@/lib/portal/occupancy";

export type PreferredContactMethod =
  | "email"
  | "phone"
  | "text"
  | "portal-message";

export type LeaseStatusLabel =
  | "Active"
  | "Expiring soon"
  | "Pending renewal"
  | "Expired"
  | "Ended";

/** Identity / occupancy fields — read-only in the portal. */
export type TenantProfileIdentity = {
  legalName: string;
  propertyName: string;
  unitNumber: string;
  occupancyClass: OccupancyClass;
  propertyType: PortalPropertyType;
  tenantId: string;
  leaseStatus: LeaseStatusLabel;
};

export type EmergencyContact = {
  name: string;
  phone: string;
  relationship: string;
};

export type VehicleInformation = {
  hasVehicle: boolean;
  makeModel: string;
  color: string;
  licensePlate: string;
  parkingPermit: string;
};

export type PetInformation = {
  hasPets: boolean;
  summary: string;
  details: string;
};

export type CommunicationPreferences = {
  emailUpdates: boolean;
  smsUpdates: boolean;
  portalMessages: boolean;
  phoneCalls: boolean;
  marketingOptIn: boolean;
};

/** Fields the tenant may edit without identity verification. */
export type TenantProfileEditable = {
  preferredName: string;
  email: string;
  phone: string;
  preferredContactMethod: PreferredContactMethod | "";
  emergencyContact: EmergencyContact;
  vehicle: VehicleInformation;
  pets: PetInformation;
  communication: CommunicationPreferences;
};

export type TenantProfile = TenantProfileIdentity & TenantProfileEditable;

export type TenantProfileErrors = Partial<{
  preferredName: string;
  email: string;
  phone: string;
  preferredContactMethod: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  vehicleMakeModel: string;
  vehicleLicensePlate: string;
  vehicleColor: string;
  vehicleParkingPermit: string;
  petSummary: string;
  petDetails: string;
  form: string;
}>;

export type ProfileLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | {
      status: "success";
      profile: TenantProfile;
      source: "live" | "mock";
    };

export const PREFERRED_CONTACT_METHODS: Array<{
  value: PreferredContactMethod;
  label: string;
}> = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone call" },
  { value: "text", label: "Text message" },
  { value: "portal-message", label: "Portal message" },
];
