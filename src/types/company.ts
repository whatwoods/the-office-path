export type CompanyStage =
  | "garage"
  | "small_team"
  | "series_a"
  | "growth"
  | "pre_ipo"
  | "public";

export const STAGE_BASE_REVENUE: Record<CompanyStage, number> = {
  garage: 50000,
  small_team: 200000,
  series_a: 1000000,
  growth: 5000000,
  pre_ipo: 20000000,
  public: 50000000,
};

export const STAGE_BASE_CUSTOMERS: Record<CompanyStage, number> = {
  garage: 5,
  small_team: 20,
  series_a: 50,
  growth: 200,
  pre_ipo: 500,
  public: 1000,
};

export type OfficeType = "home" | "incubator" | "office" | "grade_a";

export const OFFICE_RENT: Record<OfficeType, number> = {
  home: 3000,
  incubator: 15000,
  office: 60000,
  grade_a: 150000,
};

export interface CompanyState {
  stage: CompanyStage;
  productQuality: number;
  teamSatisfaction: number;
  customerCount: number;
  brandAwareness: number;
  employeeCount: number;
  quarterlyRevenue: number;
  quarterlyExpenses: number;
  cashFlow: number;
  valuation: number;
  officeType: OfficeType;
  founderEquity: number;
  consecutiveNegativeCashFlow: number;
  consecutiveProfitableQuarters: number;
  hasSeriesAFunding: boolean;
  annualGrowthRate: number;
}
