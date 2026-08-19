import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("self-hosted deployment contract", () => {
  it("declares the Node application, MySQL 8.4, and Nginx services", () => {
    const compose = readFileSync(resolve(projectRoot, "docker-compose.yml"), "utf8");
    expect(compose).toContain("app:");
    expect(compose).toContain("mysql:");
    expect(compose).toContain("image: mysql:8.4");
    expect(compose).toContain("nginx:");
    expect(compose).toContain("${JWT_SECRET:?set JWT_SECRET}");
  });

  it("commits append-only MySQL trigger guards for all regulated evidence tables", () => {
    const migration = readFileSync(resolve(projectRoot, "drizzle/0001_cultured_titania.sql"), "utf8");
    for (const table of ["auditEvents", "visitLogs", "sampleTransactions", "electronicSignatures"]) {
      expect(migration).toContain(`BEFORE UPDATE ON \`${table}\``);
      expect(migration).toContain(`BEFORE DELETE ON \`${table}\``);
    }
  });
});
