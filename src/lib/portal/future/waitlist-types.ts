/**
 * Future-tenant waitlist / interest list models.
 * BACKEND_TODO: GET/POST/DELETE /api/portal/future/waitlist
 */

export type WaitlistOccupancyClass = "personal" | "commercial";

export type WaitlistEntryStatus = "active" | "notified" | "cancelled" | "converted";

export type WaitlistEntry = {
  id: string;
  ownerUserId: string | null;
  propertyId: string;
  propertyName: string;
  occupancyClass: WaitlistOccupancyClass;
  unitPreference: string;
  fullName: string;
  email: string;
  phone: string;
  preferredMoveIn: string;
  notes: string;
  status: WaitlistEntryStatus;
  position: number;
  createdAt: string;
};

export type JoinWaitlistInput = {
  ownerUserId?: string | null;
  propertyId: string;
  occupancyClass: WaitlistOccupancyClass;
  unitPreference: string;
  fullName: string;
  email: string;
  phone: string;
  preferredMoveIn: string;
  notes: string;
};
