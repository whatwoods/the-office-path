import { RENT_TABLE } from "@/types/game";
import type { HousingType } from "@/types/game";

const BASE_FOOD = 3000;
const BASE_TRANSPORT = 1500;
const SLUM_TRANSPORT_EXTRA = 500;
const BASE_DAILY = 1500;

export interface QuarterlyExpenses {
  rent: number;
  food: number;
  transport: number;
  daily: number;
  total: number;
}

export interface QuarterlyEconomyResult {
  income: number;
  expenses: QuarterlyExpenses;
  net: number;
}

export const DOWN_PAYMENT = 600000;

export function calculateQuarterlyIncome(monthlySalary: number): number {
  return monthlySalary * 3;
}

export function calculateQuarterlyExpenses(housingType: HousingType): QuarterlyExpenses {
  const rent = RENT_TABLE[housingType] * 3;
  const food = BASE_FOOD;
  const transport =
    BASE_TRANSPORT + (housingType === "slum" ? SLUM_TRANSPORT_EXTRA : 0);
  const daily = BASE_DAILY;

  return {
    rent,
    food,
    transport,
    daily,
    total: rent + food + transport + daily,
  };
}

export function applyQuarterlyEconomy(
  monthlySalary: number,
  housingType: HousingType,
): QuarterlyEconomyResult {
  const income = calculateQuarterlyIncome(monthlySalary);
  const expenses = calculateQuarterlyExpenses(housingType);

  return {
    income,
    expenses,
    net: income - expenses.total,
  };
}

export function applySalaryRaise(
  currentSalary: number,
  raisePercent: number,
): number {
  return Math.round(currentSalary * (1 + raisePercent / 100));
}

export function isBroke(money: number): boolean {
  return money < 0;
}
