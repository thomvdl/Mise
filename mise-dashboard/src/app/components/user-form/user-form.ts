import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { UserService } from '../../core/services/user.service';
import { UserRole } from '../../core/models/auth.model';

@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
export class UserForm implements OnInit {
  private readonly userService = inject(UserService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  editingId = signal<number | null>(null);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  isEdit = computed(() => this.editingId() !== null);

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true }),
    role: new FormControl<UserRole>('user', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.editingId.set(id);
      // Password isn't required on edit — leaving it blank keeps the current one.
      this.userService.list().subscribe((users) => {
        const user = users.find((u) => u.id === id);
        if (user) this.form.patchValue({ name: user.name, role: user.role });
      });
    } else {
      this.form.controls.password.addValidators(Validators.required);
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      name: value.name,
      role: value.role,
      ...(value.password ? { password: value.password } : {}),
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = this.isEdit()
      ? this.userService.update(this.editingId()!, payload)
      : this.userService.create({ ...payload, password: value.password });

    request.subscribe({
      next: () => this.router.navigate(['..'], { relativeTo: this.route }),
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message ?? "Une erreur est survenue lors de l'enregistrement.");
      },
    });
  }
}
