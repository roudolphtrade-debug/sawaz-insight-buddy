import { describe, expect, test } from "bun:test";
import { deterministicRespondent } from "../src/lib/studio/submission-presentation";

describe("Pilot respondent identity must be deterministic", () => {
  test("never attributes a collection recipient to a submission", () => {
    expect(deterministicRespondent({ respondent: "Invitee", respondentEmail: "invitee@example.test" }, "collection-recipient")).toBeNull();
  });
  test("does not identify a respondent from absent identity fields", () => {
    expect(deterministicRespondent({ respondent: null, respondentEmail: null }, "submission-contact")).toBeNull();
  });
  test("does not treat whitespace as an identity", () => {
    expect(deterministicRespondent({ respondent: " ", respondentEmail: " " }, "submission-contact")).toBeNull();
  });
  test("preserves an identity tied directly to a submission contact", () => {
    expect(deterministicRespondent({ respondent: "Respondent", respondentEmail: "respondent@example.test" }, "submission-contact")).toEqual({ respondent: "Respondent", respondentEmail: "respondent@example.test" });
  });
});