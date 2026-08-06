export type TimePunch = {
  id: string;
  employeeKey: string;
  employeeName: string;
  type: "in" | "out";
  punchedAt: string;
};

export function seedTimePunches(): TimePunch[] {
  return [];
}

export function latestPunchFor(
  punches: TimePunch[],
  employeeKey: string
): TimePunch | null {
  const mine = punches
    .filter((p) => p.employeeKey === employeeKey)
    .sort((a, b) => b.punchedAt.localeCompare(a.punchedAt));
  return mine[0] ?? null;
}

export function isClockedIn(punches: TimePunch[], employeeKey: string) {
  const latest = latestPunchFor(punches, employeeKey);
  return latest?.type === "in";
}
