import {
  buildCustomerInquiryConfirmationEmail,
  buildOwnerInquiryNotificationEmail,
  InquiryEmailContext,
} from "../src/InquiryEmailTemplates";
import { InquiryRequest } from "../src/models/InquiryRequest";

const inquiry: InquiryRequest = {
  submissionId: "sub-1",
  name: "山田太郎",
  email: "yamada@example.com",
  phone: "09012345678",
  subject: "料金について",
  message: "料金プランについて教えてください。",
};

const ctx: InquiryEmailContext = {
  inquiryId: "INQ-20260910-ABC123",
  inquiry,
  businessName: "サロン花",
  createdAt: new Date("2026-09-10T01:00:00.000Z"),
};

describe("buildCustomerInquiryConfirmationEmail", () => {
  it("includes the business name, customer name, and an acknowledgement", () => {
    const email = buildCustomerInquiryConfirmationEmail(ctx);
    expect(email.subject).toContain("お問い合わせを受け付けました");
    expect(email.body).toContain("サロン花");
    expect(email.body).toContain("山田太郎");
  });

  it("never includes the customer's raw phone number, message content, or submissionId", () => {
    const email = buildCustomerInquiryConfirmationEmail(ctx);
    expect(email.body).not.toContain(inquiry.phone!);
    expect(email.body).not.toContain(inquiry.message);
    expect(email.body).not.toContain(inquiry.submissionId);
  });
});

describe("buildOwnerInquiryNotificationEmail", () => {
  it("includes the name, email, message, and timestamp", () => {
    const email = buildOwnerInquiryNotificationEmail(ctx);
    expect(email.subject).toContain("新しいお問い合わせがあります");
    expect(email.body).toContain("山田太郎");
    expect(email.body).toContain("yamada@example.com");
    expect(email.body).toContain("料金プランについて教えてください。");
    expect(email.body).toContain(ctx.createdAt.toISOString());
  });

  it("includes the phone number only when provided", () => {
    const withoutPhone = buildOwnerInquiryNotificationEmail({ ...ctx, inquiry: { ...inquiry, phone: undefined } });
    expect(withoutPhone.body).not.toContain("電話番号");
  });
});
