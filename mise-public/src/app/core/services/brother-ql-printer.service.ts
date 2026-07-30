import { Injectable } from '@angular/core';

import { QueuedLabel } from '../models/label.model';
import { isBrotherQlUsbSupported, printLabelsOnBrotherQl } from '../utils/brother-ql-printer';

/** Thin injectable wrapper around the WebUSB printing utility, so components can be tested without real hardware. */
@Injectable({ providedIn: 'root' })
export class BrotherQlPrinterService {
  isSupported(): boolean {
    return isBrotherQlUsbSupported();
  }

  print(labels: QueuedLabel[]): Promise<void> {
    return printLabelsOnBrotherQl(labels);
  }
}
