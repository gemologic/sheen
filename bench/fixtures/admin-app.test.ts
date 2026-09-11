import { describe, expect, it } from "vitest";
import { createAdminWorkload, refreshAdminWorkload } from "../../apps/loupe/src/fixtures/admin-app-data.ts";
import type { AdminAccountRow, AdminWorkloadSummary } from "../../apps/loupe/src/fixtures/admin-app-data.ts";

function summarize(rows: readonly AdminAccountRow[]): AdminWorkloadSummary {
  let active = 0;
  let review = 0;
  let balance = 0;
  let requests = 0;
  let utilization = 0;
  for (const row of rows) {
    if (row.status === "Active") active += 1;
    if (row.status === "Review") review += 1;
    balance += row.balance;
    requests += row.requests;
    utilization += row.utilization;
  }
  return { active, review, balance, requests, utilization: rows.length === 0 ? 0 : utilization / rows.length };
}

describe("AdminApp workload summaries", () => {
  it("publishes a coherent summary with each generated snapshot", () => {
    const initial = createAdminWorkload("representative");
    const refreshed = refreshAdminWorkload(initial, 2);

    expect(initial.summary).toEqual(summarize(initial.rows));
    expect(refreshed.summary).toEqual(summarize(refreshed.rows));
    expect(refreshed.rows.every(row => row.revision === 2)).toBe(true);
    expect(Object.isFrozen(initial.summary)).toBe(true);
    expect(Object.isFrozen(refreshed.summary)).toBe(true);
  });
});
