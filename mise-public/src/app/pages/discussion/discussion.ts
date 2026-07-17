import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { ChannelService } from '../../core/services/channel.service';
import { MessageService } from '../../core/services/message.service';
import { Channel } from '../../core/models/channel.model';
import { Message } from '../../core/models/message.model';

const POLL_INTERVAL_MS = 8000;

@Component({
  selector: 'app-discussion',
  imports: [FormsModule, DatePipe],
  templateUrl: './discussion.html',
  styleUrl: './discussion.css',
})
export class Discussion implements OnInit {
  private readonly channelService = inject(ChannelService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  channels = signal<Channel[]>([]);
  activeChannelId = signal<number | null>(null);
  messages = signal<Message[]>([]);

  topLevelMessages = computed(() => this.messages().filter((m) => m.parent_id === null));

  composerText = signal('');
  replyingTo = signal<number | null>(null);
  replyText = signal('');

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
}
