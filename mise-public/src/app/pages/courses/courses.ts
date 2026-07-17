import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { ShoppingItemService } from '../../core/services/shopping-item.service';
import { ShoppingItem } from '../../core/models/shopping-item.model';

@Component({
  selector: 'app-courses',
  imports: [FormsModule, DatePipe],
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class Courses implements OnInit {
  private readonly shoppingItemService = inject(ShoppingItemService);

  items = signal<ShoppingItem[]>([]);
  newItemName = signal('');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.shoppingItemService.list().subscribe((items) => this.items.set([...items].reverse()));
  }

  addItem(): void {
    const name = this.newItemName().trim();
    if (!name) return;

    this.shoppingItemService.create(name).subscribe(() => {
      this.newItemName.set('');
      this.reload();
    });
  }
}
