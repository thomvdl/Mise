import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { ShoppingItemService } from '../../core/services/shopping-item.service';
import { ShoppingItem, ShoppingStatus } from '../../core/models/shopping-item.model';
import { StationService } from '../../core/services/station.service';
import { Station } from '../../core/models/station.model';

@Component({
  selector: 'app-courses',
  imports: [FormsModule, DatePipe],
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class Courses implements OnInit {
  private readonly shoppingItemService = inject(ShoppingItemService);
  private readonly stationService = inject(StationService);

  items = signal<ShoppingItem[]>([]);
  stations = signal<Station[]>([]);
  newItemName = signal('');
  newItemStationId = signal<number | null>(null);

  filterStationId = signal<number | null>(null);
  filterStatus = signal<ShoppingStatus | null>('todo');

  filteredItems = computed(() => {
    const stationId = this.filterStationId();
    const status = this.filterStatus();

    return this.items().filter((item) => {
      const matchesStation = stationId === null || item.station?.id === stationId;
      const matchesStatus = status === null || item.status === status;
      return matchesStation && matchesStatus;
    });
  });

  ngOnInit(): void {
    this.reload();
    this.stationService.list().subscribe((stations) => this.stations.set(stations));
  }

  reload(): void {
    this.shoppingItemService.list().subscribe((items) => this.items.set([...items].reverse()));
  }

  onNewItemStationChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.newItemStationId.set(value ? Number(value) : null);
  }

  onFilterStationChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterStationId.set(value ? Number(value) : null);
  }

  onFilterStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterStatus.set(value ? (value as ShoppingStatus) : null);
  }

  addItem(): void {
    const name = this.newItemName().trim();
    if (!name) return;

    this.shoppingItemService.create(name, this.newItemStationId()).subscribe(() => {
      this.newItemName.set('');
      this.newItemStationId.set(null);
      this.reload();
    });
  }
}
