/**
 * Electronic lease signature package (separate from offer accept/decline).
 * BACKEND_TODO: GET/POST /api/portal/future/lease-sign
 */

export type LeaseSignStatus =
  | "awaiting_signature"
  | "signed"
  | "voided"
  | "expired";

export type LeaseSignDocument = {
  id: string;
  title: string;
  pages: number;
};

export type LeaseSignPackage = {
  id: string;
  ownerUserId: string;
  propertyName: string;
  unitLabel: string;
  occupancyClass: "personal" | "commercial";
  rentLabel: string;
  leaseTerm: string;
  status: LeaseSignStatus;
  documents: LeaseSignDocument[];
  signerName: string | null;
  signedAt: string | null;
  expiresAt: string;
};

export type CompleteLeaseSignInput = {
  signerName: string;
  agreedToTerms: boolean;
};
