import { parse } from "date-fns";

export function getDateMinusDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - days);
}

/** Parse "HH:mm" (24h) into a Date on today's calendar date for time pickers. */
export function parseTimeStringToDate(time: string): Date {
  return parse(time, "HH:mm", new Date());
}
