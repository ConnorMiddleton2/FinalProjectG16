/**
 * Prospect / applicant messaging with Harborline leasing.
 *
 * Applicant-facing only. Never store or surface internal employee notes,
 * screening criteria, or private management comments.
 */

export const PORTAL_MESSAGING_STORAGE_KEY = "harborline_portal_applicant_messages";

export type ConversationTopic =
  | "unit-questions"
  | "tours"
  | "application-questions"
  | "missing-documents"
  | "status-questions"
  | "lease-offers"
  | "move-in-preparation";

/** Only applicant and leasing participants appear in this channel. */
export type MessageSender = "applicant" | "leasing";

export type MessageDeliveryStatus = "sending" | "sent" | "failed";

/** Attachment metadata only — never file bytes or public-folder paths. */
export type MessageAttachmentMeta = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export type PortalMessage = {
  id: string;
  conversationId: string;
  sender: MessageSender;
  body: string;
  createdAt: string;
  deliveryStatus: MessageDeliveryStatus;
  attachments: MessageAttachmentMeta[];
  /**
   * Intentionally omitted: internal employee notes must never appear here.
   * Do not add fields like internalNote, staffComment, or reviewerNotes.
   */
};

export type PortalConversation = {
  id: string;
  topic: ConversationTopic;
  subject: string;
  relatedUnitId: string;
  relatedApplicationId: string;
  createdAt: string;
  updatedAt: string;
  /** Applicant last opened this thread. */
  lastReadAt: string;
  messages: PortalMessage[];
};

export type ConversationTopicMeta = {
  id: ConversationTopic;
  label: string;
  description: string;
};

export const CONVERSATION_TOPICS: ConversationTopicMeta[] = [
  {
    id: "unit-questions",
    label: "Unit questions",
    description: "Ask about floor plans, amenities, availability, or pricing.",
  },
  {
    id: "tours",
    label: "Tours",
    description: "Schedule, reschedule, or ask about an upcoming tour.",
  },
  {
    id: "application-questions",
    label: "Application questions",
    description: "Questions about completing or submitting your application.",
  },
  {
    id: "missing-documents",
    label: "Missing documents",
    description: "Follow up on documents leasing has requested.",
  },
  {
    id: "status-questions",
    label: "Status questions",
    description: "Ask about where your application stands.",
  },
  {
    id: "lease-offers",
    label: "Lease offers",
    description: "Questions about an available lease offer.",
  },
  {
    id: "move-in-preparation",
    label: "Move-in preparation",
    description: "Utilities, keys, and move-in checklist questions.",
  },
];

export function getConversationTopicMeta(
  topic: ConversationTopic
): ConversationTopicMeta {
  const found = CONVERSATION_TOPICS.find((item) => item.id === topic);
  if (!found) throw new Error(`Unknown conversation topic: ${topic}`);
  return found;
}

export function createMessagingId(prefix = "msg") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mapIntentToTopic(intent: string | null): ConversationTopic {
  switch (intent) {
    case "additional-information":
    case "missing-documents":
      return "missing-documents";
    case "tours":
      return "tours";
    case "lease-offer":
    case "lease-offers":
      return "lease-offers";
    case "move-in":
    case "move-in-preparation":
      return "move-in-preparation";
    case "status":
    case "status-questions":
      return "status-questions";
    case "unit":
    case "unit-questions":
      return "unit-questions";
    default:
      return "application-questions";
  }
}

export function conversationUnreadCount(
  conversation: PortalConversation
): number {
  const lastRead = new Date(conversation.lastReadAt || 0).getTime();
  return conversation.messages.filter(
    (message) =>
      message.sender === "leasing" &&
      message.deliveryStatus === "sent" &&
      new Date(message.createdAt).getTime() > lastRead
  ).length;
}

export function totalUnreadCount(conversations: PortalConversation[]): number {
  return conversations.reduce(
    (sum, conversation) => sum + conversationUnreadCount(conversation),
    0
  );
}

export function latestMessage(
  conversation: PortalConversation
): PortalMessage | null {
  if (conversation.messages.length === 0) return null;
  return [...conversation.messages].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

function sortConversations(conversations: PortalConversation[]) {
  return [...conversations].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function seedConversations(): PortalConversation[] {
  const now = Date.now();
  const older = new Date(now - 1000 * 60 * 60 * 26).toISOString();
  const recent = new Date(now - 1000 * 60 * 45).toISOString();
  const unread = new Date(now - 1000 * 60 * 12).toISOString();

  const tourId = createMessagingId("conv");
  const docsId = createMessagingId("conv");

  return [
    {
      id: tourId,
      topic: "tours",
      subject: "Tour availability for Pier 12",
      relatedUnitId: "pier12-a205",
      relatedApplicationId: "",
      createdAt: older,
      updatedAt: recent,
      lastReadAt: recent,
      messages: [
        {
          id: createMessagingId("msg"),
          conversationId: tourId,
          sender: "applicant",
          body: "Hi — is Saturday morning still open for an in-person tour of A205?",
          createdAt: older,
          deliveryStatus: "sent",
          attachments: [],
        },
        {
          id: createMessagingId("msg"),
          conversationId: tourId,
          sender: "leasing",
          body: "Yes, Saturday at 10:00 AM is available. We can also hold 11:00 AM if that works better.",
          createdAt: recent,
          deliveryStatus: "sent",
          attachments: [],
        },
      ],
    },
    {
      id: docsId,
      topic: "missing-documents",
      subject: "Income document follow-up",
      relatedUnitId: "",
      relatedApplicationId: "",
      createdAt: recent,
      updatedAt: unread,
      lastReadAt: recent,
      messages: [
        {
          id: createMessagingId("msg"),
          conversationId: docsId,
          sender: "leasing",
          body: "Thanks for submitting your application. Please upload a recent pay stub or offer letter so we can continue reviewing your file.",
          createdAt: unread,
          deliveryStatus: "sent",
          attachments: [],
        },
      ],
    },
  ];
}

export function readPortalConversations(): PortalConversation[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(PORTAL_MESSAGING_STORAGE_KEY);
  if (!raw) {
    const seeded = seedConversations();
    writePortalConversations(seeded);
    return seeded;
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return sortConversations(parsed as PortalConversation[]);
}

export function writePortalConversations(conversations: PortalConversation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PORTAL_MESSAGING_STORAGE_KEY,
    JSON.stringify(sortConversations(conversations))
  );
}

export function createConversation(input: {
  topic: ConversationTopic;
  subject: string;
  relatedUnitId?: string;
  relatedApplicationId?: string;
  initialBody: string;
  attachments?: MessageAttachmentMeta[];
}): PortalConversation {
  const now = new Date().toISOString();
  const id = createMessagingId("conv");
  const message: PortalMessage = {
    id: createMessagingId("msg"),
    conversationId: id,
    sender: "applicant",
    body: input.initialBody.trim(),
    createdAt: now,
    deliveryStatus: "sending",
    attachments: input.attachments ?? [],
  };
  return {
    id,
    topic: input.topic,
    subject: input.subject.trim() || getConversationTopicMeta(input.topic).label,
    relatedUnitId: input.relatedUnitId ?? "",
    relatedApplicationId: input.relatedApplicationId ?? "",
    createdAt: now,
    updatedAt: now,
    lastReadAt: now,
    messages: [message],
  };
}

export function appendApplicantMessage(
  conversation: PortalConversation,
  body: string,
  attachments: MessageAttachmentMeta[] = []
): { conversation: PortalConversation; message: PortalMessage } {
  const now = new Date().toISOString();
  const message: PortalMessage = {
    id: createMessagingId("msg"),
    conversationId: conversation.id,
    sender: "applicant",
    body: body.trim(),
    createdAt: now,
    deliveryStatus: "sending",
    attachments,
  };
  return {
    message,
    conversation: {
      ...conversation,
      updatedAt: now,
      lastReadAt: now,
      messages: [...conversation.messages, message],
    },
  };
}

/**
 * Mock delivery to leasing. Occasional failure lets the UI exercise retry.
 * Never writes internal employee notes into the applicant channel.
 */
export async function mockDeliverApplicantMessage(): Promise<"sent" | "failed"> {
  await new Promise((resolve) =>
    window.setTimeout(resolve, 650 + Math.floor(Math.random() * 500))
  );
  if (Math.random() < 0.12) return "failed";
  return "sent";
}

export function setMessageDeliveryStatus(
  conversation: PortalConversation,
  messageId: string,
  deliveryStatus: MessageDeliveryStatus
): PortalConversation {
  return {
    ...conversation,
    updatedAt: new Date().toISOString(),
    messages: conversation.messages.map((message) =>
      message.id === messageId ? { ...message, deliveryStatus } : message
    ),
  };
}

export function markConversationRead(
  conversation: PortalConversation
): PortalConversation {
  return {
    ...conversation,
    lastReadAt: new Date().toISOString(),
  };
}

export function attachmentFromFile(file: File): MessageAttachmentMeta | null {
  if (!file.name || file.size <= 0) return null;
  if (file.size > 8 * 1024 * 1024) return null;
  return {
    id: createMessagingId("att"),
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || "application/octet-stream",
  };
}
