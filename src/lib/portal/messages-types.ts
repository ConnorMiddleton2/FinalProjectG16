export const MESSAGE_CATEGORIES = [
  "General Question",
  "Lease Question",
  "Payment Question",
  "Maintenance Follow-Up",
  "Complaint",
  "Move-In or Move-Out",
  "Other",
] as const;

export type MessageCategory = (typeof MESSAGE_CATEGORIES)[number];

export type MessageSenderRole = "tenant" | "management";

export type MessageAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
};

export type PortalMessage = {
  id: string;
  conversationId: string;
  senderRole: MessageSenderRole;
  senderName: string;
  body: string;
  /** ISO datetime */
  sentAt: string;
  attachments: MessageAttachment[];
  /** Outbound messages may be pending/failed until retry succeeds */
  deliveryStatus?: "sent" | "failed" | "sending";
};

export type PortalConversation = {
  id: string;
  subject: string;
  category: MessageCategory;
  /** ISO datetime of latest message */
  lastMessageAt: string;
  preview: string;
  unreadCount: number;
  messages: PortalMessage[];
};

export type MessagesLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | {
      status: "success";
      conversations: PortalConversation[];
      source: "live" | "mock";
    };

export type NewMessageFormValues = {
  category: MessageCategory | "";
  subject: string;
  body: string;
  attachments: MessageAttachment[];
};

export type ReplyFormValues = {
  body: string;
  attachments: MessageAttachment[];
};
