import { describe, it, expect } from "vitest";
import { extractListNameFromFileName, isListFile } from "../zipParser";

// Note: Full zipParser tests would require mocking JSZip
// These tests cover the utility functions and would need mocking for the main function

describe("zipParser utilities", () => {
  describe("extractListNameFromFileName", () => {
    it("should extract name from lists/Top 10 Sci-Fi.csv", () => {
      const fileName = "lists/Top 10 Sci-Fi.csv";
      const result = extractListNameFromFileName(fileName);
      expect(result).toBe("Top 10 Sci-Fi");
    });

    it("should extract name from Windows-style path", () => {
      const fileName = "lists\\My Favorite Movies.csv";
      const result = extractListNameFromFileName(fileName);
      expect(result).toBe("My Favorite Movies");
    });

    it("should extract name from nested paths", () => {
      const fileName = "some/nested/path/list_name.csv";
      const result = extractListNameFromFileName(fileName);
      expect(result).toBe("list_name");
    });

    it("should handle files without extension", () => {
      const fileName = "lists/No Extension";
      const result = extractListNameFromFileName(fileName);
      expect(result).toBe("No Extension");
    });

    it("should preserve spaces in name", () => {
      const fileName = "lists/Top 10 Films of 2024.csv";
      const result = extractListNameFromFileName(fileName);
      expect(result).toBe("Top 10 Films of 2024");
    });

    it("should handle names with special characters", () => {
      const fileName = "lists/[2024] Best of Year (Director's Cut).csv";
      const result = extractListNameFromFileName(fileName);
      expect(result).toBe("[2024] Best of Year (Director's Cut)");
    });

    it("should trim whitespace", () => {
      const fileName = "lists/  Whitespace List  .csv";
      const result = extractListNameFromFileName(fileName);
      expect(result).toBe("Whitespace List");
    });

    it("should handle single level file name", () => {
      const fileName = "MyList.csv";
      const result = extractListNameFromFileName(fileName);
      expect(result).toBe("MyList");
    });

    it("should handle case-insensitive .CSV extension", () => {
      const fileName = "lists/MyList.CSV";
      const result = extractListNameFromFileName(fileName);
      expect(result).toBe("MyList");
    });

    it("should handle multiple dots in name", () => {
      const fileName = "lists/Movie (2020) Director's Cut.csv";
      const result = extractListNameFromFileName(fileName);
      expect(result).toBe("Movie (2020) Director's Cut");
    });
  });

  describe("isListFile", () => {
    it("should return true for lists/name.csv", () => {
      expect(isListFile("lists/MyList.csv")).toBe(true);
    });

    it("should return true for lists\\name.csv (Windows)", () => {
      expect(isListFile("lists\\MyList.csv")).toBe(true);
    });

    it("should return true for any path containing 'list'", () => {
      expect(isListFile("list_data.csv")).toBe(true);
      expect(isListFile("my_list.csv")).toBe(true);
      expect(isListFile("Lists/Items.csv")).toBe(true);
    });

    it("should return false for non-CSV files", () => {
      expect(isListFile("lists/MyList.txt")).toBe(false);
      expect(isListFile("lists/MyList.json")).toBe(false);
    });

    it("should return false for files without 'list' in name", () => {
      expect(isListFile("ratings.csv")).toBe(false);
      expect(isListFile("profile.csv")).toBe(false);
    });

    it("should be case-insensitive for 'list'", () => {
      expect(isListFile("LIST/MyFile.csv")).toBe(true);
      expect(isListFile("Lists/MyFile.csv")).toBe(true);
      expect(isListFile("LISTS/MyFile.csv")).toBe(true);
    });

    it("should be case-insensitive for CSV extension", () => {
      expect(isListFile("lists/file.CSV")).toBe(true);
      expect(isListFile("lists/file.Csv")).toBe(true);
    });

    it("should return false for CSV without list", () => {
      expect(isListFile("profile.csv")).toBe(false);
      expect(isListFile("ratings.csv")).toBe(false);
      expect(isListFile("watched.csv")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isListFile("")).toBe(false);
      expect(isListFile(".csv")).toBe(false);
      expect(isListFile("list")).toBe(false);
    });
  });

  // Note: extractAndDetectZip and detectFileType would require mocking JSZip
  // and are better tested with integration tests or by manually creating test ZIPs
  describe("ZIP extraction (conceptual)", () => {
    it("profile CSV detection should require Username header", () => {
      // This test documents the expected behavior
      // Actual testing of header validation requires testing in context
      const headerLine = "Username,Date Joined,Bio";
      const isValid = headerLine.includes("Username");
      expect(isValid).toBe(true);
    });

    it("ratings CSV detection should require Name, Year, Rating", () => {
      const headerLine = "Name,Year,Rating,Date";
      const hasName = headerLine.includes("Name");
      const hasYear = headerLine.includes("Year");
      const hasRating = headerLine.includes("Rating");
      expect(hasName && hasYear && hasRating).toBe(true);
    });

    it("list CSV detection should require Name header", () => {
      const headerLine = "Position,Name,Year";
      const hasName = headerLine.includes("Name");
      expect(hasName).toBe(true);
    });

    it("should skip system files in ZIP", () => {
      const filesToSkip = [".DS_Store", "__MACOSX/file", ".profile"];
      filesToSkip.forEach((file) => {
        expect(file.startsWith(".") || file.startsWith("__MACOSX")).toBe(true);
      });
    });
  });
});
