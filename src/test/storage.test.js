import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  formatBytes,
  getItem,
  getStorageUsage,
  initStorage,
  removeItem,
  setItem,
} from "../utils/storage";

describe("formatBytes", () => {
  it("formats 0 bytes", () => {
    expect(formatBytes(0)).toContain("0");
  });

  it("formats bytes", () => {
    expect(formatBytes(500)).toContain("500");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toContain("KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toContain("MB");
  });
});

describe("localStorage wrapper", () => {
  beforeEach(() => {
    localStorage.clear();
    initStorage();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("setItem and getItem work for objects", () => {
    setItem("test-key", { a: 1, b: "hello" });
    const result = getItem("test-key");
    expect(result).toEqual({ a: 1, b: "hello" });
  });

  it("getItem returns null for missing key", () => {
    expect(getItem("missing")).toBeNull();
  });

  it("removeItem removes the key", () => {
    setItem("test-key", "value");
    removeItem("test-key");
    expect(getItem("test-key")).toBeNull();
  });

  it("handles invalid JSON gracefully", () => {
    localStorage.setItem("contextmoney-bad", "not json{");
    expect(getItem("bad")).toBeNull();
  });
});

describe("getStorageUsage", () => {
  it("returns an object with usage properties", () => {
    const usage = getStorageUsage();
    expect(usage).toHaveProperty("usedBytes");
    expect(usage).toHaveProperty("totalBytes");
    expect(usage).toHaveProperty("percentage");
    expect(usage).toHaveProperty("isNearLimit");
    expect(typeof usage.usedBytes).toBe("number");
  });
});
