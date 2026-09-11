export interface CalendarDate {
  readonly kind: "calendar-date";
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface Time {
  readonly kind: "time";
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
}

export interface TimeZone {
  readonly kind: "time-zone";
  readonly id: string;
}

/** An instant paired with the IANA zone used to present and edit it. */
export interface DateTime {
  readonly kind: "date-time";
  readonly epochMilliseconds: number;
  readonly timeZone: TimeZone;
}

export interface WallDateTime {
  readonly kind: "wall-date-time";
  readonly date: CalendarDate;
  readonly time: Time;
  readonly timeZone: TimeZone;
}

export interface DateRange {
  readonly kind: "date-range";
  readonly start: CalendarDate;
  readonly end: CalendarDate;
}

export type DateTimeDisambiguation = "reject" | "earlier" | "later" | "compatible";

export interface ExactDateTimeResolution {
  readonly kind: "exact";
  readonly value: DateTime;
}

export interface AmbiguousDateTimeResolution {
  readonly kind: "ambiguous";
  readonly earlier: DateTime;
  readonly later: DateTime;
  readonly value?: DateTime;
}

export interface NonexistentDateTimeResolution {
  readonly kind: "nonexistent";
  /** The instant selected by the earlier policy, presented as a different wall time. */
  readonly earlier: DateTime;
  /** The instant selected by the later/compatible policy, presented as a different wall time. */
  readonly later: DateTime;
  readonly value?: DateTime;
}

export type DateTimeResolution = ExactDateTimeResolution | AmbiguousDateTimeResolution | NonexistentDateTimeResolution;
export type TimeZoneChangeBehavior = "preserve-instant" | "preserve-wall";
