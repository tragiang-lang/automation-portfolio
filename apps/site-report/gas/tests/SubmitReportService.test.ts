jest.mock("../src/ConfigStore", () => ({
  ...jest.requireActual("../src/ConfigStore"),
  getSiteReportConfig: jest.fn(),
}));
jest.mock("../src/SitesRepository", () => ({
  // buildSitesResult is pure — kept real; only the Sheets-touching
  // getSiteRows is mocked.
  ...jest.requireActual("../src/SitesRepository"),
  getSiteRows: jest.fn(),
}));
jest.mock("../src/WorkTypesRepository", () => ({
  // Same convention: buildWorkTypesResult is pure — kept real; only the
  // Sheets-touching getWorkTypeRows is mocked.
  ...jest.requireActual("../src/WorkTypesRepository"),
  getWorkTypeRows: jest.fn(),
}));
jest.mock("../src/ProgressStatusRepository", () => ({
  ...jest.requireActual("../src/ProgressStatusRepository"),
  getProgressStatusRows: jest.fn(),
}));
jest.mock("../src/DriveStorage");
jest.mock("../src/ReportsRepository");
jest.mock("../src/AdminNotification");

import { submitReport } from "../src/SubmitReportService";
import { getSiteReportConfig } from "../src/ConfigStore";
import { getSiteRows } from "../src/SitesRepository";
import { getWorkTypeRows } from "../src/WorkTypesRepository";
import { getProgressStatusRows } from "../src/ProgressStatusRepository";
import { deleteUploadedFile, uploadReportPhoto } from "../src/DriveStorage";
import { appendReportPhotoRow, appendReportRow } from "../src/ReportsRepository";
import { sendAdminNotification } from "../src/AdminNotification";
import { SiteRow, WorkTypeRow, ProgressStatusRow } from "../src/SheetSchemas";
import { SiteReportConfig } from "../src/Config";
import { SubmitReportInput } from "../src/models/SubmitReportInput";

const mockGetSiteReportConfig = getSiteReportConfig as jest.Mock;
const mockGetSiteRows = getSiteRows as jest.Mock;
const mockGetWorkTypeRows = getWorkTypeRows as jest.Mock;
const mockGetProgressStatusRows = getProgressStatusRows as jest.Mock;
const mockUploadReportPhoto = uploadReportPhoto as jest.Mock;
const mockDeleteUploadedFile = deleteUploadedFile as jest.Mock;
const mockAppendReportRow = appendReportRow as jest.Mock;
const mockAppendReportPhotoRow = appendReportPhotoRow as jest.Mock;
const mockSendAdminNotification = sendAdminNotification as jest.Mock;

const validConfig: SiteReportConfig = {
  businessName: "Acme Construction",
  adminEmail: "admin@example.com",
  driveRootFolderId: "FOLDER-1",
  timezone: "Asia/Tokyo",
};

function siteRow(overrides: Partial<SiteRow> = {}): SiteRow {
  return {
    siteId: "STE-1",
    siteCode: "S001",
    name: "Site A",
    address: "Tokyo",
    clientName: "Acme",
    status: "ACTIVE",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    createdAt: "2026-09-12T00:00:00.000Z",
    updatedAt: "2026-09-12T00:00:00.000Z",
    ...overrides,
  };
}

function submitInput(overrides: Partial<SubmitReportInput> = {}): SubmitReportInput {
  return {
    siteId: "STE-1",
    lineUserId: "U123",
    workerName: "Taro",
    reportDate: "2026-09-12",
    workType: "wiring",
    comment: "done",
    progressStatus: "IN_PROGRESS",
    hasIssue: "NO",
    photos: [],
    ...overrides,
  };
}

function onePhotoInput(): SubmitReportInput {
  return submitInput({
    photos: [{ fileName: "a.jpg", mimeType: "image/jpeg", base64Data: "aGVsbG8=" }],
  });
}

function threePhotosInput(): SubmitReportInput {
  return submitInput({
    photos: [
      { fileName: "a.jpg", mimeType: "image/jpeg", base64Data: "aGVsbG8=" },
      { fileName: "b.png", mimeType: "image/png", base64Data: "aGVsbG8=" },
      { fileName: "c.jpg", mimeType: "image/jpeg", base64Data: "aGVsbG8=" },
    ],
  });
}

function workTypeRow(overrides: Partial<WorkTypeRow> = {}): WorkTypeRow {
  return { code: "wiring", name: "電気工事", status: "ACTIVE", sortOrder: 1, ...overrides };
}

function progressStatusRow(overrides: Partial<ProgressStatusRow> = {}): ProgressStatusRow {
  return { code: "IN_PROGRESS", name: "進行中", status: "ACTIVE", sortOrder: 2, ...overrides };
}

beforeEach(() => {
  // resetAllMocks (not clearAllMocks): clearAllMocks only clears call
  // history, not a mockImplementation set by an earlier test — a
  // throwing implementation from one test would otherwise leak into
  // every later test in this file.
  jest.resetAllMocks();
  mockGetSiteReportConfig.mockReturnValue(validConfig);
  mockGetSiteRows.mockReturnValue([siteRow()]);
  mockGetWorkTypeRows.mockReturnValue([workTypeRow()]);
  mockGetProgressStatusRows.mockReturnValue([progressStatusRow()]);
  mockUploadReportPhoto.mockImplementation(({ fileName }: { fileName: string }) => ({
    fileId: `FILE-${fileName}`,
    fileUrl: `https://drive.google.com/${fileName}`,
  }));
});

// --- Group B: site lookup --------------------------------------------------

describe("site lookup", () => {
  it("proceeds for a valid, existing site", () => {
    const outcome = submitReport(submitInput());
    expect(outcome.kind).toBe("success");
  });

  it("returns site_not_found for an unknown siteId, without any writes", () => {
    const outcome = submitReport(submitInput({ siteId: "STE-MISSING" }));
    expect(outcome.kind).toBe("site_not_found");
    expect(mockUploadReportPhoto).not.toHaveBeenCalled();
    expect(mockAppendReportRow).not.toHaveBeenCalled();
    expect(mockAppendReportPhotoRow).not.toHaveBeenCalled();
    expect(mockSendAdminNotification).not.toHaveBeenCalled();
  });

  it("returns sites_unavailable when the SITES sheet itself fails validation, without any writes", () => {
    mockGetSiteRows.mockReturnValue([siteRow({ status: "PENDING" })]);
    const outcome = submitReport(submitInput());
    expect(outcome.kind).toBe("sites_unavailable");
    expect(mockAppendReportRow).not.toHaveBeenCalled();
  });
});

describe("work type lookup", () => {
  it("proceeds and derives workTypeName for a valid, existing work type code", () => {
    const outcome = submitReport(submitInput());
    expect(outcome.kind).toBe("success");
    expect(mockAppendReportRow.mock.calls[0][0].workTypeName).toBe("電気工事");
    if (outcome.kind === "success") {
      expect(outcome.report.workTypeName).toBe("電気工事");
    }
  });

  it("returns work_type_not_found for an unknown code, without any writes", () => {
    const outcome = submitReport(submitInput({ workType: "unknown-code" }));
    expect(outcome.kind).toBe("work_type_not_found");
    expect(mockUploadReportPhoto).not.toHaveBeenCalled();
    expect(mockAppendReportRow).not.toHaveBeenCalled();
    expect(mockSendAdminNotification).not.toHaveBeenCalled();
  });

  it("returns work_type_not_found for an INACTIVE work type code", () => {
    mockGetWorkTypeRows.mockReturnValue([workTypeRow({ status: "INACTIVE" })]);
    const outcome = submitReport(submitInput());
    expect(outcome.kind).toBe("work_type_not_found");
  });

  it("returns work_types_unavailable when the WORK_TYPES sheet itself fails validation, without any writes", () => {
    mockGetWorkTypeRows.mockReturnValue([{ ...workTypeRow(), status: "PENDING" }]);
    const outcome = submitReport(submitInput());
    expect(outcome.kind).toBe("work_types_unavailable");
    expect(mockAppendReportRow).not.toHaveBeenCalled();
  });
});

describe("progress status lookup", () => {
  it("proceeds and derives progressStatusName for a valid, existing progress status code", () => {
    const outcome = submitReport(submitInput());
    expect(outcome.kind).toBe("success");
    expect(mockAppendReportRow.mock.calls[0][0].progressStatusName).toBe("進行中");
    if (outcome.kind === "success") {
      expect(outcome.report.progressStatusName).toBe("進行中");
    }
  });

  it("returns progress_status_not_found for an unknown code, without any writes", () => {
    const outcome = submitReport(submitInput({ progressStatus: "unknown-code" }));
    expect(outcome.kind).toBe("progress_status_not_found");
    expect(mockUploadReportPhoto).not.toHaveBeenCalled();
    expect(mockAppendReportRow).not.toHaveBeenCalled();
    expect(mockSendAdminNotification).not.toHaveBeenCalled();
  });

  it("returns progress_status_not_found for an INACTIVE progress status code", () => {
    mockGetProgressStatusRows.mockReturnValue([progressStatusRow({ status: "INACTIVE" })]);
    const outcome = submitReport(submitInput());
    expect(outcome.kind).toBe("progress_status_not_found");
  });

  it("returns progress_statuses_unavailable when the PROGRESS_STATUS sheet itself fails validation, without any writes", () => {
    mockGetProgressStatusRows.mockReturnValue([{ ...progressStatusRow(), status: "PENDING" }]);
    const outcome = submitReport(submitInput());
    expect(outcome.kind).toBe("progress_statuses_unavailable");
    expect(mockAppendReportRow).not.toHaveBeenCalled();
  });
});

// --- Group C: report ID -----------------------------------------------------

describe("report ID", () => {
  it("uses the same reportId for the REPORTS row, every REPORT_PHOTOS row, and the response", () => {
    const outcome = submitReport(threePhotosInput());
    expect(outcome.kind).toBe("success");
    const reportRowArg = mockAppendReportRow.mock.calls[0][0];
    const photoRowArgs = mockAppendReportPhotoRow.mock.calls.map((call) => call[0]);
    expect(photoRowArgs).toHaveLength(3);
    for (const photoRow of photoRowArgs) {
      expect(photoRow.reportId).toBe(reportRowArg.reportId);
    }
    if (outcome.kind === "success") {
      expect(outcome.report.reportId).toBe(reportRowArg.reportId);
    }
  });

  it("generates a distinct photoId for every photo in the submission", () => {
    submitReport(threePhotosInput());
    const photoIds = mockAppendReportPhotoRow.mock.calls.map((call) => call[0].photoId);
    expect(new Set(photoIds).size).toBe(3);
  });
});

// --- Group D: Drive upload ---------------------------------------------------

describe("Drive upload", () => {
  it("uploads a single photo into the configured folder", () => {
    submitReport(onePhotoInput());
    expect(mockUploadReportPhoto).toHaveBeenCalledTimes(1);
    expect(mockUploadReportPhoto.mock.calls[0][0]).toMatchObject({
      folderId: "FOLDER-1",
      mimeType: "image/jpeg",
      base64Data: "aGVsbG8=",
    });
  });

  it("uploads multiple photos", () => {
    submitReport(threePhotosInput());
    expect(mockUploadReportPhoto).toHaveBeenCalledTimes(3);
  });

  it("builds a deterministic filename from reportId, sequence, and the original name", () => {
    submitReport(threePhotosInput());
    const reportId = mockAppendReportRow.mock.calls[0][0].reportId;
    expect(mockUploadReportPhoto.mock.calls[0][0].fileName).toBe(`${reportId}_1_a.jpg`);
    expect(mockUploadReportPhoto.mock.calls[1][0].fileName).toBe(`${reportId}_2_b.png`);
    expect(mockUploadReportPhoto.mock.calls[2][0].fileName).toBe(`${reportId}_3_c.jpg`);
  });

  it("stores the resulting fileId and fileUrl into the REPORT_PHOTOS row", () => {
    submitReport(onePhotoInput());
    const photoRow = mockAppendReportPhotoRow.mock.calls[0][0];
    expect(photoRow.fileId).toBe("FILE-" + mockUploadReportPhoto.mock.calls[0][0].fileName);
    expect(photoRow.fileUrl).toContain("https://drive.google.com/");
  });

  it("persists the correct mimeType per photo", () => {
    submitReport(threePhotosInput());
    const mimeTypes = mockAppendReportPhotoRow.mock.calls.map((call) => call[0].mimeType);
    expect(mimeTypes).toEqual(["image/jpeg", "image/png", "image/jpeg"]);
  });

  it("returns a structured drive_upload_failed error when Drive throws, without writing REPORTS", () => {
    mockUploadReportPhoto.mockImplementation(() => {
      throw new Error("Drive quota exceeded");
    });
    const outcome = submitReport(onePhotoInput());
    expect(outcome.kind).toBe("drive_upload_failed");
    if (outcome.kind === "drive_upload_failed") {
      expect(outcome.reason).toBe("Drive quota exceeded");
    }
    expect(mockAppendReportRow).not.toHaveBeenCalled();
  });

  it("cleans up already-uploaded photos when a later photo in the same submission fails to upload", () => {
    let call = 0;
    mockUploadReportPhoto.mockImplementation(({ fileName }: { fileName: string }) => {
      call++;
      if (call === 2) {
        throw new Error("upload failed on second photo");
      }
      return { fileId: `FILE-${fileName}`, fileUrl: `https://drive.google.com/${fileName}` };
    });
    const outcome = submitReport(threePhotosInput());
    expect(outcome.kind).toBe("drive_upload_failed");
    expect(mockDeleteUploadedFile).toHaveBeenCalledTimes(1);
    expect(mockDeleteUploadedFile.mock.calls[0][0]).toMatch(/^FILE-/);
  });
});

// --- Group E: REPORTS write --------------------------------------------------

describe("REPORTS write", () => {
  it("writes a row with the correct siteId, reportDate, status, and photoCount", () => {
    submitReport(threePhotosInput());
    const row = mockAppendReportRow.mock.calls[0][0];
    expect(row.siteId).toBe("STE-1");
    expect(row.reportDate).toBe("2026-09-12");
    expect(row.status).toBe("SUBMITTED");
    expect(row.photoCount).toBe(3);
  });

  it("writes hasIssue and issueDetail through unchanged from the input", () => {
    submitReport(submitInput({ hasIssue: "YES", issueDetail: "足場が不足しています" }));
    const row = mockAppendReportRow.mock.calls[0][0];
    expect(row.hasIssue).toBe("YES");
    expect(row.issueDetail).toBe("足場が不足しています");
  });

  it("writes hasIssue:NO with no issueDetail when the input has none", () => {
    submitReport(submitInput({ hasIssue: "NO" }));
    const row = mockAppendReportRow.mock.calls[0][0];
    expect(row.hasIssue).toBe("NO");
    expect(row.issueDetail).toBeUndefined();
  });

  it("generates matching, valid ISO createdAt/updatedAt timestamps", () => {
    submitReport(submitInput());
    const row = mockAppendReportRow.mock.calls[0][0];
    expect(row.createdAt).toBe(row.updatedAt);
    expect(new Date(row.createdAt).toISOString()).toBe(row.createdAt);
  });

  it("returns a structured reports_write_failed error and cleans up uploaded Drive files", () => {
    mockAppendReportRow.mockImplementation(() => {
      throw new Error("Sheets append failed");
    });
    const outcome = submitReport(onePhotoInput());
    expect(outcome.kind).toBe("reports_write_failed");
    if (outcome.kind === "reports_write_failed") {
      expect(outcome.reason).toBe("Sheets append failed");
    }
    expect(mockDeleteUploadedFile).toHaveBeenCalledTimes(1);
    expect(mockAppendReportPhotoRow).not.toHaveBeenCalled();
    expect(mockSendAdminNotification).not.toHaveBeenCalled();
  });
});

// --- Group F: REPORT_PHOTOS write --------------------------------------------

describe("REPORT_PHOTOS write", () => {
  it("writes one row for one photo", () => {
    submitReport(onePhotoInput());
    expect(mockAppendReportPhotoRow).toHaveBeenCalledTimes(1);
  });

  it("writes three rows for three photos, every one referencing the same reportId", () => {
    submitReport(threePhotosInput());
    expect(mockAppendReportPhotoRow).toHaveBeenCalledTimes(3);
    const reportIds = new Set(mockAppendReportPhotoRow.mock.calls.map((call) => call[0].reportId));
    expect(reportIds.size).toBe(1);
  });

  it("persists fileId, fileUrl, fileName, and mimeType per row", () => {
    submitReport(onePhotoInput());
    const row = mockAppendReportPhotoRow.mock.calls[0][0];
    expect(row.fileId).toBeTruthy();
    expect(row.fileUrl).toBeTruthy();
    expect(row.fileName).toBeTruthy();
    expect(row.mimeType).toBe("image/jpeg");
  });

  it("returns a structured report_photos_write_failed error and cleans up uploaded Drive files", () => {
    mockAppendReportPhotoRow.mockImplementation(() => {
      throw new Error("Sheets append failed for photo row");
    });
    const outcome = submitReport(onePhotoInput());
    expect(outcome.kind).toBe("report_photos_write_failed");
    expect(mockDeleteUploadedFile).toHaveBeenCalledTimes(1);
    expect(mockSendAdminNotification).not.toHaveBeenCalled();
    // The REPORTS row itself is a documented, accepted limitation: it is
    // not (and cannot safely be) rolled back — see
    // docs/site-report-architecture-overview.md.
    expect(mockAppendReportRow).toHaveBeenCalledTimes(1);
  });
});

// --- Group G: email -----------------------------------------------------------

describe("admin notification", () => {
  it("sends the notification after successful persistence, to the configured admin address", () => {
    submitReport(onePhotoInput());
    expect(mockSendAdminNotification).toHaveBeenCalledTimes(1);
    expect(mockSendAdminNotification.mock.calls[0][0]).toBe("admin@example.com");
  });

  it("includes the persisted report and site in the notification call", () => {
    submitReport(submitInput());
    const [, report, site] = mockSendAdminNotification.mock.calls[0];
    expect(report.workType).toBe("wiring");
    expect(site.siteId).toBe("STE-1");
  });

  it("still returns success with notificationSent:false when email fails, without creating a duplicate report", () => {
    mockSendAdminNotification.mockImplementation(() => {
      throw new Error("Gmail quota exceeded");
    });
    const outcome = submitReport(submitInput());
    expect(outcome.kind).toBe("success");
    if (outcome.kind === "success") {
      expect(outcome.notificationSent).toBe(false);
    }
    expect(mockAppendReportRow).toHaveBeenCalledTimes(1);
  });
});

// --- Group H: partial failures (consolidated view across the groups above) --

describe("partial failure policy", () => {
  it("Case 2 — Drive upload fails: no REPORTS/REPORT_PHOTOS write, no email", () => {
    mockUploadReportPhoto.mockImplementation(() => {
      throw new Error("boom");
    });
    submitReport(onePhotoInput());
    expect(mockAppendReportRow).not.toHaveBeenCalled();
    expect(mockAppendReportPhotoRow).not.toHaveBeenCalled();
    expect(mockSendAdminNotification).not.toHaveBeenCalled();
  });

  it("Case 3 — REPORTS write fails after Drive upload: cleanup attempted, no email", () => {
    mockAppendReportRow.mockImplementation(() => {
      throw new Error("boom");
    });
    const outcome = submitReport(onePhotoInput());
    expect(outcome.kind).not.toBe("success");
    expect(mockDeleteUploadedFile).toHaveBeenCalled();
    expect(mockSendAdminNotification).not.toHaveBeenCalled();
  });

  it("Case 4 — REPORT_PHOTOS write fails: no success, cleanup attempted", () => {
    mockAppendReportPhotoRow.mockImplementation(() => {
      throw new Error("boom");
    });
    const outcome = submitReport(onePhotoInput());
    expect(outcome.kind).not.toBe("success");
    expect(mockDeleteUploadedFile).toHaveBeenCalled();
  });

  it("Case 5 — email fails after successful persistence: success with notificationSent:false, single report only", () => {
    mockSendAdminNotification.mockImplementation(() => {
      throw new Error("boom");
    });
    const outcome = submitReport(onePhotoInput());
    expect(outcome.kind).toBe("success");
    expect(mockAppendReportRow).toHaveBeenCalledTimes(1);
  });

  it("does not attempt Drive cleanup on a cleanup call's own failure beyond logging (never throws out of submitReport)", () => {
    mockAppendReportRow.mockImplementation(() => {
      throw new Error("boom");
    });
    mockDeleteUploadedFile.mockImplementation(() => {
      throw new Error("trash failed");
    });
    expect(() => submitReport(onePhotoInput())).not.toThrow();
  });
});
