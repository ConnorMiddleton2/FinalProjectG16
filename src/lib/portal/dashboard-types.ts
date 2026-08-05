export type PaymentStatus = "Paid" | "Due" | "Overdue" | "Processing";

export type MaintenanceStatus =
  | "Submitted"
  | "In progress"
  | "Scheduled"
  | "Completed";

export type DashboardSummary = {
  nextRentAmount: string;
  rentDueDate: string;
  paymentStatus: PaymentStatus;
  leaseEndDate: string;
  openMaintenanceCount: number;
  unreadAnnouncements: number;
  unreadMessages: number;
};

export type UpcomingPayment = {
  id: string;
  label: string;
  amount: string;
  dueDate: string;
  status: PaymentStatus;
  property: string;
};

export type RecentPayment = {
  id: string;
  label: string;
  amount: string;
  paidOn: string;
  method: string;
  status: PaymentStatus;
};

export type ActiveMaintenanceRequest = {
  id: string;
  title: string;
  location: string;
  status: MaintenanceStatus;
  updatedAt: string;
  priority: "Low" | "Normal" | "High";
};

export type PropertyAnnouncement = {
  id: string;
  title: string;
  postedAt: string;
  preview: string;
  unread: boolean;
};

export type LeaseSummary = {
  propertyName: string;
  unit: string;
  term: string;
  monthlyRent: string;
  securityDeposit: string;
  endDate: string;
};

export type TenantDashboardData = {
  tenantName: string;
  summary: DashboardSummary;
  upcomingPayment: UpcomingPayment | null;
  recentPayments: RecentPayment[];
  activeMaintenance: ActiveMaintenanceRequest[];
  announcements: PropertyAnnouncement[];
  lease: LeaseSummary | null;
};

export type DashboardLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | { status: "success"; data: TenantDashboardData; source: "live" | "mock" };
