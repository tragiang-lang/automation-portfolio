import {
  assertRequiredHeaders,
  buildHeaderMap,
  findRowIndexByColumnValue,
  MissingHeadersError,
  objectToRow,
  rowsToObjects,
} from "../src/RowMapper";

describe("buildHeaderMap", () => {
  it("maps header names to their column index", () => {
    expect(buildHeaderMap(["Key", "Value", "Description"])).toEqual({
      Key: 0,
      Value: 1,
      Description: 2,
    });
  });

  it("trims whitespace and ignores empty header cells", () => {
    expect(buildHeaderMap([" Key ", "", "Value"])).toEqual({
      Key: 0,
      Value: 2,
    });
  });
});

describe("assertRequiredHeaders", () => {
  it("does not throw when every required header is present", () => {
    expect(() =>
      assertRequiredHeaders({ Key: 0, Value: 1 }, ["Key", "Value"]),
    ).not.toThrow();
  });

  it("throws MissingHeadersError listing every missing header", () => {
    expect(() =>
      assertRequiredHeaders({ Key: 0 }, ["Key", "Value", "Description"]),
    ).toThrow(MissingHeadersError);
    try {
      assertRequiredHeaders({ Key: 0 }, ["Key", "Value", "Description"]);
    } catch (error) {
      expect((error as MissingHeadersError).missing).toEqual([
        "Value",
        "Description",
      ]);
    }
  });
});

describe("rowsToObjects", () => {
  const headerMap = buildHeaderMap(["Name", "Active", "DisplayOrder"]);

  it("maps data rows to objects using only the requested columns", () => {
    const result = rowsToObjects(
      headerMap,
      [["Alice", true, 1], ["Bob", false, 2]],
      ["Name", "Active", "DisplayOrder"],
    );
    expect(result).toEqual([
      { Name: "Alice", Active: true, DisplayOrder: 1 },
      { Name: "Bob", Active: false, DisplayOrder: 2 },
    ]);
  });

  it("defaults a missing cell value to an empty string, never undefined", () => {
    const result = rowsToObjects<{ Name: unknown; Active: unknown }>(
      headerMap,
      [["Alice", undefined, 1]],
      ["Name", "Active"],
    );
    expect(result[0].Active).toBe("");
  });

  it("throws MissingHeadersError when a required column is absent", () => {
    expect(() =>
      rowsToObjects(headerMap, [["Alice"]], ["Name", "CalendarID"]),
    ).toThrow(MissingHeadersError);
  });

  it("includes an optional column's value when the sheet has that header", () => {
    const withRole = buildHeaderMap(["Name", "Active", "DisplayOrder", "Role"]);
    const result = rowsToObjects(
      withRole,
      [["Alice", true, 1, "Manager"]],
      ["Name", "Active", "DisplayOrder"],
      ["Role"],
    );
    expect(result).toEqual([{ Name: "Alice", Active: true, DisplayOrder: 1, Role: "Manager" }]);
  });

  it("never throws when an optional column's header is entirely absent from the sheet", () => {
    expect(() =>
      rowsToObjects(headerMap, [["Alice", true, 1]], ["Name", "Active", "DisplayOrder"], ["Role"]),
    ).not.toThrow();
    const result = rowsToObjects(
      headerMap,
      [["Alice", true, 1]],
      ["Name", "Active", "DisplayOrder"],
      ["Role"],
    );
    expect(result[0]).not.toHaveProperty("Role");
  });
});

describe("objectToRow", () => {
  it("serializes in deterministic column order", () => {
    expect(
      objectToRow(["Name", "Active"], { Active: true, Name: "Alice" }),
    ).toEqual(["Alice", true]);
  });

  it("converts undefined and null to empty string", () => {
    expect(
      objectToRow(["Name", "Notes"], { Name: "Alice", Notes: undefined }),
    ).toEqual(["Alice", ""]);
    expect(
      objectToRow(["Name", "Notes"], { Name: "Alice", Notes: null }),
    ).toEqual(["Alice", ""]);
  });

  it("throws instead of silently producing [object Object]", () => {
    expect(() =>
      objectToRow(["Name", "CreatedAt"], { Name: "Alice", CreatedAt: new Date() }),
    ).toThrow(TypeError);
  });
});

describe("findRowIndexByColumnValue", () => {
  const headerMap = { ReservationID: 0, SubmissionID: 1, Status: 2 };
  const dataRows = [
    ["RES-A", "sub-1", "処理中"],
    ["RES-B", "sub-2", "受付済"],
  ];

  it("returns the 0-based index of the first matching row", () => {
    expect(findRowIndexByColumnValue(headerMap, dataRows, "SubmissionID", "sub-2")).toBe(1);
  });

  it("returns null when no row matches", () => {
    expect(findRowIndexByColumnValue(headerMap, dataRows, "SubmissionID", "sub-missing")).toBeNull();
  });

  it("returns null when the column itself does not exist in the header map", () => {
    expect(findRowIndexByColumnValue(headerMap, dataRows, "NotAColumn", "sub-1")).toBeNull();
  });

  it("coerces both sides through String() before comparing", () => {
    const numericHeaderMap = { Code: 0 };
    expect(findRowIndexByColumnValue(numericHeaderMap, [[42]], "Code", "42")).toBe(0);
  });
});
