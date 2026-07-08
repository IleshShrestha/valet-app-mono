// Package billing computes valet invoice amounts from a location's billing
// configuration and the work recorded on a service day. It is pure (no DB, no
// HTTP) so it can be unit-tested directly and reused later for PDF/email export.
//
// Money is float64 dollars. To avoid accumulated float drift, each service-day
// line total is rounded to the nearest cent before lines are summed, so the
// per-line totals always add up to the final total exactly as displayed.
package billing

import (
	"fmt"
	"math"
	"strings"
)

// Billing type identifiers stored on a location.
const (
	BillingHourlyPerPerson = "hourly_per_person"
	BillingFlatPerShift    = "flat_per_shift"
)

// LocationBilling mirrors the billing configuration stored on a location.
// Rate fields are dollars; a zero/absent rate is treated as "not configured".
type LocationBilling struct {
	LocationName      string
	BillingType       string
	HourlyRate        float64
	SingleShiftRate   float64
	DoubleShiftRate   float64
	HolidayMultiplier float64
	HolidayFlatBonus  float64
	UsesHolidayPay    bool
}

// SegmentInput is one worked block within a service day (e.g. morning shift).
type SegmentInput struct {
	Workers int
	Hours   float64
}

// ServiceDayInput is a single billable engagement (one location, one date).
type ServiceDayInput struct {
	Date        string // display string, e.g. "6/17/2025"
	IsHoliday   bool
	HolidayName string
	Segments    []SegmentInput
}

// SegmentLine is the computed breakdown for one segment (hourly billing only).
type SegmentLine struct {
	Workers  int     `json:"workers"`
	Hours    float64 `json:"hours"`
	Subtotal float64 `json:"subtotal"`
}

// LineItem is the computed invoice row for one service day.
type LineItem struct {
	Date           string        `json:"date"`
	LocationName   string        `json:"location_name"`
	Workers        int           `json:"workers"`
	Hours          float64       `json:"hours"`
	BillingType    string        `json:"billing_type"`
	RateLabel      string        `json:"rate_label"`
	HolidayApplied bool          `json:"holiday_applied"`
	HolidayLabel   string        `json:"holiday_label"`
	Segments       []SegmentLine `json:"segments"`
	Subtotal       float64       `json:"subtotal"`
	SubtotalLabel  string        `json:"subtotal_label"`
	Warnings       []string      `json:"warnings"`
}

// Invoice is the full computed result for a set of service days.
type Invoice struct {
	Lines         []LineItem `json:"lines"`
	Total         float64    `json:"total"`
	TotalLabel    string     `json:"total_label"`
	UnpricedCount int        `json:"unpriced_count"`
}

// roundCents rounds a dollar amount to the nearest cent.
func roundCents(v float64) float64 {
	return math.Round(v*100) / 100
}

// money formats a dollar amount as "$1,234.56".
func money(v float64) string {
	neg := v < 0
	if neg {
		v = -v
	}
	whole := int64(math.Floor(v))
	cents := int64(math.Round((v - float64(whole)) * 100))
	if cents == 100 { // rounding carry
		whole++
		cents = 0
	}
	// group the whole part with commas
	s := fmt.Sprintf("%d", whole)
	var grouped strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			grouped.WriteByte(',')
		}
		grouped.WriteRune(c)
	}
	out := fmt.Sprintf("$%s.%02d", grouped.String(), cents)
	if neg {
		return "-" + out
	}
	return out
}

// CalcServiceDay computes the invoice line for one service day. It never
// returns an error: misconfiguration produces a $0 line with warnings so the
// caller (and the UI) can surface the problem without breaking.
func CalcServiceDay(loc LocationBilling, day ServiceDayInput) LineItem {
	line := LineItem{
		Date:         day.Date,
		LocationName: loc.LocationName,
		BillingType:  loc.BillingType,
		Segments:     make([]SegmentLine, 0, len(day.Segments)),
	}

	totalWorkers := 0
	totalHours := 0.0
	for _, seg := range day.Segments {
		totalWorkers += seg.Workers
		totalHours += seg.Hours
	}
	line.Workers = totalWorkers
	line.Hours = roundCents(totalHours)

	if len(day.Segments) == 0 {
		line.Warnings = append(line.Warnings, "service day has no segments")
		return line
	}

	var base float64
	switch loc.BillingType {
	case BillingHourlyPerPerson:
		if loc.HourlyRate <= 0 {
			line.Warnings = append(line.Warnings, "location has no hourly rate configured")
			return line
		}
		line.RateLabel = fmt.Sprintf("%s/hr/person", money(loc.HourlyRate))
		for _, seg := range day.Segments {
			segTotal := float64(seg.Workers) * seg.Hours * loc.HourlyRate
			line.Segments = append(line.Segments, SegmentLine{
				Workers:  seg.Workers,
				Hours:    seg.Hours,
				Subtotal: roundCents(segTotal),
			})
			base += segTotal
		}

	case BillingFlatPerShift:
		switch len(day.Segments) {
		case 1:
			if loc.SingleShiftRate <= 0 {
				line.Warnings = append(line.Warnings, "location has no single-shift rate configured")
				return line
			}
			base = loc.SingleShiftRate
			line.RateLabel = fmt.Sprintf("%s flat (single)", money(loc.SingleShiftRate))
		case 2:
			if loc.DoubleShiftRate <= 0 {
				line.Warnings = append(line.Warnings, "location has no double-shift rate configured")
				return line
			}
			base = loc.DoubleShiftRate
			line.RateLabel = fmt.Sprintf("%s flat (double)", money(loc.DoubleShiftRate))
		default:
			line.Warnings = append(line.Warnings,
				fmt.Sprintf("flat billing supports 1 or 2 segments, got %d", len(day.Segments)))
			return line
		}

	default:
		line.Warnings = append(line.Warnings,
			fmt.Sprintf("location has unknown billing type %q", loc.BillingType))
		return line
	}

	// Holiday pay applies to the whole day when enabled and the day is a holiday.
	subtotal := base
	if loc.UsesHolidayPay && day.IsHoliday {
		switch {
		case loc.HolidayMultiplier > 0:
			subtotal = base * loc.HolidayMultiplier
			line.HolidayApplied = true
			line.HolidayLabel = fmt.Sprintf("Yes, %sx", trimFloat(loc.HolidayMultiplier))
		case loc.HolidayFlatBonus > 0:
			subtotal = base + loc.HolidayFlatBonus
			line.HolidayApplied = true
			line.HolidayLabel = fmt.Sprintf("Yes, +%s", money(loc.HolidayFlatBonus))
		default:
			line.Warnings = append(line.Warnings, "holiday pay enabled but no multiplier or bonus configured")
			line.HolidayLabel = "No"
		}
	} else {
		line.HolidayLabel = "No"
	}
	if day.IsHoliday && line.HolidayApplied && day.HolidayName != "" {
		line.HolidayLabel = fmt.Sprintf("%s (%s)", line.HolidayLabel, day.HolidayName)
	}

	line.Subtotal = roundCents(subtotal)
	line.SubtotalLabel = money(line.Subtotal)
	return line
}

// DayToBill pairs a service day with the billing config of its location.
type DayToBill struct {
	Loc LocationBilling
	Day ServiceDayInput
}

// BuildInvoice computes every line and the final total. Only priced lines
// (those without a blocking warning) contribute to the total; unpriced lines
// are counted so the caller can flag them.
func BuildInvoice(days []DayToBill) Invoice {
	inv := Invoice{Lines: make([]LineItem, 0, len(days))}
	for _, d := range days {
		line := CalcServiceDay(d.Loc, d.Day)
		if len(line.Warnings) > 0 && line.Subtotal == 0 {
			inv.UnpricedCount++
		}
		inv.Total += line.Subtotal
		inv.Lines = append(inv.Lines, line)
	}
	inv.Total = roundCents(inv.Total)
	inv.TotalLabel = money(inv.Total)
	return inv
}

// trimFloat formats a multiplier without trailing zeros: 1.5 -> "1.5", 2.0 -> "2".
func trimFloat(v float64) string {
	s := fmt.Sprintf("%.2f", v)
	s = strings.TrimRight(s, "0")
	s = strings.TrimRight(s, ".")
	return s
}
