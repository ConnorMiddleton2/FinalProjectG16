export type LeaseStatus =
  | "Active"
  | "Expiring soon"
  | "Pending renewal"
  | "Expired"
  | "Ended";

export type LeaseOccupant = {
  id: string;
  name: string;
  role: "Primary tenant" | "Co-tenant" | "Occupant" | "Authorized occupant";
};

export type LeaseParkingInfo = {
  spaces: number;
  locations: string;
  permits: string;
  notes: string;
};

export type LeasePetInfo = {
  allowed: boolean;
  summary: string;
  details: string;
};

/**
 * Tenant-facing lease information only.
 * Do not add private management notes or internal ops fields here.
 */
export type LeaseInformation = {
  id: string;
  leaseNumber: string;
  status: LeaseStatus;
  propertyName: string;
  propertyAddress: string;
  unitNumber: string;
  /** ISO date YYYY-MM-DD */
  leaseStartDate: string;
  /** ISO date YYYY-MM-DD */
  leaseEndDate: string;
  monthlyRent: string;
  securityDeposit: string;
  occupants: LeaseOccupant[];
  parking: LeaseParkingInfo;
  pets: LeasePetInfo;
  /** ISO date YYYY-MM-DD */
  renewalDeadline: string;
  moveOutNoticeRequirement: string;
  documentTitle: string;
  documentFileName: string;
};

export type LeaseLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | {
      status: "success";
      lease: LeaseInformation;
      source: "live" | "mock";
    };
