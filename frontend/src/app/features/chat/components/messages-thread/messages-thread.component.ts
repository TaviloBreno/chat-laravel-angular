import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Subject, takeUntil, BehaviorSubject } from 'rxjs';
import { ChatApiService } from '../../../../core/services/chat-api.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { MessageItemComponent } from '../message-item/message-item.component';
import { Conversation, Message, CursorPage } from '../../../../shared/models';

@Component({
  selector: 'app-messages-thread',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MessageItemComponent
  ],
  template: `
    <div class="messages-container" #messagesContainer>
      <!-- Loading More Messages -->
      <div *ngIf="loadingMore" class="loading-more">
        <mat-spinner diameter="24"></mat-spinner>
        <span>Carregando mensagens...</span>
      </div>
      
      <!-- Load More Button -->
      <div *ngIf="hasMoreMessages && !loadingMore" class="load-more-container">
        <button mat-stroked-button (click)="loadMoreMessages()">
          <mat-icon>expand_less</mat-icon>
          Carregar mensagens anteriores
        </button>
      </div>
      
      <!-- Messages List -->
      <div class="messages-list" #messagesList>
        <!-- Empty State -->
        <div *ngIf="!loading && messages.length === 0" class="empty-state">
          <mat-icon class="empty-icon">chat_bubble_outline</mat-icon>
          <h4>Nenhuma mensagem</h4>
          <p>Seja o primeiro a enviar uma mensagem nesta conversa</p>
        </div>
        
        <!-- Messages -->
        <ng-container *ngFor="let message of messages; trackBy: trackByMessageId; let i = index">
          <!-- Date Separator -->
          <div *ngIf="shouldShowDateSeparator(i)" class="date-separator">
            <span>{{ formatDateSeparator(message.created_at) }}</span>
          </div>
          
          <!-- Message Item -->
          <app-message-item
            [message]="message"
            [isOwn]="isOwnMessage(message)"
            [showAvatar]="shouldShowAvatar(i)"
            [showTimestamp]="shouldShowTimestamp(i)"
            [isGrouped]="isMessageGrouped(i)"
            (messageDeleted)="onMessageDeleted($event)"
            (messageEdited)="onMessageEdited($event)"
            (reactionAdded)="onReactionAdded($event)"
          ></app-message-item>
        </ng-container>
      </div>
      
      <!-- Loading Initial Messages -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Carregando mensagens...</p>
      </div>
      
      <!-- Scroll to Bottom Button -->
      <button 
        *ngIf="showScrollToBottom"
        mat-fab 
        class="scroll-to-bottom"
        (click)="scrollToBottom()"
        color="primary"
      >
        <mat-icon>keyboard_arrow_down</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .messages-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      background: #f5f5f5;
      overflow: hidden;
    }
    
    .loading-more {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
      background: white;
      border-bottom: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    }
    
    .load-more-container {
      display: flex;
      justify-content: center;
      padding: 16px;
      background: white;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .messages-list {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      scroll-behavior: smooth;
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: #666;
    }
    
    .empty-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: #ccc;
      margin-bottom: 1rem;
    }
    
    .empty-state h4 {
      margin: 0 0 0.5rem 0;
      font-weight: 500;
    }
    
    .empty-state p {
      margin: 0;
      color: #999;
    }
    
    .date-separator {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 24px 0 16px 0;
      position: relative;
    }
    
    .date-separator::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e0e0e0;
      z-index: 1;
    }
    
    .date-separator span {
      background: #f5f5f5;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      color: #666;
      border: 1px solid #e0e0e0;
      z-index: 2;
      position: relative;
    }
    
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 1rem;
    }
    
    .loading-container p {
      color: #666;
      margin: 0;
    }
    
    .scroll-to-bottom {
      position: absolute;
      bottom: 16px;
      right: 16px;
      width: 48px;
      height: 48px;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    
    /* Custom scrollbar */
    .messages-list::-webkit-scrollbar {
      width: 6px;
    }
    
    .messages-list::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .messages-list::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 3px;
    }
    
    .messages-list::-webkit-scrollbar-thumb:hover {
      background: #999;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .messages-list {
        padding: 12px;
      }
      
      .scroll-to-bottom {
        width: 40px;
        height: 40px;
        bottom: 12px;
        right: 12px;
      }
    }
  `]
})
export class MessagesThreadComponent implements OnInit, OnDestroy, OnChanges, AfterViewChecked {
  @Input() conversation: Conversation | null = null;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messagesList') messagesList!: ElementRef;

  messages: Message[] = [];
  loading = false;
  loadingMore = false;
  hasMoreMessages = true;
  showScrollToBottom = false;
  
  private destroy$ = new Subject<void>();
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private currentCursor: string | null = null;
  private shouldScrollToBottom = true;
  private lastScrollHeight = 0;

  constructor(
    private chatApiService: ChatApiService,
    private realtimeService: RealtimeService
  ) {}

  ngOnInit(): void {
    this.setupRealtimeListeners();
    this.setupScrollListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversation'] && this.conversation) {
      this.loadMessages();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private loadMessages(): void {
    if (!this.conversation) {
      return;
    }

    this.loading = true;
    this.messages = [];
    this.currentCursor = null;
    this.hasMoreMessages = true;
    this.shouldScrollToBottom = true;

    this.chatApiService.getMessages(this.conversation.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: CursorPage<Message>) => {
        this.messages = response.data.reverse(); // Reverse to show oldest first
        this.currentCursor = response.next_cursor;
        this.hasMoreMessages = !!response.next_cursor;
        this.messagesSubject.next([...this.messages]);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.loading = false;
      }
    });
  }

  loadMoreMessages(): void {
    if (!this.conversation || !this.currentCursor || this.loadingMore) {
      return;
    }

    this.loadingMore = true;
    const previousScrollHeight = this.messagesList.nativeElement.scrollHeight;

    this.chatApiService.getMessages(this.conversation.id, this.currentCursor).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: CursorPage<Message>) => {
        const newMessages = response.data.reverse();
        this.messages = [...newMessages, ...this.messages];
        this.currentCursor = response.next_cursor;
        this.hasMoreMessages = !!response.next_cursor;
        this.messagesSubject.next([...this.messages]);
        this.loadingMore = false;
        
        // Maintain scroll position
        setTimeout(() => {
          const newScrollHeight = this.messagesList.nativeElement.scrollHeight;
          const scrollDiff = newScrollHeight - previousScrollHeight;
          this.messagesList.nativeElement.scrollTop += scrollDiff;
        });
      },
      error: (error) => {
        console.error('Error loading more messages:', error);
        this.loadingMore = false;
      }
    });
  }

  private setupRealtimeListeners(): void {
    // Listen for new messages
    this.realtimeService.listenToPrivateChannel('user', 'MessageSent', (event: any) => {
      if (this.conversation && event.message.conversation_id === this.conversation.id) {
        this.addNewMessage(event.message);
      }
    });

    // Listen for message updates
    this.realtimeService.listenToPrivateChannel('user', 'MessageUpdated', (event: any) => {
      if (this.conversation && event.message.conversation_id === this.conversation.id) {
        this.updateMessage(event.message);
      }
    });

    // Listen for message deletions
    this.realtimeService.listenToPrivateChannel('user', 'MessageDeleted', (event: any) => {
      if (this.conversation && event.conversation_id === this.conversation.id) {
        this.removeMessage(event.message_id);
      }
    });
  }

  private setupScrollListener(): void {
    // This would be implemented to show/hide scroll to bottom button
    // For now, we'll keep it simple
  }

  private addNewMessage(message: Message): void {
    this.messages.push(message);
    this.messagesSubject.next([...this.messages]);
    this.shouldScrollToBottom = true;
  }

  private updateMessage(updatedMessage: Message): void {
    const index = this.messages.findIndex(m => m.id === updatedMessage.id);
    if (index !== -1) {
      this.messages[index] = updatedMessage;
      this.messagesSubject.next([...this.messages]);
    }
  }

  private removeMessage(messageId: number): void {
    this.messages = this.messages.filter(m => m.id !== messageId);
    this.messagesSubject.next([...this.messages]);
  }

  scrollToBottom(): void {
    if (this.messagesList) {
      const element = this.messagesList.nativeElement;
      element.scrollTop = element.scrollHeight;
      this.showScrollToBottom = false;
    }
  }

  trackByMessageId(index: number, message: Message): number {
    return message.id;
  }

  shouldShowDateSeparator(index: number): boolean {
    if (index === 0) {
      return true;
    }
    
    const currentMessage = this.messages[index];
    const previousMessage = this.messages[index - 1];
    
    const currentDate = new Date(currentMessage.created_at).toDateString();
    const previousDate = new Date(previousMessage.created_at).toDateString();
    
    return currentDate !== previousDate;
  }

  shouldShowAvatar(index: number): boolean {
    if (index === this.messages.length - 1) {
      return true;
    }
    
    const currentMessage = this.messages[index];
    const nextMessage = this.messages[index + 1];
    
    return currentMessage.user_id !== nextMessage.user_id || !this.isMessageGrouped(index + 1);
  }

  shouldShowTimestamp(index: number): boolean {
    if (index === this.messages.length - 1) {
      return true;
    }
    
    const currentMessage = this.messages[index];
    const nextMessage = this.messages[index + 1];
    
    // Show timestamp if messages are from different users or have significant time gap
    if (currentMessage.user_id !== nextMessage.user_id) {
      return true;
    }
    
    const timeDiff = new Date(nextMessage.created_at).getTime() - new Date(currentMessage.created_at).getTime();
    return timeDiff > 5 * 60 * 1000; // 5 minutes
  }

  isMessageGrouped(index: number): boolean {
    if (index === 0) {
      return false;
    }
    
    const currentMessage = this.messages[index];
    const previousMessage = this.messages[index - 1];
    
    // Group messages from same user within 5 minutes
    if (currentMessage.user_id !== previousMessage.user_id) {
      return false;
    }
    
    const timeDiff = new Date(currentMessage.created_at).getTime() - new Date(previousMessage.created_at).getTime();
    return timeDiff <= 5 * 60 * 1000; // 5 minutes
  }

  formatDateSeparator(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }

  isOwnMessage(message: Message): boolean {
    return message.user_id === this.getCurrentUserId();
  }

  onMessageDeleted(messageId: number): void {
    // Handle message deletion
    this.removeMessage(messageId);
  }

  onMessageEdited(message: Message): void {
    // Handle message editing
    this.updateMessage(message);
  }

  onReactionAdded(event: { messageId: number, reaction: string }): void {
    // Handle reaction addition
    console.log('Reaction added:', event);
  }

  private getCurrentUserId(): number {
    // This should get the current user ID from AuthService
    // For now, we'll return a placeholder
    return 1;
  }
}