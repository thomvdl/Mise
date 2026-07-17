import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { AuthService } from '../../core/services/auth.service';
import { ChannelService } from '../../core/services/channel.service';
import { MessageService } from '../../core/services/message.service';
import { Channel } from '../../core/models/channel.model';
import { Message } from '../../core/models/message.model';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

const POLL_INTERVAL_MS = 8000;

@Component({
  selector: 'app-discussion',
  imports: [FormsModule, DatePipe, ConfirmDialog],
  templateUrl: './discussion.html',
  styleUrl: './discussion.css',
})
export class Discussion implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly channelService = inject(ChannelService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  readonly isAdmin = this.auth.isAdmin();

  channels = signal<Channel[]>([]);
  activeChannelId = signal<number | null>(null);
  messages = signal<Message[]>([]);

  topLevelMessages = computed(() => this.messages().filter((m) => m.parent_id === null));

  composerText = signal('');
  replyingTo = signal<number | null>(null);
  replyText = signal('');

  showNewChannelForm = signal(false);
  newChannelName = signal('');
  channelError = signal<string | null>(null);

  pendingDeleteMessage = signal<Message | null>(null);
  pendingDeleteChannel = signal<Channel | null>(null);

  ngOnInit(): void {
    this.loadChannels();

    const interval = setInterval(() => {
      if (this.activeChannelId() !== null) this.loadMessages();
    }, POLL_INTERVAL_MS);
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }

  loadChannels(): void {
    this.channelService.list().subscribe((channels) => {
      this.channels.set(channels);
      if (this.activeChannelId() === null && channels.length > 0) {
        this.selectChannel(channels[0].id);
      }
    });
  }

  selectChannel(channelId: number): void {
    this.activeChannelId.set(channelId);
    this.replyingTo.set(null);
    this.loadMessages();
  }

  loadMessages(): void {
    const channelId = this.activeChannelId();
    if (channelId === null) return;
    this.messageService.list(channelId).subscribe((messages) => {
      this.messages.set(messages);
      setTimeout(() => this.scrollToBottom());
    });
  }

  private scrollToBottom(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  replies(messageId: number): Message[] {
    return this.messages().filter((m) => m.parent_id === messageId);
  }

  authorName(message: Message): string {
    return message.user.name;
  }

  isOwnMessage(message: Message): boolean {
    return message.user_id === this.auth.user()?.id;
  }

  post(): void {
    const channelId = this.activeChannelId();
    const content = this.composerText().trim();
    if (channelId === null || !content) return;

    this.messageService.create({ channel_id: channelId, content }).subscribe(() => {
      this.composerText.set('');
      this.loadMessages();
    });
  }

  startReply(messageId: number): void {
    this.replyingTo.set(messageId);
    this.replyText.set('');
  }

  cancelReply(): void {
    this.replyingTo.set(null);
    this.replyText.set('');
  }

  submitReply(parentId: number): void {
    const channelId = this.activeChannelId();
    const content = this.replyText().trim();
    if (channelId === null || !content) return;

    this.messageService.create({ channel_id: channelId, content, parent_id: parentId }).subscribe(() => {
      this.cancelReply();
      this.loadMessages();
    });
  }

  confirmDeleteMessage(message: Message): void {
    this.pendingDeleteMessage.set(message);
  }

  cancelDeleteMessage(): void {
    this.pendingDeleteMessage.set(null);
  }

  deleteMessageConfirmed(): void {
    const message = this.pendingDeleteMessage();
    if (!message) return;

    this.messageService.delete(message.id).subscribe(() => {
      this.pendingDeleteMessage.set(null);
      this.loadMessages();
    });
  }

  toggleNewChannelForm(): void {
    this.showNewChannelForm.update((open) => !open);
    this.newChannelName.set('');
    this.channelError.set(null);
  }

  createChannel(): void {
    const name = this.newChannelName().trim();
    if (!name) return;

    this.channelError.set(null);
    this.channelService.create({ name }).subscribe({
      next: (channel) => {
        this.showNewChannelForm.set(false);
        this.newChannelName.set('');
        this.loadChannels();
        this.selectChannel(channel.id);
      },
      error: () => this.channelError.set("Un chanel avec ce nom existe déjà ou le nom est invalide."),
    });
  }

  confirmDeleteChannel(channel: Channel, event: Event): void {
    event.stopPropagation();
    this.pendingDeleteChannel.set(channel);
  }

  cancelDeleteChannel(): void {
    this.pendingDeleteChannel.set(null);
  }

  deleteChannelConfirmed(): void {
    const channel = this.pendingDeleteChannel();
    if (!channel) return;

    this.channelService.delete(channel.id).subscribe(() => {
      this.pendingDeleteChannel.set(null);
      if (this.activeChannelId() === channel.id) {
        this.activeChannelId.set(null);
        this.messages.set([]);
      }
      this.loadChannels();
    });
  }
}
