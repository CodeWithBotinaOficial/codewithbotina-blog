// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_STATE_KEY,
  clearAuthState,
  getAuthState,
  setAuthState,
} from "../../../src/lib/auth-state";

describe("auth-state", () => {
  beforeEach(() => {
    document.cookie = `${AUTH_STATE_KEY}=; Path=/; Max-Age=0`;
    window.localStorage.clear();
  });

  afterEach(() => {
    document.cookie = `${AUTH_STATE_KEY}=; Path=/; Max-Age=0`;
    window.localStorage.clear();
  });

  it("restores authenticated state from localStorage when the cookie is missing", () => {
    window.localStorage.setItem(AUTH_STATE_KEY, "1");

    expect(getAuthState()).toBe(true);
  });

  it("persists a seven-day auth hint when logging in", () => {
    setAuthState(true);

    expect(window.localStorage.getItem(AUTH_STATE_KEY)).toBe("1");
    expect(document.cookie).toContain(`${AUTH_STATE_KEY}=1`);
  });

  it("clears persistent auth state and leaves a short logout hint", () => {
    setAuthState(true);
    setAuthState(false);

    expect(window.localStorage.getItem(AUTH_STATE_KEY)).toBeNull();
    expect(getAuthState()).toBe(false);
  });

  it("removes both the cookie hint and localStorage on clear", () => {
    setAuthState(true);
    clearAuthState();

    expect(window.localStorage.getItem(AUTH_STATE_KEY)).toBeNull();
    expect(getAuthState()).toBeNull();
  });
});
