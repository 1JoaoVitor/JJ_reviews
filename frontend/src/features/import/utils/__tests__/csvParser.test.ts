import { describe, it, expect } from "vitest";
import {
  parseCsv,
  validateHeaders,
  getField,
  getNumericField,
  getDateField,
  getBooleanField,
} from "../csvParser";

describe("csvParser", () => {
  describe("parseCsv", () => {
    it("should parse simple CSV with headers", () => {
      const csv = 'Name,Year,Rating\n"The Matrix",1999,5';
      const result = parseCsv(csv);

      expect(result.headers).toEqual(["Name", "Year", "Rating"]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual({
        Name: "The Matrix",
        Year: "1999",
        Rating: "5",
      });
    });

    it("should handle quoted fields with commas", () => {
      const csv = 'Name,Description\n"The Matrix, Part 1","A sci-fi movie, classic"';
      const result = parseCsv(csv);

      expect(result.rows[0]).toEqual({
        Name: "The Matrix, Part 1",
        Description: "A sci-fi movie, classic",
      });
    });

    it("should handle escaped quotes in fields", () => {
      const csv = 'Title,Review\n"Inception","It\'s a ""great"" movie"';
      const result = parseCsv(csv);

      expect(result.rows[0].Review).toContain('great');
    });

    it("should skip Letterboxd metadata rows", () => {
      const csv = `Letterboxd list export v7
Name,Year,Rating
"The Matrix",1999,5
"Inception",2010,5`;
      const result = parseCsv(csv);

      expect(result.headers).toEqual(["Name", "Year", "Rating"]);
      expect(result.rows).toHaveLength(2);
    });

    it("should return error for empty CSV", () => {
      const result = parseCsv("");
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.rows).toHaveLength(0);
    });

    it("should skip empty rows when option is set", () => {
      const csv = `Name,Year
"The Matrix",1999

"Inception",2010`;
      const result = parseCsv(csv, { skipEmptyRows: true });
      expect(result.rows).toHaveLength(2);
    });

    it("should handle Letterboxd ratings CSV format", () => {
      const csv = `Name,Year,Letterboxd URI,Date,Rating
"The Matrix",1999,https://letterboxd.com/...,2024-01-15,5
"Inception",2010,https://letterboxd.com/...,2024-01-16,5`;
      const result = parseCsv(csv);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].Rating).toBe("5");
    });
  });

  describe("validateHeaders", () => {
    it("should validate matching headers", () => {
      const actual = ["Name", "Year", "Rating"];
      const expected = ["Name", "Year", "Rating"];
      const result = validateHeaders(actual, expected);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
    });

    it("should detect missing headers", () => {
      const actual = ["Name", "Year"];
      const expected = ["Name", "Year", "Rating"];
      const result = validateHeaders(actual, expected);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain("Rating");
    });

    it("should detect extra headers", () => {
      const actual = ["Name", "Year", "Rating", "Review"];
      const expected = ["Name", "Year", "Rating"];
      const result = validateHeaders(actual, expected);

      expect(result.extra).toContain("Review");
    });

    it("should be case-insensitive", () => {
      const actual = ["name", "year", "rating"];
      const expected = ["Name", "Year", "Rating"];
      const result = validateHeaders(actual, expected);

      expect(result.valid).toBe(true);
    });
  });

  describe("getField", () => {
    const row = {
      Name: "The Matrix",
      Year: "1999",
      Rating: "5",
    };

    it("should extract exact field", () => {
      const result = getField(row, "Name");
      expect(result.value).toBe("The Matrix");
      expect(result.error).toBeUndefined();
    });

    it("should extract field case-insensitively", () => {
      const result = getField(row, "name");
      expect(result.value).toBe("The Matrix");
    });

    it("should return null for missing field", () => {
      const result = getField(row, "Director");
      expect(result.value).toBeNull();
    });

    it("should error on required missing field", () => {
      const result = getField(row, "Director", { required: true });
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Required");
    });

    it("should trim whitespace", () => {
      const rowWithSpaces = { Name: "  The Matrix  " };
      const result = getField(rowWithSpaces, "Name", { trim: true });
      expect(result.value).toBe("The Matrix");
    });

    it("should validate with custom function", () => {
      const result = getField(row, "Rating", {
        validate: (v) => v !== "5",
      });
      expect(result.error).toBeDefined();
    });
  });

  describe("getNumericField", () => {
    const row = { Rating: "5", Year: "1999" };

    it("should extract numeric field", () => {
      const result = getNumericField(row, "Rating");
      expect(result.value).toBe(5);
    });

    it("should validate min value", () => {
      const result = getNumericField(row, "Rating", { min: 1, max: 5 });
      expect(result.error).toBeUndefined();
    });

    it("should error on value below minimum", () => {
      const result = getNumericField(row, "Rating", { min: 10 });
      expect(result.error).toBeDefined();
    });

    it("should error on value above maximum", () => {
      const result = getNumericField(row, "Rating", { max: 3 });
      expect(result.error).toBeDefined();
    });

    it("should error on non-numeric value", () => {
      const result = getNumericField({ Value: "abc" }, "Value");
      expect(result.error).toBeDefined();
    });
  });

  describe("getDateField", () => {
    it("should parse ISO date format", () => {
      const row = { Date: "2024-01-15" };
      const result = getDateField(row, "Date");
      expect(result.value).toBeTruthy();
      expect(result.error).toBeUndefined();
    });

    it("should parse MM/DD/YYYY format", () => {
      const row = { Date: "01/15/2024" };
      const result = getDateField(row, "Date");
      expect(result.value).toBeTruthy();
      expect(result.error).toBeUndefined();
    });

    it("should parse DD/MM/YYYY format (day > 12)", () => {
      const row = { Date: "15/01/2024" };
      const result = getDateField(row, "Date");
      expect(result.value).toBeTruthy();
      expect(result.error).toBeUndefined();
    });

    it("should use fallback for missing date", () => {
      const row = { OtherField: "value" };
      const result = getDateField(row, "Date", { fallback: "2024-01-01T00:00:00.000Z" });
      expect(result.value).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should error on invalid date format", () => {
      const row = { Date: "invalid" };
      const result = getDateField(row, "Date", { required: true });
      expect(result.error).toBeDefined();
    });
  });

  describe("getBooleanField", () => {
    it("should parse 'yes' as true", () => {
      const row = { Rewatch: "yes" };
      const result = getBooleanField(row, "Rewatch");
      expect(result.value).toBe(true);
    });

    it("should parse 'true' as true", () => {
      const row = { Rewatch: "true" };
      const result = getBooleanField(row, "Rewatch");
      expect(result.value).toBe(true);
    });

    it("should parse '1' as true", () => {
      const row = { Rewatch: "1" };
      const result = getBooleanField(row, "Rewatch");
      expect(result.value).toBe(true);
    });

    it("should parse 'sim' (Portuguese) as true", () => {
      const row = { Rewatch: "sim" };
      const result = getBooleanField(row, "Rewatch");
      expect(result.value).toBe(true);
    });

    it("should parse other values as false", () => {
      const row = { Rewatch: "no" };
      const result = getBooleanField(row, "Rewatch");
      expect(result.value).toBe(false);
    });

    it("should return null for missing field", () => {
      const row = {};
      const result = getBooleanField(row, "Rewatch");
      expect(result.value).toBeNull();
    });
  });
});
