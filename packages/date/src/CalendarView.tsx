import { DatePicker as ArkDatePicker } from "@ark-ui/solid/date-picker";
import { Index } from "solid-js";
import type { JSX } from "solid-js";

/** The three Ark-backed views shared by inline and popup calendars. */
export function CalendarViews(): JSX.Element {
  return <>
    <ArkDatePicker.View view="day" class="sheen-calendar-view">
      <ArkDatePicker.Context>{calendar => <>
        <ArkDatePicker.ViewControl class="sheen-calendar-heading">
          <ArkDatePicker.PrevTrigger class="sheen-calendar-nav"><span aria-hidden="true">‹</span></ArkDatePicker.PrevTrigger>
          <ArkDatePicker.ViewTrigger class="sheen-calendar-view-trigger"><ArkDatePicker.RangeText /></ArkDatePicker.ViewTrigger>
          <ArkDatePicker.NextTrigger class="sheen-calendar-nav"><span aria-hidden="true">›</span></ArkDatePicker.NextTrigger>
        </ArkDatePicker.ViewControl>
        <ArkDatePicker.Table class="sheen-calendar-table">
          <ArkDatePicker.TableHead><ArkDatePicker.TableRow>
            <Index each={calendar().weekDays}>{weekDay => <ArkDatePicker.TableHeader class="sheen-calendar-weekday"><span title={weekDay().long}>{weekDay().short}</span></ArkDatePicker.TableHeader>}</Index>
          </ArkDatePicker.TableRow></ArkDatePicker.TableHead>
          <ArkDatePicker.TableBody>
            <Index each={calendar().weeks}>{week => <ArkDatePicker.TableRow>
              <Index each={week()}>{day => <ArkDatePicker.TableCell value={day()} class="sheen-calendar-cell">
                <ArkDatePicker.TableCellTrigger class="sheen-calendar-cell-trigger">{day().day}</ArkDatePicker.TableCellTrigger>
              </ArkDatePicker.TableCell>}</Index>
            </ArkDatePicker.TableRow>}</Index>
          </ArkDatePicker.TableBody>
        </ArkDatePicker.Table>
      </>}</ArkDatePicker.Context>
    </ArkDatePicker.View>
    <ArkDatePicker.View view="month" class="sheen-calendar-view">
      <ArkDatePicker.Context>{calendar => <>
        <ArkDatePicker.ViewControl class="sheen-calendar-heading">
          <ArkDatePicker.PrevTrigger class="sheen-calendar-nav"><span aria-hidden="true">‹</span></ArkDatePicker.PrevTrigger>
          <ArkDatePicker.ViewTrigger class="sheen-calendar-view-trigger"><ArkDatePicker.RangeText /></ArkDatePicker.ViewTrigger>
          <ArkDatePicker.NextTrigger class="sheen-calendar-nav"><span aria-hidden="true">›</span></ArkDatePicker.NextTrigger>
        </ArkDatePicker.ViewControl>
        <ArkDatePicker.Table class="sheen-calendar-table sheen-calendar-table-grid"><ArkDatePicker.TableBody>
          <Index each={calendar().getMonthsGrid({ columns: 4, format: "short" })}>{months => <ArkDatePicker.TableRow>
            <Index each={months()}>{month => <ArkDatePicker.TableCell value={month().value} class="sheen-calendar-cell">
              <ArkDatePicker.TableCellTrigger class="sheen-calendar-grid-trigger">{month().label}</ArkDatePicker.TableCellTrigger>
            </ArkDatePicker.TableCell>}</Index>
          </ArkDatePicker.TableRow>}</Index>
        </ArkDatePicker.TableBody></ArkDatePicker.Table>
      </>}</ArkDatePicker.Context>
    </ArkDatePicker.View>
    <ArkDatePicker.View view="year" class="sheen-calendar-view">
      <ArkDatePicker.Context>{calendar => <>
        <ArkDatePicker.ViewControl class="sheen-calendar-heading">
          <ArkDatePicker.PrevTrigger class="sheen-calendar-nav"><span aria-hidden="true">‹</span></ArkDatePicker.PrevTrigger>
          <ArkDatePicker.ViewTrigger class="sheen-calendar-view-trigger"><ArkDatePicker.RangeText /></ArkDatePicker.ViewTrigger>
          <ArkDatePicker.NextTrigger class="sheen-calendar-nav"><span aria-hidden="true">›</span></ArkDatePicker.NextTrigger>
        </ArkDatePicker.ViewControl>
        <ArkDatePicker.Table class="sheen-calendar-table sheen-calendar-table-grid"><ArkDatePicker.TableBody>
          <Index each={calendar().getYearsGrid({ columns: 4 })}>{years => <ArkDatePicker.TableRow>
            <Index each={years()}>{year => <ArkDatePicker.TableCell value={year().value} class="sheen-calendar-cell">
              <ArkDatePicker.TableCellTrigger class="sheen-calendar-grid-trigger">{year().label}</ArkDatePicker.TableCellTrigger>
            </ArkDatePicker.TableCell>}</Index>
          </ArkDatePicker.TableRow>}</Index>
        </ArkDatePicker.TableBody></ArkDatePicker.Table>
      </>}</ArkDatePicker.Context>
    </ArkDatePicker.View>
  </>;
}
