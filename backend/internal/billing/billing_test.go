package billing

import "testing"

func hourlyLoc() LocationBilling {
	return LocationBilling{
		LocationName: "Example Location",
		BillingType:  BillingHourlyPerPerson,
		HourlyRate:   35,
	}
}

// Spec example 1: 3 workers x 5 hours x $35 = $525, no holiday.
func TestHourlySingleSegment(t *testing.T) {
	line := CalcServiceDay(hourlyLoc(), ServiceDayInput{
		Date:     "6/17/2025",
		Segments: []SegmentInput{{Workers: 3, Hours: 5}},
	})
	if len(line.Warnings) != 0 {
		t.Fatalf("unexpected warnings: %v", line.Warnings)
	}
	if line.Subtotal != 525 {
		t.Fatalf("want 525, got %v", line.Subtotal)
	}
	if line.SubtotalLabel != "$525.00" {
		t.Fatalf("want $525.00, got %s", line.SubtotalLabel)
	}
	if line.RateLabel != "$35.00/hr/person" {
		t.Fatalf("unexpected rate label %q", line.RateLabel)
	}
	if line.HolidayLabel != "No" {
		t.Fatalf("want holiday No, got %q", line.HolidayLabel)
	}
}

// Spec example 2: 4 x 6 x $35 = $840, holiday 1.5x => $1,260.
func TestHourlyHolidayMultiplier(t *testing.T) {
	loc := hourlyLoc()
	loc.UsesHolidayPay = true
	loc.HolidayMultiplier = 1.5
	line := CalcServiceDay(loc, ServiceDayInput{
		Date:      "6/18/2025",
		IsHoliday: true,
		Segments:  []SegmentInput{{Workers: 4, Hours: 6}},
	})
	if line.Subtotal != 1260 {
		t.Fatalf("want 1260, got %v", line.Subtotal)
	}
	if !line.HolidayApplied || line.HolidayLabel != "Yes, 1.5x" {
		t.Fatalf("unexpected holiday label %q (applied=%v)", line.HolidayLabel, line.HolidayApplied)
	}
}

// Spec total: $525 + $1,260 = $1,785.
func TestBuildInvoiceTotal(t *testing.T) {
	loc := hourlyLoc()
	holidayLoc := hourlyLoc()
	holidayLoc.UsesHolidayPay = true
	holidayLoc.HolidayMultiplier = 1.5

	inv := BuildInvoice([]DayToBill{
		{Loc: loc, Day: ServiceDayInput{Date: "6/17/2025", Segments: []SegmentInput{{Workers: 3, Hours: 5}}}},
		{Loc: holidayLoc, Day: ServiceDayInput{Date: "6/18/2025", IsHoliday: true, Segments: []SegmentInput{{Workers: 4, Hours: 6}}}},
	})
	if inv.Total != 1785 {
		t.Fatalf("want total 1785, got %v", inv.Total)
	}
	if inv.TotalLabel != "$1,785.00" {
		t.Fatalf("want $1,785.00, got %s", inv.TotalLabel)
	}
	if inv.UnpricedCount != 0 {
		t.Fatalf("want 0 unpriced, got %d", inv.UnpricedCount)
	}
}

// Two segments on one hourly day sum: (2*6 + 3*5.5) * 35 = (12 + 16.5)*35 = 997.5
func TestHourlyTwoSegments(t *testing.T) {
	line := CalcServiceDay(hourlyLoc(), ServiceDayInput{
		Date:     "6/20/2025",
		Segments: []SegmentInput{{Workers: 2, Hours: 6}, {Workers: 3, Hours: 5.5}},
	})
	if line.Subtotal != 997.5 {
		t.Fatalf("want 997.5, got %v", line.Subtotal)
	}
	if line.Workers != 5 {
		t.Fatalf("want 5 workers total, got %d", line.Workers)
	}
	if len(line.Segments) != 2 {
		t.Fatalf("want 2 segment breakdowns, got %d", len(line.Segments))
	}
}

func flatLoc() LocationBilling {
	return LocationBilling{
		LocationName:    "Flat Place",
		BillingType:     BillingFlatPerShift,
		SingleShiftRate: 60,
		DoubleShiftRate: 120,
	}
}

func TestFlatSingleAndDouble(t *testing.T) {
	single := CalcServiceDay(flatLoc(), ServiceDayInput{Date: "6/1/2025", Segments: []SegmentInput{{Workers: 2, Hours: 5}}})
	if single.Subtotal != 60 {
		t.Fatalf("single: want 60, got %v", single.Subtotal)
	}
	double := CalcServiceDay(flatLoc(), ServiceDayInput{Date: "6/2/2025", Segments: []SegmentInput{{Workers: 2, Hours: 6}, {Workers: 1, Hours: 4}}})
	if double.Subtotal != 120 {
		t.Fatalf("double: want 120, got %v", double.Subtotal)
	}
}

func TestFlatHolidayFlatBonus(t *testing.T) {
	loc := flatLoc()
	loc.UsesHolidayPay = true
	loc.HolidayFlatBonus = 25
	line := CalcServiceDay(loc, ServiceDayInput{
		Date:      "6/4/2025",
		IsHoliday: true,
		Segments:  []SegmentInput{{Workers: 2, Hours: 5}},
	})
	if line.Subtotal != 85 { // 60 + 25
		t.Fatalf("want 85, got %v", line.Subtotal)
	}
	if line.HolidayLabel != "Yes, +$25.00" {
		t.Fatalf("unexpected holiday label %q", line.HolidayLabel)
	}
}

func TestMissingRateProducesWarningNotError(t *testing.T) {
	loc := LocationBilling{LocationName: "Broken", BillingType: BillingHourlyPerPerson} // no hourly rate
	line := CalcServiceDay(loc, ServiceDayInput{Date: "6/5/2025", Segments: []SegmentInput{{Workers: 3, Hours: 5}}})
	if line.Subtotal != 0 {
		t.Fatalf("want 0 subtotal for unpriced line, got %v", line.Subtotal)
	}
	if len(line.Warnings) == 0 {
		t.Fatal("expected a warning for missing hourly rate")
	}

	inv := BuildInvoice([]DayToBill{{Loc: loc, Day: ServiceDayInput{Date: "6/5/2025", Segments: []SegmentInput{{Workers: 3, Hours: 5}}}}})
	if inv.UnpricedCount != 1 {
		t.Fatalf("want 1 unpriced line, got %d", inv.UnpricedCount)
	}
	if inv.Total != 0 {
		t.Fatalf("want total 0, got %v", inv.Total)
	}
}

func TestNoSegmentsWarns(t *testing.T) {
	line := CalcServiceDay(hourlyLoc(), ServiceDayInput{Date: "6/6/2025"})
	if len(line.Warnings) == 0 {
		t.Fatal("expected warning for day with no segments")
	}
	if line.Subtotal != 0 {
		t.Fatalf("want 0, got %v", line.Subtotal)
	}
}

func TestMoneyFormatting(t *testing.T) {
	cases := map[float64]string{
		0:        "$0.00",
		5:        "$5.00",
		525:      "$525.00",
		1785:     "$1,785.00",
		1234567:  "$1,234,567.00",
		99.5:     "$99.50",
		1260.005: "$1,260.01", // rounds to cent
	}
	for in, want := range cases {
		if got := money(in); got != want {
			t.Errorf("money(%v) = %q, want %q", in, got, want)
		}
	}
}
