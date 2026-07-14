import { apiRecordToServiceDay } from "../util/serviceDaysApi";

describe("apiRecordToServiceDay", () => {
  const raw = {
    id: 4,
    title: "Gala",
    location_id: 2,
    location_name: "Mink",
    date: "2025-06-17",
    is_holiday: true,
    holiday_name: "NYE",
    status: "completed",
    segments: [
      {
        id: 6,
        name: "evening",
        start_time: "17:00:00",
        end_time: "23:00:00",
        hours: 6,
        assigned_users: [
          { id: 1, first_name: "Bob", last_name: "Lee", email: "bob@x.com", role: "employee", check_in_time: null, check_out_time: null },
        ],
      },
    ],
  };

  it("maps day-level fields", () => {
    const day = apiRecordToServiceDay(raw);
    expect(day.id).toBe("4");
    expect(day.title).toBe("Gala");
    expect(day.locationId).toBe("2");
    expect(day.locationName).toBe("Mink");
    expect(day.isHoliday).toBe(true);
    expect(day.holidayName).toBe("NYE");
    expect(day.status).toBe("completed");
  });

  it("parses the date as a local calendar date (no UTC off-by-one)", () => {
    const day = apiRecordToServiceDay(raw);
    expect(day.date.getFullYear()).toBe(2025);
    expect(day.date.getMonth()).toBe(5); // June (0-indexed)
    expect(day.date.getDate()).toBe(17);
  });

  it("maps segments and normalizes times to HH:mm", () => {
    const day = apiRecordToServiceDay(raw);
    expect(day.segments).toHaveLength(1);
    const seg = day.segments[0];
    expect(seg.name).toBe("evening");
    expect(seg.startTime).toBe("17:00");
    expect(seg.endTime).toBe("23:00");
    expect(seg.hours).toBe(6);
    expect(seg.assignedUsers[0].firstName).toBe("Bob");
    expect(seg.assignedUsers[0].id).toBe(1);
  });

  it("defaults missing fields safely", () => {
    const day = apiRecordToServiceDay({ id: 9 });
    expect(day.id).toBe("9");
    expect(day.status).toBe("scheduled");
    expect(day.segments).toEqual([]);
    expect(day.isHoliday).toBe(false);
  });
});
