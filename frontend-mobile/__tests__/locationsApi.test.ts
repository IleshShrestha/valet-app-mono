import { apiRecordToLocation, billingToApiBody } from "../util/locationsApi";

describe("apiRecordToLocation", () => {
  it("maps a flat-per-shift location with nullable rates", () => {
    const loc = apiRecordToLocation({
      id: 2,
      name: "Mink",
      latitude: 40,
      longitude: -75,
      radius: 200,
      billing_type: "flat_per_shift",
      hourly_rate: null,
      single_shift_rate: 60,
      double_shift_rate: 120,
      holiday_multiplier: null,
      holiday_flat_bonus: null,
      uses_holiday_pay: true,
    });
    expect(loc.id).toBe("2");
    expect(loc.name).toBe("Mink");
    expect(loc.billingType).toBe("flat_per_shift");
    expect(loc.hourlyRate).toBeNull();
    expect(loc.singleShiftRate).toBe(60);
    expect(loc.doubleShiftRate).toBe(120);
    expect(loc.usesHolidayPay).toBe(true);
  });

  it("defaults billing type when absent", () => {
    const loc = apiRecordToLocation({ id: 1, name: "X" });
    expect(loc.billingType).toBe("hourly_per_person");
    expect(loc.hourlyRate).toBeNull();
    expect(loc.usesHolidayPay).toBe(false);
  });
});

describe("billingToApiBody", () => {
  it("serializes to snake_case keys", () => {
    const body = billingToApiBody({
      billingType: "hourly_per_person",
      hourlyRate: 35,
      singleShiftRate: null,
      doubleShiftRate: null,
      holidayMultiplier: 1.5,
      holidayFlatBonus: null,
      usesHolidayPay: true,
    });
    expect(body).toEqual({
      billing_type: "hourly_per_person",
      hourly_rate: 35,
      single_shift_rate: null,
      double_shift_rate: null,
      holiday_multiplier: 1.5,
      holiday_flat_bonus: null,
      uses_holiday_pay: true,
    });
  });
});
