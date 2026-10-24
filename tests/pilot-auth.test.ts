import { describe, expect, test } from "bun:test";
import { requireUserBearerToken } from "../src/integrations/supabase/auth-token";

describe("Pilot requires a user bearer token", () => {
  test("rejects requests without authentication", () => {
    expect(() => requireUserBearerToken(new Headers())).toThrow("Unauthorized");
  });
  test("rejects non-bearer credentials", () => {
    expect(() => requireUserBearerToken(new Headers({ authorization: "Basic example" }))).toThrow("Unauthorized");
  });
  test("rejects an empty bearer token", () => {
    expect(() => requireUserBearerToken(new Headers({ authorization: "Bearer " }))).toThrow("Unauthorized");
  });
  test("rejects a publishable API key as a user token", () => {
    expect(() => requireUserBearerToken(new Headers({ authorization: "Bearer sb_publishable_example" }))).toThrow("Invalid token");
  });
  test("rejects an opaque privileged API key as a user token", () => {
    expect(() => requireUserBearerToken(new Headers({ authorization: "Bearer sb_secret_example" }))).toThrow("Invalid token");
  });
  test("rejects missing JWT segments", () => {
    expect(() => requireUserBearerToken(new Headers({ authorization: "Bearer header..signature" }))).toThrow("Invalid token");
  });
  test("passes the complete user JWT for remote verification", () => {
    expect(requireUserBearerToken(new Headers({ authorization: "Bearer header.payload.signature" }))).toBe("header.payload.signature");
  });
});