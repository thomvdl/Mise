import { Component, computed, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export const COLOR_PALETTE: string[] = [
  '#5AAEDB', '#4FA8C6', '#4FB0A5', '#6BC49A', '#7FA872', '#9CC46B',
  '#A3A14A', '#D1A83D', '#C6763B', '#B85C3D', '#D14B3D', '#A3453D',
  '#C15F7C', '#B0568F', '#7A4E7A', '#8F6BB0', '#6B7AB0', '#5C7A9C',
];

@Component({
  selector: 'app-color-picker',
  imports: [],
  templateUrl: './color-picker.html',
  styleUrl: './color-picker.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ColorPicker),
      multi: true,
    },
  ],
})
export class ColorPicker implements ControlValueAccessor {
  readonly palette = COLOR_PALETTE;

  value = signal(COLOR_PALETTE[0]);
  disabled = signal(false);

  isCustom = computed(() => !this.palette.some((color) => this.sameColor(color, this.value())));

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value.set(value || COLOR_PALETTE[0]);
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

  select(color: string): void {
    if (this.disabled()) return;
    this.value.set(color);
    this.onChange(color);
    this.onTouched();
  }

  onCustomColor(event: Event): void {
    this.select((event.target as HTMLInputElement).value);
  }

  private sameColor(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase();
  }
}
