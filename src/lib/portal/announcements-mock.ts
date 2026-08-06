import type { TenantAnnouncement } from "@/lib/portal/announcements-types";

/** Isolated mock announcements for the current-tenant portal. */
export function getMockAnnouncements(): TenantAnnouncement[] {
  return [
    {
      id: "ann-1",
      title: "Scheduled fire drill — May 8",
      category: "Safety notices",
      publishDate: "2026-04-20",
      expirationDate: "2026-05-09",
      priority: "Urgent",
      message:
        "A scheduled fire drill will run on May 8 at 10:00 a.m. Expect brief alarms on all floors. You do not need to evacuate unless staff directs you. Keep stairwells clear and follow floor warden instructions if an actual evacuation is announced.",
      attachment: {
        id: "att-1",
        fileName: "fire-drill-notice-may-2026.pdf",
        fileType: "PDF",
        fileSizeLabel: "110 KB",
      },
    },
    {
      id: "ann-2",
      title: "Garage Level B overnight sealing",
      category: "Parking notices",
      publishDate: "2026-03-28",
      expirationDate: "2026-04-05",
      priority: "High",
      message:
        "Garage Level B will be closed April 4 from 1:00 a.m. to 5:00 a.m. for floor sealing. Move vehicles to Lot C overnight if you typically park in B-14 or B-15. Daytime access resumes at 5:00 a.m.",
      attachment: null,
    },
    {
      id: "ann-3",
      title: "April rent reminder",
      category: "Payment reminders",
      publishDate: "2026-03-28",
      expirationDate: "2026-04-06",
      priority: "Normal",
      message:
        "April rent of $4,800.00 is due May 1. You can pay in the portal under Payments. Autopay drafts on the 1st when enabled. Contact management if you need a payment arrangement before the due date.",
      attachment: null,
    },
    {
      id: "ann-4",
      title: "Lobby package room hours update",
      category: "Package notices",
      publishDate: "2026-04-22",
      expirationDate: null,
      priority: "Normal",
      message:
        "The Pier 12 package room is now open weekdays 8:00 a.m.–6:00 p.m. and Saturdays 9:00 a.m.–1:00 p.m. Bring photo identification to pick up. Oversized deliveries still require dock appointments.",
      attachment: null,
    },
    {
      id: "ann-5",
      title: "Harborline office closed for Memorial Day",
      category: "Office closures",
      publishDate: "2026-04-25",
      expirationDate: "2026-05-27",
      priority: "High",
      message:
        "The Harborline management office will be closed Monday, May 25 for Memorial Day. Emergency maintenance remains available through the portal and the after-hours line. Regular office hours resume Tuesday, May 26.",
      attachment: null,
    },
    {
      id: "ann-6",
      title: "Pier 12 courtyard summer market",
      category: "Community events",
      publishDate: "2026-04-15",
      expirationDate: "2026-06-15",
      priority: "Low",
      message:
        "Join neighbors for the Pier 12 courtyard summer market on June 14 from 11:00 a.m. to 3:00 p.m. Local vendors, live acoustic sets, and family activities. RSVP is optional but helps us plan seating.",
      attachment: {
        id: "att-2",
        fileName: "summer-market-flyer.pdf",
        fileType: "PDF",
        fileSizeLabel: "420 KB",
      },
    },
    {
      id: "ann-7",
      title: "Quiet hours reminder",
      category: "Policy reminders",
      publishDate: "2026-04-10",
      expirationDate: null,
      priority: "Normal",
      message:
        "Quiet hours remain 10:00 p.m. to 7:00 a.m. seven days a week. Construction and loud deliveries should be scheduled outside those windows. Report repeated disturbances through Messages.",
      attachment: {
        id: "att-3",
        fileName: "pier12-building-rules.pdf",
        fileType: "PDF",
        fileSizeLabel: "500 KB",
      },
    },
    {
      id: "ann-8",
      title: "Domestic water pressure testing — Suite corridor",
      category: "Service interruptions",
      publishDate: "2026-04-27",
      expirationDate: "2026-04-30",
      priority: "Urgent",
      message:
        "Water pressure testing will briefly interrupt domestic water on April 29 from 9:00 a.m. to 11:00 a.m. for Suite 210–230 corridors. Store water if needed and avoid starting dishwashers during the window. Work may finish early.",
      attachment: null,
    },
    {
      id: "ann-9",
      title: "Elevator modernization progress",
      category: "Property updates",
      publishDate: "2026-04-12",
      expirationDate: null,
      priority: "Low",
      message:
        "Cab finishes in Elevator 2 are complete. Elevator 1 modernization continues evenings next week. Expect occasional longer wait times after 6:00 p.m. Freight elevator remains available for approved move appointments.",
      attachment: null,
    },
    {
      id: "ann-10",
      title: "Visitor parking Lot C guidance",
      category: "Parking notices",
      publishDate: "2026-03-20",
      expirationDate: null,
      priority: "Normal",
      message:
        "Visitor parking remains Lot C after 5:00 p.m. and on weekends. Daytime visitors should use metered spaces on Harborline Pier. Towing is enforced for unmarked overnight stays in reserved garage stalls.",
      attachment: null,
    },
    {
      id: "ann-11",
      title: "Pet relief area landscaping",
      category: "Property updates",
      publishDate: "2026-04-08",
      expirationDate: "2026-04-12",
      priority: "Low",
      message:
        "Landscaping refresh at the east pet relief area ran April 9–11. The area is open again. Please bag waste and use the provided stations.",
      attachment: null,
    },
    {
      id: "ann-12",
      title: "After-hours emergency contact card",
      category: "Safety notices",
      publishDate: "2026-01-15",
      expirationDate: null,
      priority: "High",
      message:
        "For life-threatening emergencies call 911 first. For urgent building issues after office hours, use the portal emergency banner contacts or the after-hours line printed on your welcome packet. Non-urgent requests should go through Maintenance.",
      attachment: {
        id: "att-4",
        fileName: "after-hours-contacts.pdf",
        fileType: "PDF",
        fileSizeLabel: "84 KB",
      },
    },
    {
      id: "ann-13",
      title: "Lease renewal window opens soon",
      category: "Lease updates",
      publishDate: "2026-04-26",
      expirationDate: "2026-09-30",
      priority: "High",
      message:
        "Your Pier 12 · Suite 210 lease renewal window opens this summer. Review your current lease in Documents, then submit a renewal request under Lease when you are ready. Management will confirm terms before any signed renewal appears in your document center.",
      attachment: null,
    },
    {
      id: "ann-14",
      title: "Heating and cooling filter maintenance corridor notice",
      category: "Service interruptions",
      publishDate: "2026-04-24",
      expirationDate: "2026-05-03",
      priority: "Normal",
      message:
        "Building heating and cooling filter service is scheduled for May 1–2 on floors 2–3. Expect short temperature swings while technicians work. If your suite has an open maintenance request, you will also see updates under Maintenance.",
      attachment: null,
    },
  ];
}
