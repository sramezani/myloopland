import { describe, expect, it } from "vitest";
import { sslFor } from "./ssl";

describe("sslFor", () => {
  it("requires TLS for remote hosts such as a managed Postgres", () => {
    expect(sslFor("postgresql://u:p%40ss@db.example.com:5432/postgres")).toBe(
      "require",
    );
  });

  it("skips TLS for local Docker and localhost", () => {
    expect(sslFor("postgres://myloopland:myloopland@localhost:5433/myloopland")).toBe(false);
    expect(sslFor("postgres://myloopland:myloopland@db:5432/myloopland")).toBe(false);
    expect(sslFor("postgres://u:p@127.0.0.1/x")).toBe(false);
  });

  it("lets the URL decide when it sets sslmode", () => {
    expect(sslFor("postgres://u:p@example.com/x?sslmode=disable")).toBeUndefined();
    expect(sslFor("postgres://u:p@localhost/x?sslmode=require")).toBeUndefined();
  });
});
