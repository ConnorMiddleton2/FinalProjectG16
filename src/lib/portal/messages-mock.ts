import type { PortalConversation } from "@/lib/portal/messages-types";

/** Isolated mock conversations — async inbox style, not live chat. */
export function getMockConversations(): PortalConversation[] {
  return [
    {
      id: "conv-1",
      subject: "April rent confirmation",
      category: "Payment Question",
      lastMessageAt: "2026-04-28T15:42:00",
      preview: "Thanks — we see your April payment posted.",
      unreadCount: 1,
      messages: [
        {
          id: "msg-1a",
          conversationId: "conv-1",
          senderRole: "tenant",
          senderName: "Alex Tenant",
          body: "Hi — can you confirm my April rent payment of $4,800 posted? I paid on April 1.",
          sentAt: "2026-04-27T09:18:00",
          attachments: [],
          deliveryStatus: "sent",
        },
        {
          id: "msg-1b",
          conversationId: "conv-1",
          senderRole: "management",
          senderName: "Harborline Billing",
          body: "Thanks — we see your April payment posted. Receipt is also in Documents under Payment Receipts.",
          sentAt: "2026-04-28T15:42:00",
          attachments: [
            {
              id: "att-1",
              fileName: "receipt-apr-2026-rent.txt",
              fileType: "TXT",
              fileSizeBytes: 1842,
            },
          ],
          deliveryStatus: "sent",
        },
      ],
    },
    {
      id: "conv-2",
      subject: "HVAC work order update",
      category: "Maintenance Follow-Up",
      lastMessageAt: "2026-04-26T11:05:00",
      preview: "Vendor diagnostic is scheduled for May 2.",
      unreadCount: 0,
      messages: [
        {
          id: "msg-2a",
          conversationId: "conv-2",
          senderRole: "tenant",
          senderName: "Alex Tenant",
          body: "Following up on request MR-2026-0142 (HVAC not cooling). Any ETA for a visit?",
          sentAt: "2026-04-24T16:20:00",
          attachments: [],
          deliveryStatus: "sent",
        },
        {
          id: "msg-2b",
          conversationId: "conv-2",
          senderRole: "management",
          senderName: "Harborline Maintenance",
          body: "Vendor diagnostic is scheduled for May 2 in the afternoon. We’ll update the maintenance request when confirmed.",
          sentAt: "2026-04-26T11:05:00",
          attachments: [],
          deliveryStatus: "sent",
        },
      ],
    },
    {
      id: "conv-3",
      subject: "Quiet hours disturbance",
      category: "Complaint",
      lastMessageAt: "2026-04-21T08:10:00",
      preview: "We’ve logged your report and will follow up with the neighboring suite.",
      unreadCount: 0,
      messages: [
        {
          id: "msg-3a",
          conversationId: "conv-3",
          senderRole: "tenant",
          senderName: "Alex Tenant",
          body: "Repeated loud music after 11 PM from a neighboring suite last weekend. Can management follow up?",
          sentAt: "2026-04-20T22:45:00",
          attachments: [],
          deliveryStatus: "sent",
        },
        {
          id: "msg-3b",
          conversationId: "conv-3",
          senderRole: "management",
          senderName: "Harborline Office",
          body: "We’ve logged your report and will follow up with the neighboring suite. Please reply here if it continues.",
          sentAt: "2026-04-21T08:10:00",
          attachments: [],
          deliveryStatus: "sent",
        },
      ],
    },
    {
      id: "conv-4",
      subject: "Lease renewal timing",
      category: "Lease Question",
      lastMessageAt: "2026-04-15T14:00:00",
      preview: "When should we expect a renewal offer for Suite 210?",
      unreadCount: 0,
      messages: [
        {
          id: "msg-4a",
          conversationId: "conv-4",
          senderRole: "tenant",
          senderName: "Alex Tenant",
          body: "When should we expect a renewal offer for Suite 210? Our renewal deadline is September 30, 2027.",
          sentAt: "2026-04-15T14:00:00",
          attachments: [],
          deliveryStatus: "sent",
        },
      ],
    },
  ];
}
