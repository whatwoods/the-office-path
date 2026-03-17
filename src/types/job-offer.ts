import type { JobLevel } from "./game";

export interface JobOffer {
  id: string;
  companyName: string;
  companyProfile: string;
  offeredLevel: JobLevel;
  offeredSalary: number;
  companyStatus: "expanding" | "stable" | "shrinking";
  expiresAtQuarter: number;
  negotiated: boolean;
}

export interface PastJob {
  companyName: string;
  level: JobLevel;
  salary: number;
  startQuarter: number;
  endQuarter: number;
  reasonLeft: "job_hop" | "startup" | "fired" | "promoted_executive";
}
