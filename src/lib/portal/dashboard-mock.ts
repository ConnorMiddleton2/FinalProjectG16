import type { TenantDashboardData } from "@/lib/portal/dashboard-types";

/** Isolated mock snapshot for the Current Tenant Dashboard. */
export function getMockTenantDashboard(): TenantDashboardData {
  return {
    tenantName: "Alex Tenant",
    summary: {
      nextRentAmount: "$4,800.00",
      rentDueDate: "May 1, 2026",
      paymentStatus: "Due",
      leaseEndDate: "Dec 31, 2027",
      openMaintenanceCount: 2,
      unreadAnnouncements: 1,
      unreadMessages: 3,
    },
    upcomingPayment: {
      id: "pay-upcoming-1",
      label: "May rent",
      amount: "$4,800.00",
      dueDate: "May 1, 2026",
      status: "Due",
      property: "Pier 12 · Suite 210",
    },
    recentPayments: [
      {
        id: "pay-1",
        label: "April rent · Pier 12",
        amount: "$4,800.00",
        paidOn: "Apr 1, 2026",
        method: "ACH",
        status: "Paid",
      },
      {
        id: "pay-2",
        label: "March rent · Pier 12",
        amount: "$4,800.00",
        paidOn: "Mar 1, 2026",
        method: "Card",
        status: "Paid",
      },
      {
        id: "pay-3",
        label: "Late fee · Canal Yard",
        amount: "$75.00",
        paidOn: "Feb 18, 2026",
        method: "ACH",
        status: "Paid",
      },
    ],
    activeMaintenance: [
      {
        id: "maint-1",
        title: "HVAC not cooling in suite",
        location: "Pier 12 · Suite 210",
        status: "In progress",
        updatedAt: "Apr 28, 2026",
        priority: "High",
      },
      {
        id: "maint-2",
        title: "Lobby badge reader intermittent",
        location: "Pier 12 · Main lobby",
        status: "Scheduled",
        updatedAt: "Apr 26, 2026",
        priority: "Normal",
      },
    ],
    announcements: [
      {
        id: "ann-1",
        title: "Elevator modernization — May 3–5",
        postedAt: "Apr 29, 2026",
        preview:
          "Freight elevator will be offline for modernization. Use the south passenger bank.",
        unread: true,
      },
      {
        id: "ann-2",
        title: "Spring fire drill notice",
        postedAt: "Apr 20, 2026",
        preview:
          "A scheduled fire drill will run on May 8 at 10:00 a.m. Expect brief alarms.",
        unread: false,
      },
    ],
    lease: {
      propertyName: "Pier 12 Commerce",
      unit: "Suite 210",
      term: "Jan 1, 2026 – Dec 31, 2027",
      monthlyRent: "$4,800.00",
      securityDeposit: "$4,800.00",
      endDate: "Dec 31, 2027",
    },
  };
}

/** Empty-state fixture when a tenant account has no dashboard data yet. */
export function getEmptyTenantDashboard(): TenantDashboardData {
  return {
    tenantName: "Tenant",
    summary: {
      nextRentAmount: "—",
      rentDueDate: "—",
      paymentStatus: "Due",
      leaseEndDate: "—",
      openMaintenanceCount: 0,
      unreadAnnouncements: 0,
      unreadMessages: 0,
    },
    upcomingPayment: null,
    recentPayments: [],
    activeMaintenance: [],
    announcements: [],
    lease: null,
  };
}
