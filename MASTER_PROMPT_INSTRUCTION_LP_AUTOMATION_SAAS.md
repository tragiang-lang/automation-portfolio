# MASTER PROMPT / INSTRUCTION
# Japanese SMB LP + Form + Reservation + Google Automation Platform

## 0. Mục đích của tài liệu

Tài liệu này là **master instruction** cho AI coding agent (Claude Code / Codex / Cursor / GitHub Copilot Agent...) khi xây dựng hệ thống web cho doanh nghiệp nhỏ tại Nhật.

Mục tiêu là tạo ra một kiến trúc có thể:

- xây dựng portfolio thực tế;
- tái sử dụng code giữa nhiều loại khách hàng;
- triển khai nhanh trên từng project;
- dễ demo cho khách hàng Nhật trên Coconala;
- có thể mở rộng từ LP đơn giản lên hệ thống form / reservation / CRM nhẹ;
- ưu tiên chi phí thấp ở giai đoạn portfolio và MVP;
- để **khách hàng sở hữu production accounts/data**, không phụ thuộc vào tài khoản cá nhân của developer.

---

# 1. Product Vision

Xây dựng một nền tảng website/LP dành cho SMB Nhật với khả năng kết hợp:

1. Landing Page / Corporate Website
2. Contact Form
3. Reservation Form
4. Google Sheets integration
5. Google Calendar integration
6. Gmail notification / auto-reply
7. Basic lead management
8. Responsive design
9. Deployment
10. Easy customization theo từng ngành nghề

Không định vị sản phẩm theo công nghệ.

Không bán câu “Next.js website”.

Định vị theo business outcome:

> Website + inquiry/reservation + Google Workspace automation được tích hợp thành một hệ thống đơn giản, dễ sử dụng cho doanh nghiệp nhỏ.

---

# 2. Target Customer Archetypes

## Project A — Beauty / Nail / Eyelash / Hair Salon

Primary workflow:

LP → Service/Menu → Staff (optional) → Date/Time → Reservation → Validation → Google Sheets → Google Calendar → Gmail

Business goal:

- nhận booking;
- giảm trao đổi thủ công;
- quản lý lịch;
- lưu customer information;
- gửi confirmation tự động.

Recommended first portfolio implementation:

**Nail / Eyelash Salon**

Lý do:

- giao diện có thể đẹp và trực quan;
- workflow reservation rõ ràng;
- dễ thể hiện frontend skill;
- dễ tái sử dụng sang hair / beauty salon.

---

## Project B — Restaurant / Cafe

Primary workflow:

LP → Date → Time → Guest Count → Course/Request → Capacity Validation → Google Sheets → Google Calendar → Gmail

Business goal:

- booking theo số khách;
- tránh nhận quá capacity;
- quản lý reservation;
- giảm phone/manual inquiry.

Điểm khác với salon:

- capacity;
- guest count;
- course/menu;
- seating/slot logic có thể phức tạp hơn;
- không nhất thiết phải chọn staff.

---

## Project C — Consultant / Instructor / Online Lesson / Small Professional Business

Primary workflow:

LP → Inquiry Form → Lead → Google Sheets → Owner Notification → Customer Auto Reply → Follow-up → Meeting → Proposal → Won/Lost

Business goal:

- quản lý inquiry;
- lưu lead;
- theo dõi status;
- follow-up thủ công sau khi lead vào Sheet;
- làm CRM nhẹ mà không cần SaaS CRM đắt tiền.

Điểm khác với A/B:

Đây là **lead management / inquiry workflow**, không phải reservation-first workflow.

---

# 3. Core Architecture

## 3.1 High-level

```text
User Browser
    |
    v
Next.js + TypeScript
    |
    | HTTPS request
    v
GAS Web App / API
    |
    +---------------------> Google Sheets
    |
    +---------------------> Google Calendar
    |
    +---------------------> Gmail
```

Optional advanced architecture:

```text
Browser
  |
  v
Next.js
  |
  +--> Supabase (advanced data / auth / admin / relational DB)
  |
  +--> GAS Web App
          |
          +--> Google Sheets
          +--> Google Calendar
          +--> Gmail
```

---

# 4. Technology Stack

## Frontend

- Next.js
- TypeScript
- React
- modern responsive CSS
- component-based architecture
- accessibility-first HTML
- SEO-friendly metadata

## Hosting

- Vercel for personal portfolio / demo
- Customer production deployment should use a customer-owned production setup/account where applicable

## Automation / Backend

- Google Apps Script (GAS)
- GAS Web App endpoint
- Google Sheets
- Google Calendar
- Gmail

## Optional database

Supabase should **not** be mandatory for the first version.

Use Supabase only when requirements justify it, for example:

- authentication;
- relational data;
- admin dashboard;
- complex search/filter;
- multi-user roles;
- persistent application state that should not live in Sheets;
- higher-volume data.

For small SMB systems, prefer Google Workspace integration because customers already understand Sheets/Calendar/Gmail and can own the data.

---

# 5. Architecture Principles

## Principle 1 — Business-first

Do not over-engineer.

Every technical decision must answer:

> Does this make the business workflow simpler, safer, faster, or easier to maintain?

Avoid introducing:

- unnecessary microservices;
- unnecessary databases;
- unnecessary authentication;
- unnecessary infrastructure;
- unnecessary dependencies.

---

## Principle 2 — Reusable core, customizable business logic

Target approximately:

- 50–60% reusable foundation;
- 40–50% industry-specific implementation.

Reusable:

- layout;
- header;
- footer;
- hero;
- CTA;
- sections;
- contact form base;
- reservation form primitives;
- validation utilities;
- API client;
- loading/error/success states;
- GAS helper functions;
- email templates;
- Sheet mapping helpers;
- deployment/documentation patterns.

Customizable:

- copy;
- colors;
- typography;
- images;
- services;
- pricing;
- form fields;
- reservation rules;
- capacity logic;
- Calendar configuration;
- email wording;
- customer-specific business rules.

---

## Principle 3 — Customer ownership

For real customer projects:

- customer should own domain;
- customer should own Google account / Workspace;
- customer should own production Sheets;
- customer should own production Calendar;
- customer should own production Gmail;
- customer should own production Vercel/deployment account when practical;
- developer receives required collaborator/editor/developer access only.

Do not make customers permanently dependent on the developer's personal account.

Portfolio/demo projects may use the developer's own accounts.

---

## Principle 4 — Environment separation

Maintain clear separation between:

- local development;
- portfolio/demo;
- customer staging;
- customer production.

Never mix test data with production data.

---

## Principle 5 — Secrets must never be exposed

Never put credentials, API keys, service credentials, tokens, or private configuration in:

- Git repository;
- frontend source;
- public environment variables;
- client-side JavaScript;
- screenshots/documentation.

Use:

- server-side environment variables;
- GAS Script Properties;
- customer-owned secrets/configuration.

Never hard-code private credentials.

---

# 6. Frontend Architecture

Recommended structure:

```text
app/
  layout.tsx
  page.tsx
  contact/
    page.tsx
  reservation/
    page.tsx
  thanks/
    page.tsx

components/
  layout/
  sections/
  forms/
  reservation/
  ui/

lib/
  api/
  validation/
  constants/
  utils/

types/

config/

public/
  images/
  icons/
```

Structure may change when project size requires it, but keep clear boundaries between:

- presentation;
- business logic;
- API access;
- validation;
- configuration;
- reusable components.

---

# 7. UI / UX Guidelines

The website must feel like a real Japanese business website, not a generic coding demo.

## Required qualities

- mobile-first;
- fast visual hierarchy;
- clear CTA;
- readable Japanese typography;
- sufficient contrast;
- generous spacing;
- professional section hierarchy;
- forms that are simple to complete;
- clear confirmation state;
- clear error messages;
- no unnecessary animation;
- no excessive gradients or decorative effects unless brand requires them.

## For salon portfolio

Visual design can be premium, warm, elegant and photography-led.

## For restaurant portfolio

Focus on menu, atmosphere, access, hours, reservation and capacity.

## For consultant/instructor portfolio

Focus on credibility, service explanation, testimonials/achievements, FAQ, inquiry CTA and lead capture.

---

# 8. Japanese UX Standards

Use natural Japanese wording.

Avoid machine-translated or unnatural business Japanese.

Example form labels:

- お名前
- メールアドレス
- 電話番号
- ご希望日
- ご希望時間
- ご利用人数
- メニュー
- ご相談内容

Reservation states:

- 送信中...
- 予約を受け付けました
- 予約内容をご確認ください
- 入力内容に誤りがあります
- 申し訳ありません。現在この時間帯は受付できません。

Do not claim that a reservation is confirmed until backend validation has succeeded.

---

# 9. Form Architecture

Use a strict multi-stage flow:

```text
Input
  ↓
Client Validation
  ↓
HTTPS Request
  ↓
Server/GAS Validation
  ↓
Business Rule Validation
  ↓
Write Data
  ↓
Calendar Operation
  ↓
Email Notification
  ↓
Success Response
```

Never trust client validation alone.

Backend/GAS must revalidate all critical fields.

---

# 10. Suggested Form Data Model

## Common Contact Form

```ts
interface ContactSubmission {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  submittedAt: string;
  source?: string;
}
```

## Common Reservation Form

```ts
interface ReservationRequest {
  name: string;
  email: string;
  phone?: string;
  date: string;
  time: string;
  notes?: string;
}
```

Industry-specific extensions:

### Salon

```ts
interface SalonReservation extends ReservationRequest {
  menuId: string;
  staffId?: string;
}
```

### Restaurant

```ts
interface RestaurantReservation extends ReservationRequest {
  guests: number;
  courseId?: string;
}
```

### Consultant / Instructor

```ts
interface LeadSubmission extends ContactSubmission {
  service?: string;
  preferredContactMethod?: 'email' | 'phone' | 'online-meeting';
  preferredDate?: string;
}
```

---

# 11. Google Sheets Design

Sheets should be designed for human use first.

Do not create a spreadsheet that only a developer can understand.

## Common sheet tabs

```text
CONFIG
INQUIRIES
RESERVATIONS
SERVICES
STAFF
EMAIL_LOG
ERROR_LOG
```

Only create tabs actually required by the project.

---

## Example RESERVATIONS columns

```text
Reservation ID
Created At
Name
Email
Phone
Date
Time
Guests
Service/Menu
Staff
Notes
Status
Calendar Event ID
Email Status
```

Use stable internal IDs.

Do not rely only on row number as an identifier.

---

# 12. Google Calendar Integration

Calendar is the source of truth for schedule conflicts only when the business workflow requires it.

Typical flow:

```text
Reservation Request
        ↓
Validate input
        ↓
Check availability
        ↓
If available
   ↓
Create Calendar Event
   ↓
Write Sheet
   ↓
Send email

If unavailable
   ↓
Return meaningful error
```

Important:

- avoid double booking;
- normalize date/time handling;
- explicitly define timezone;
- for Japan use Asia/Tokyo;
- store machine-readable date/time values;
- preserve a Calendar Event ID in Sheets.

Do not write a fake confirmation before Calendar creation succeeds.

---

# 13. Gmail Integration

Use Gmail for:

1. customer confirmation / auto-reply;
2. business owner notification;
3. optional error notification for critical failures.

Typical flow:

```text
Success
  ├─> Customer email
  └─> Owner notification
```

Email should contain:

- customer name;
- reservation/inquiry details;
- date/time when applicable;
- next action;
- business contact information.

Do not expose internal implementation details in customer-facing email.

---

# 14. GAS API Design

Use explicit action-based or resource-based endpoints.

Example action model:

```json
{
  "action": "createReservation",
  "payload": {}
}
```

Other actions:

```text
createInquiry
createReservation
checkAvailability
getServices
getAvailableSlots
healthCheck
```

The exact API design may vary by project, but it must remain:

- explicit;
- predictable;
- validated;
- documented;
- easy to test.

---

# 15. GAS Structure

Recommended:

```text
Code.gs
Config.gs
Api.gs
Validation.gs
Sheets.gs
Calendar.gs
Mail.gs
Utils.gs
```

For TypeScript-based Apps Script projects, use a build tool such as esbuild and keep generated deployment artifacts separate from source code.

Recommended conceptual separation:

- API handling;
- validation;
- business logic;
- persistence;
- integrations;
- configuration.

---

# 16. API Response Standard

Use a consistent response shape.

Example success:

```json
{
  "ok": true,
  "data": {
    "reservationId": "RES-20260905-0001"
  }
}
```

Example failure:

```json
{
  "ok": false,
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "選択された時間帯はご利用いただけません。"
  }
}
```

Never expose raw stack traces or internal exceptions to end users.

Log technical details internally.

---

# 17. Error Handling

There are three error layers:

## Layer A — Client validation

Examples:

- required field missing;
- invalid email;
- invalid phone format;
- invalid date;
- guests <= 0.

## Layer B — Business validation

Examples:

- date outside business hours;
- reservation slot unavailable;
- restaurant capacity exceeded;
- service unavailable;
- staff unavailable.

## Layer C — Infrastructure/integration errors

Examples:

- Sheets write failed;
- Calendar failed;
- Gmail failed;
- GAS configuration missing.

User-facing errors must be friendly.

Developer-facing logs must be precise.

---

# 18. Idempotency / Duplicate Submission

Forms must protect against accidental duplicate submissions.

Use one or more of:

- client-side submit lock;
- generated submission ID;
- duplicate detection;
- request timestamp;
- server-side consistency checks.

For reservations, duplicate creation must be treated as a high-priority correctness issue.

---

# 19. Timezone / Date Rules

Default timezone:

```text
Asia/Tokyo
```

Never assume browser timezone is the business timezone.

Dates and times must be normalized before business-rule validation.

Be explicit about:

- business opening hours;
- holidays;
- booking horizon;
- minimum lead time;
- slot interval;
- timezone.

Example configuration:

```ts
const reservationConfig = {
  timezone: 'Asia/Tokyo',
  slotMinutes: 30,
  minLeadHours: 2,
  maxBookingDays: 60,
};
```

These are examples only. Use actual project requirements.

---

# 20. Security Baseline

Minimum security requirements:

- validate all inputs server-side;
- never trust hidden fields;
- sanitize data before writing where needed;
- never expose secrets to client;
- use HTTPS;
- apply basic abuse protection/rate limiting strategy where feasible;
- avoid leaking personal data in logs;
- minimize stored personal data;
- document data retention expectations;
- use least-privilege access for Google resources.

For real customer systems, clearly document who can access personal data.

---

# 21. Privacy / Personal Data

The system may process:

- name;
- email;
- phone;
- reservation details;
- inquiry contents.

Therefore:

- collect only necessary data;
- define why each field exists;
- avoid unnecessary sensitive data;
- avoid putting personal data into debug logs;
- provide appropriate privacy/legal pages for production use when required;
- make ownership/access clear to the customer.

The AI must not invent legal compliance claims.

When legal requirements matter, explicitly mark assumptions and recommend professional/legal confirmation rather than pretending certainty.

---

# 22. SEO Baseline

Every production website should have:

- title;
- meta description;
- canonical strategy where needed;
- Open Graph metadata;
- semantic headings;
- descriptive image alt text;
- clean URLs;
- sitemap/robots strategy when appropriate;
- local business information where relevant.

Do not keyword-stuff Japanese content.

---

# 23. Performance Baseline

Prioritize:

- optimized images;
- lazy loading where appropriate;
- minimal client-side JavaScript;
- server components where practical;
- avoiding unnecessary dependencies;
- responsive assets;
- fast first render.

Do not sacrifice maintainability for micro-optimizations.

---

# 24. Accessibility Baseline

Must support:

- keyboard navigation;
- visible focus states;
- semantic buttons/links;
- labels associated with inputs;
- meaningful error messages;
- sufficient color contrast;
- alt text for meaningful images.

Forms must not rely on color alone to communicate errors.

---

# 25. Configuration Strategy

Business-specific values should live in configuration, not scattered across source code.

Example:

```ts
const siteConfig = {
  businessName: 'Example Salon',
  phone: '000-0000-0000',
  email: 'example@example.com',
  address: 'Tokyo, Japan',
};
```

Example reservation config:

```ts
const reservationConfig = {
  openingHours: {
    monday: ['10:00', '19:00'],
    tuesday: ['10:00', '19:00'],
  },
  holidays: [],
  slotMinutes: 30,
};
```

For customer projects, configuration should be easy to customize without rewriting core business logic.

---

# 26. Reusable Design System

Create a small reusable design system rather than copying random styles.

Recommended primitives:

```text
Button
Container
Section
Heading
Card
Badge
Input
Select
Textarea
Modal
Toast
LoadingState
ErrorState
SuccessState
```

Use consistent spacing, type scale and responsive breakpoints.

Do not introduce a huge UI framework unless it materially improves the project.

---

# 27. Portfolio Quality Requirements

Each portfolio project must demonstrate both:

## Frontend

- polished design;
- responsive layout;
- Japanese UX;
- form UX;
- accessibility;
- component architecture.

## Backend / Automation

- GAS API;
- Google Sheets;
- Google Calendar when relevant;
- Gmail;
- validation;
- business rules;
- error handling;
- logs;
- deployment documentation.

A portfolio project is successful only when both the UI and the workflow look realistic.

---

# 28. Demo Data Strategy

Use clearly fictional demo businesses and data.

Examples:

- demo salon;
- demo cafe;
- demo consultant.

Never use real people's personal information in portfolio demonstrations.

---

# 29. Testing Strategy

Every project should have at least:

## Unit tests

For:

- validation;
- business rules;
- slot generation;
- capacity calculation;
- data mapping.

## Integration tests

For:

- API → Sheets;
- API → Calendar;
- API → Gmail where practical.

## Manual E2E checklist

Example:

```text
[ ] Open LP on mobile
[ ] Open LP on desktop
[ ] Submit valid form
[ ] Submit invalid email
[ ] Submit missing required field
[ ] Submit duplicate reservation
[ ] Select unavailable slot
[ ] Create Calendar event
[ ] Verify Sheet row
[ ] Verify customer email
[ ] Verify owner email
[ ] Verify error handling
```

---

# 30. Git / Development Workflow

Use small, reviewable commits.

Recommended workflow:

```text
Understand requirement
  ↓
Inspect codebase
  ↓
Plan minimal change
  ↓
Implement
  ↓
Run tests
  ↓
Run typecheck/lint/build
  ↓
Review diff
  ↓
Commit
```

Do not make unrelated refactors during feature implementation unless necessary.

---

# 31. Definition of Done

A feature is NOT done merely because the UI renders.

It is done only when:

```text
[ ] Requirement implemented
[ ] UI works on mobile
[ ] UI works on desktop
[ ] Client validation works
[ ] Backend validation works
[ ] Business rule works
[ ] Google integration works
[ ] Error handling works
[ ] Loading state works
[ ] Success state works
[ ] Duplicate submission considered
[ ] Logs are sufficient
[ ] No secrets committed
[ ] Tests pass
[ ] Typecheck passes
[ ] Lint/build pass
[ ] Documentation updated
```

---

# 32. Deployment Strategy

## Portfolio

Use a simple deployment setup optimized for learning/demo.

Possible setup:

```text
GitHub
  ↓
Vercel
  ↓
Next.js
  ↓
GAS Web App
  ↓
Demo Google Workspace resources
```

## Customer production

Preferred model:

```text
Customer Domain
      ↓
Customer Vercel / hosting
      ↓
Next.js
      ↓
Customer GAS Web App
      ↓
Customer Sheets / Calendar / Gmail
```

Developer provides implementation and maintenance, but customer remains owner of business data and production accounts.

---

# 33. Documentation Requirements

Every project must have at minimum:

```text
README.md
SETUP.md
DEPLOYMENT.md
ENVIRONMENT.md
OPERATIONS.md
```

For Japanese customer delivery, also prepare a simple Japanese operation guide describing:

- where to see reservations;
- where to see inquiries;
- how to update business hours;
- how to update menus/services;
- how to change notification email;
- what to do if an error occurs;
- how to request maintenance.

Avoid technical jargon in customer-facing documentation.

---

# 34. Coconala-Oriented Productization

The system should be designed so the developer can sell packages such as:

### Package A

LP / Home Page

### Package B

LP + Contact Form

### Package C

LP + Reservation Form + Google Sheets + Gmail

### Package D

LP + Reservation + Google Calendar + Gmail + Sheets

### Package E

Custom business automation

Potential add-ons:

- extra pages;
- Google Maps;
- SEO setup;
- analytics setup;
- additional form;
- custom reservation rules;
- additional Calendar;
- monthly maintenance;
- content update.

The architecture must allow features to be enabled/disabled per customer instead of forcing one massive package.

---

# 35. Feature Flag / Modular Business Logic

Prefer modular capabilities.

Conceptually:

```ts
const features = {
  contactForm: true,
  reservation: true,
  calendar: true,
  emailNotification: true,
  leadManagement: false,
};
```

Do not necessarily implement this exact mechanism; use an appropriate configuration approach.

Goal:

> One core can serve multiple business types without creating a giant monolithic codebase.

---

# 36. Project-Specific Architecture

## Salon

```text
Next.js
  |
  +--> LP
  +--> Services
  +--> Staff (optional)
  +--> Reservation
          |
          v
        GAS
          |
          +--> Availability
          +--> Sheets
          +--> Calendar
          +--> Gmail
```

Core business rules:

- service duration;
- opening hours;
- staff availability when applicable;
- holiday;
- booking horizon;
- minimum lead time;
- calendar conflict.

---

## Restaurant

```text
Next.js
  |
  +--> LP
  +--> Menu/Course
  +--> Reservation
          |
          v
        GAS
          |
          +--> Capacity Check
          +--> Sheets
          +--> Calendar
          +--> Gmail
```

Core business rules:

- guest count;
- capacity;
- course;
- opening hours;
- slot rules;
- special dates.

---

## Consultant / Instructor

```text
Next.js
  |
  +--> Profile
  +--> Services
  +--> FAQ
  +--> Contact
          |
          v
        GAS
          |
          +--> Sheets / Lead CRM
          +--> Gmail
```

Core business rules:

- inquiry categorization;
- lead status;
- owner notification;
- follow-up information;
- optional meeting request.

Calendar is optional and should be introduced only when it helps the workflow.

---

# 37. AI Coding Agent Operating Instructions

When an AI agent works on this project, it MUST follow these rules:

## Before coding

1. Inspect the repository.
2. Identify existing architecture.
3. Read relevant README / instructions.
4. Identify reusable code before creating new code.
5. Understand the business workflow.
6. State assumptions internally through code/docs rather than guessing silently.

## While coding

1. Make minimal, coherent changes.
2. Reuse existing abstractions where appropriate.
3. Keep business logic separate from UI.
4. Avoid duplication.
5. Validate both client and server sides.
6. Handle loading/error/success states.
7. Preserve type safety.
8. Do not add dependencies unless justified.
9. Do not expose secrets.
10. Keep Japanese UX natural.

## After coding

1. Run tests.
2. Run typecheck.
3. Run lint.
4. Run build.
5. Inspect git diff.
6. Review for regressions.
7. Update documentation when needed.
8. Report exactly what changed and what was verified.

Never claim a test/build/deployment succeeded unless it was actually executed and verified.

---

# 38. AI Agent Output Format

For implementation tasks, the AI should report:

```text
## Summary
What was changed.

## Files Changed
List files and purpose.

## Validation
- Tests:
- Typecheck:
- Lint:
- Build:

## Assumptions
Only assumptions that materially affect behavior.

## Remaining Risks
Only known or unverified risks.
```

Do not produce vague claims such as “everything should work”.

---

# 39. Do Not Over-Engineer

This system is designed for small businesses.

Prefer:

```text
Next.js + GAS + Sheets + Calendar + Gmail
```

over immediately building:

```text
Next.js + custom backend + PostgreSQL + Redis + queue + auth + microservices
```

Use Supabase or other infrastructure when a concrete requirement justifies it.

Complexity must be earned by requirements.

---

# 40. Recommended Build Order

Build in this order for the first portfolio project:

### Phase 1 — Foundation

- Next.js project;
- TypeScript;
- reusable layout;
- responsive design system;
- Japanese content structure.

### Phase 2 — Salon LP

- hero;
- services;
- gallery;
- pricing;
- access;
- FAQ;
- CTA.

### Phase 3 — Reservation UI

- date;
- time;
- service;
- customer info;
- notes;
- validation;
- confirmation screen.

### Phase 4 — GAS

- Web App endpoint;
- validation;
- Sheets persistence;
- Calendar availability;
- Calendar event creation;
- Gmail notification;
- customer auto-reply.

### Phase 5 — Quality

- error handling;
- duplicate prevention;
- test cases;
- mobile QA;
- accessibility;
- performance;
- deployment.

### Phase 6 — Portfolio Documentation

- architecture diagram;
- screenshots;
- workflow explanation;
- technical explanation;
- business value explanation;
- demo instructions.

### Phase 7 — Productization

Extract reusable components and make the next industry project significantly faster to build.

---

# 41. Expected Reusability After Project 1

After finishing the Salon project, extract:

```text
Core UI
Form system
Validation system
API client
GAS API base
Sheet utilities
Calendar utilities
Gmail utilities
Error handling
Documentation template
Deployment checklist
```

Then create the Restaurant project by changing business-specific modules instead of copying the entire project blindly.

Then create the Consultant project by reusing the same foundation while replacing reservation-specific logic with lead-management logic.

---

# 42. Decision Framework

When a new requirement appears, classify it:

```text
UI concern?
Business logic?
Integration?
Configuration?
Infrastructure?
Customer-specific customization?
```

Then place it in the smallest appropriate layer.

Example:

“Salon closes Tuesday”
→ configuration / business rules

“Button should be larger”
→ UI/design system

“Prevent double booking”
→ backend business logic + Calendar integration

“Owner email changes”
→ configuration

“Need login/admin roles”
→ potentially Supabase / auth architecture

---

# 43. Quality Bar

The final result should satisfy this standard:

> A Japanese small-business owner should be able to look at the website and believe it is a real service, while the technical architecture should be clean enough for a developer to maintain and reuse.

The project should demonstrate:

- professional UI;
- real business workflow;
- practical automation;
- maintainable code;
- customer-friendly operation;
- clear ownership model.

---

# 44. Master Instruction for Every Future Task

When asked to add a feature, fix a bug, or create a new customer variant:

1. Preserve the architecture principles in this document.
2. Prefer reuse over duplication.
3. Prefer simple solutions over premature complexity.
4. Protect customer data and secrets.
5. Keep business rules explicit.
6. Keep integrations isolated.
7. Maintain natural Japanese UX.
8. Test the actual workflow, not only the UI.
9. Verify changes with real commands before reporting success.
10. Keep the solution suitable for productization on Coconala.

If a requirement conflicts with this instruction, identify the conflict explicitly and choose the smallest architecture change that satisfies the new requirement.

---

# 45. Initial Portfolio Target

The first implementation target is:

**Japanese Nail / Beauty Salon website + reservation automation system.**

Preferred stack:

```text
Next.js
TypeScript
React
Vercel (portfolio/demo)
Google Apps Script
Google Sheets
Google Calendar
Gmail
```

Optional later:

```text
Supabase
```

The first version should optimize for:

**portfolio quality + realistic workflow + reusable foundation + easy customer customization.**
