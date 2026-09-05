import {
  assertRequiredHeaders,
  buildHeaderMap,
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
