import { Site } from "../src/models/Site";
import { Worker } from "../src/models/Worker";
import { SiteReport } from "../src/models/Report";
import { ReportPhoto } from "../src/models/ReportPhoto";

// Compilation-level foundation tests: each model's shape is exercised by
// constructing one minimal and one fully-populated valid value. A shape
// regression (renamed/removed required field) fails these at compile
// time before Jest even runs.
describe("construction domain model shapes", () => {
  it("accepts a minimal Site and a fully-populated Site", () => {
    const minimal: Site = {
      siteId: "STE-1",
      siteCode: "S001",
      name: "Site A",
      status: "ACTIVE",
      createdAt: "2026-09-12T00:00:00.000Z",
      updatedAt: "2026-09-12T00:00:00.000Z",
    };
    const full: Site = {
      siteId: "STE-1",
      siteCode: "S001",
      name: "Site A",
      address: "Tokyo",
      clientName: "Acme",
      status: "INACTIVE",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      createdAt: "2026-09-12T00:00:00.000Z",
      updatedAt: "2026-09-12T00:00:00.000Z",
    };
    expect(minimal.status).toBe("ACTIVE");
    expect(full.clientName).toBe("Acme");
    expect(full.endDate).toBe("2026-12-31");
  });

  it("accepts a minimal Worker and a fully-populated Worker", () => {
    const minimal: Worker = {
      workerId: "WRK-1",
      lineUserId: "U123",
      displayName: "Taro",
      status: "ACTIVE",
      createdAt: "2026-09-12T00:00:00.000Z",
      updatedAt: "2026-09-12T00:00:00.000Z",
    };
    const full: Worker = {
      workerId: "WRK-1",
      lineUserId: "U123",
      displayName: "Taro",
      email: "t@example.com",
      role: "foreman",
      status: "ACTIVE",
      createdAt: "2026-09-12T00:00:00.000Z",
      updatedAt: "2026-09-12T00:00:00.000Z",
    };
    expect(minimal.status).toBe("ACTIVE");
    expect(full.role).toBe("foreman");
  });

  it("accepts a minimal SiteReport and a fully-populated SiteReport", () => {
    const minimal: SiteReport = {
      reportId: "RPT-1",
      siteId: "STE-1",
      lineUserId: "U123",
      workerName: "Taro",
      reportDate: "2026-09-12",
      workType: "wiring",
      photoCount: 0,
      status: "SUBMITTED",
      createdAt: "2026-09-12T00:00:00.000Z",
      updatedAt: "2026-09-12T00:00:00.000Z",
    };
    const full: SiteReport = { ...minimal, workerId: "WRK-1", comment: "done" };
    expect(minimal.status).toBe("SUBMITTED");
    expect(full.comment).toBe("done");
  });

  it("accepts a minimal ReportPhoto", () => {
    const photo: ReportPhoto = {
      photoId: "PHO-1",
      reportId: "RPT-1",
      fileId: "F1",
      fileUrl: "https://drive.google.com/x",
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
      createdAt: "2026-09-12T00:00:00.000Z",
    };
    expect(photo.mimeType).toBe("image/jpeg");
  });
});
