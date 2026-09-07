import { Component, ElementRef, HostListener, computed, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface CalendarDay {
  date: Date;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

/**
 * Custom date+time picker, themed to match the app instead of the browser's native
 * `datetime-local` widget (inconsistent styling/affordance across browsers, no dark mode
 * support in most). Value format stays the same as the native input ("YYYY-MM-DDTHH:mm") so
 * it's a drop-in replacement wherever that string was consumed (API payloads, etc.).
 */
@Component({
  selector: 'app-datetime-picker',
  imports: [],
  templateUrl: './datetime-picker.html',
  styleUrl: './datetime-picker.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatetimePicker),
      multi: true,
    },
  ],
})
export class DatetimePicker implements ControlValueAccessor {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  open = signal(false);
  disabled = signal(false);
  value = signal<Date | null>(null);
  viewDate = signal<Date>(new Date());
  timeValue = signal('12:00');

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly monthLabel = computed(() => {
    const label = this.viewDate().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  readonly displayLabel = computed(() => {
    const v = this.value();
    if (!v) return '';
    return `${this.pad(v.getDate())}/${this.pad(v.getMonth() + 1)}/${v.getFullYear()} à ${this.pad(v.getHours())}:${this.pad(v.getMinutes())}`;
  });

  readonly days = computed<CalendarDay[]>(() => {
    const view = this.viewDate();
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const offset = (firstOfMonth.getDay() + 6) % 7; // Monday-first week
    const start = new Date(year, month, 1 - offset);
    const today = new Date();
    const selected = this.value();

    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return {
        date,
        day: date.getDate(),
        inMonth: date.getMonth() === month,
        isToday: this.isSameDay(date, today),
        isSelected: selected !== null && this.isSameDay(date, selected),
      };
    });
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
      this.onTouched();
    }
  }

  writeValue(value: string | null): void {
    const date = this.parseValue(value);
    this.value.set(date);
    this.viewDate.set(date ?? new Date());
    this.timeValue.set(date ? `${this.pad(date.getHours())}:${this.pad(date.getMinutes())}` : '12:00');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  toggle(): void {
    if (this.disabled()) return;
    this.open.update((isOpen) => !isOpen);
  }

  prevMonth(): void {
    const view = this.viewDate();
    this.viewDate.set(new Date(view.getFullYear(), view.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const view = this.viewDate();
    this.viewDate.set(new Date(view.getFullYear(), view.getMonth() + 1, 1));
  }

  selectDay(day: CalendarDay): void {
    const [hours, minutes] = this.timeValue().split(':').map(Number);
    const next = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), hours || 0, minutes || 0);
    this.value.set(next);
    this.viewDate.set(next);
    this.emit();
  }

  onTimeChange(event: Event): void {
    const time = (event.target as HTMLInputElement).value;
    this.timeValue.set(time || '00:00');

    const current = this.value();
    if (!current) return;

    const [hours, minutes] = this.timeValue().split(':').map(Number);
    const next = new Date(current.getFullYear(), current.getMonth(), current.getDate(), hours, minutes);
    this.value.set(next);
    this.emit();
  }

  close(): void {
    this.open.set(false);
    this.onTouched();
  }

  clear(): void {
    this.value.set(null);
    this.emit();
    this.open.set(false);
    this.onTouched();
  }

  private emit(): void {
    const v = this.value();
    this.onChange(v ? this.formatValue(v) : '');
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  private formatValue(date: Date): string {
    return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}T${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`;
  }

  private parseValue(value: string | null): Date | null {
    if (!value) return null;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return null;
    const [year, month, day, hours, minutes] = match.slice(1).map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  }
}
