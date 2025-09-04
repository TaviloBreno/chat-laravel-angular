import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Subject, takeUntil, BehaviorSubject, combineLatest, map, startWith, debounceTime, catchError } from 'rxjs';
import { ChatApiService } from '../../../../core/services/chat-api.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { MessageItemComponent } from '../message-item/message-item.component';
import { Conversation, Message, CursorPage } from '../../../../shared/models';
import { DateSeparatorPipe } from '../../../../shared/pipes';
import { KeyboardShortcutsDirective } from '../../../../shared/directives';
import { KeyboardShortcutsService, KeyboardShortcut, ErrorHandlerService, AccessibilityService } from '../../../../shared/services';

interface MessageGroup {
  date: string;
  messages: Message[];
}

@Component({
  selector: 'app-messages-thread',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    ScrollingModule,
    MessageItemComponent,
    DateSeparatorPipe,
    KeyboardShortcutsDirective
  ],
  template: `
    <div class="messages-container" 
         #messagesContainer
         appKeyboardShortcuts
         [shortcuts]="keyboardShortcuts"
         [context]="'messages'"
         role="log"
         aria-label="Lista de mensagens"
         aria-live="polite">
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
      
      <!-- Empty State -->
      <div *ngIf="!loading && groupedMessages.length === 0" class="empty-state">
        <mat-icon class="empty-icon">chat_bubble_outline</mat-icon>
        <h4>Nenhuma mensagem</h4>
        <p>Seja o primeiro a enviar uma mensagem nesta conversa</p>
      </div>
      
      <!-- Messages Virtual Scroll -->
      <cdk-virtual-scroll-viewport 
        *ngIf="!loading && groupedMessages.length > 0"
        #messagesViewport
        class="messages-viewport"
        [itemSize]="estimatedItemSize"
        (scrolledIndexChange)="onScrolledIndexChange($event)"
      >
        <ng-container *cdkVirtualFor="let group of groupedMessages; trackBy: trackByGroup; templateCacheSize: 0">
          <!-- Date Separator -->
          <div class="date-separator">
            <span>{{ group.date | dateSeparator }}</span>
          </div>
          
          <!-- Messages in this date group -->
          <ng-container *ngFor="let message of group.messages; trackBy: trackByMessageId; let i = index">
            <div 
              [attr.data-message-id]="message.id"
              [class.message-observer-target]="!isOwnMessage(message)"
            >
              <app-message-item
                [message]="message"
                [isOwn]="isOwnMessage(message)"
                [showAvatar]="shouldShowAvatarInGroup(group.messages, i)"
                [showTimestamp]="shouldShowTimestampInGroup(group.messages, i)"
                [isGrouped]="isMessageGroupedInGroup(group.messages, i)"
                (messageDeleted)="onMessageDeleted($event)"
                (messageEdited)="onMessageEdited($event)"
                (reactionAdded)="onReactionAdded($event)"
              ></app-message-item>
            </div>
          </ng-container>
        </ng-container>
      </cdk-virtual-scroll-viewport>
      
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
      
      <!-- New Messages Indicator -->
      <div 
        *ngIf="newMessagesCount > 0 && !isAtBottom"
        class="new-messages-indicator"
        (click)="scrollToBottom()"
      >
        <mat-icon>keyboard_arrow_down</mat-icon>
        <span>{{ newMessagesCount }} nova{{ newMessagesCount > 1 ? 's' : '' }} mensagem{{ newMessagesCount > 1 ? 'ns' : '' }}</span>
      </div>
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
    
    .messages-viewport {
      flex: 1;
      height: 100%;
      padding: 0;
    }
    
    .messages-viewport .cdk-virtual-scroll-content-wrapper {
      padding: 16px;
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
    
    .new-messages-indicator {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: #2196f3;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      font-size: 14px;
      z-index: 10;
      transition: all 0.3s ease;
    }
    
    .new-messages-indicator:hover {
      background: #1976d2;
      transform: translateX(-50%) translateY(-2px);
    }
    
    .new-messages-indicator mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    
    /* Message observer targets */
    .message-observer-target {
      position: relative;
    }
    
    /* Custom scrollbar */
    .messages-viewport::-webkit-scrollbar {
      width: 6px;
    }
    
    .messages-viewport::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .messages-viewport::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 3px;
    }
    
    .messages-viewport::-webkit-scrollbar-thumb:hover {
      background: #999;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .messages-viewport .cdk-virtual-scroll-content-wrapper {
        padding: 12px;
      }
      
      .scroll-to-bottom {
        width: 40px;
        height: 40px;
        bottom: 12px;
        right: 12px;
      }
      
      .new-messages-indicator {
        bottom: 60px;
        font-size: 12px;
        padding: 6px 12px;
      }
    }
  `]
})
export class MessagesThreadComponent implements OnInit, OnDestroy, OnChanges, AfterViewChecked {
  @Input() conversation: Conversation | null = null;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messagesViewport') messagesViewport!: CdkVirtualScrollViewport;

  messages: Message[] = [];
  groupedMessages: MessageGroup[] = [];
  loading = false;
  loadingMore = false;
  hasMoreMessages = true;
  showScrollToBottom = false;
  newMessagesCount = 0;
  isAtBottom = true;
  estimatedItemSize = 80;
  
  private destroy$ = new Subject<void>();
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private currentCursor: string | null | undefined = null;
  private shouldScrollToBottom = true;
  private lastScrollHeight = 0;
  private scrollPositionSubject = new BehaviorSubject<number>(0);
  private lastSeenMessageId: number | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private readStatusQueue = new Set<number>();
  private readStatusDebounceTimer: any = null;
  
  // Keyboard shortcuts
  keyboardShortcuts: KeyboardShortcut[] = [];

  constructor(
    private chatApiService: ChatApiService,
    private realtimeService: RealtimeService,
    private keyboardService: KeyboardShortcutsService,
    private errorHandler: ErrorHandlerService,
    private accessibilityService: AccessibilityService
  ) {
    this.initializeKeyboardShortcuts();
    // Set up message grouping observable
    this.messagesSubject.pipe(
      takeUntil(this.destroy$),
      map(messages => this.groupMessagesByDate(messages))
    ).subscribe(groupedMessages => {
      this.groupedMessages = groupedMessages;
      this.updateNewMessagesCount();
    });
  }

  private initializeKeyboardShortcuts(): void {
    this.keyboardShortcuts = [
      {
        key: 'Home',
        action: () => this.scrollToTop(),
        description: 'Ir para o início (Home)'
      },
      {
        key: 'End',
        action: () => this.scrollToBottom(),
        description: 'Ir para o final (End)'
      },
      {
        key: 'PageUp',
        action: () => this.scrollPageUp(),
        description: 'Página anterior (Page Up)'
      },
      {
        key: 'PageDown',
        action: () => this.scrollPageDown(),
        description: 'Próxima página (Page Down)'
      },
      {
        key: 'r',
        ctrlKey: true,
        action: () => this.refreshMessages(),
        description: 'Atualizar mensagens (Ctrl+R)'
      }
    ];
  }

  ngOnInit(): void {
    this.setupScrollListener();
    this.setupRealtimeListeners();
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    // Clean up read status timer
    if (this.readStatusDebounceTimer) {
      clearTimeout(this.readStatusDebounceTimer);
      this.readStatusDebounceTimer = null;
    }
    
    // Clean up keyboard shortcuts
    this.keyboardShortcuts.forEach(shortcut => {
      this.keyboardService.unregisterShortcut(shortcut.key, {
        ctrlKey: shortcut.ctrlKey,
        altKey: shortcut.altKey,
        shiftKey: shortcut.shiftKey,
        metaKey: shortcut.metaKey
      }, shortcut.context);
    });
  }

  // Keyboard shortcut methods
  scrollToTop(): void {
    if (this.messagesViewport) {
      this.messagesViewport.scrollToIndex(0);
      this.accessibilityService.announce('Rolado para o início das mensagens');
    }
  }



  scrollPageUp(): void {
    if (this.messagesViewport) {
      const currentIndex = this.messagesViewport.getRenderedRange().start;
      const newIndex = Math.max(0, currentIndex - 10);
      this.messagesViewport.scrollToIndex(newIndex);
    }
  }

  scrollPageDown(): void {
    if (this.messagesViewport) {
      const currentIndex = this.messagesViewport.getRenderedRange().end;
      const newIndex = Math.min(this.groupedMessages.length - 1, currentIndex + 10);
      this.messagesViewport.scrollToIndex(newIndex);
    }
  }

  refreshMessages(): void {
    if (this.conversation) {
      this.loadMessages();
      this.accessibilityService.announce('Mensagens atualizadas');
    }
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
    
    // Re-observe message elements after view updates
    this.observeMessageElements();
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
      takeUntil(this.destroy$),
      catchError(error => this.errorHandler.handleError(error, 'Erro ao carregar mensagens'))
    ).subscribe({
      next: (response: CursorPage<Message>) => {
        this.messages = response.data.reverse(); // Reverse to show oldest first
        this.currentCursor = response.next_cursor || null;
        this.hasMoreMessages = !!response.next_cursor;
        this.messagesSubject.next([...this.messages]);
        this.loading = false;
        this.accessibilityService.announce(`${this.messages.length} mensagens carregadas`);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadMoreMessages(): void {
    if (!this.conversation || !this.currentCursor || this.loadingMore) {
      return;
    }

    this.loadingMore = true;
    const previousScrollHeight = this.messagesViewport?.elementRef.nativeElement.scrollHeight || 0;

    this.chatApiService.getMessages(this.conversation.id, { cursor: this.currentCursor }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: CursorPage<Message>) => {
        const newMessages = response.data.reverse();
        this.messages = [...newMessages, ...this.messages];
        this.currentCursor = response.next_cursor || null;
        this.hasMoreMessages = !!response.next_cursor;
        this.messagesSubject.next([...this.messages]);
        this.loadingMore = false;
        
        // Maintain scroll position
        setTimeout(() => {
          if (this.messagesViewport) {
            const currentScrollTop = this.messagesViewport.measureScrollOffset('top');
            this.messagesViewport.scrollToOffset(currentScrollTop);
          }
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
    this.realtimeService.private('user').listen('MessageSent', (event: any) => {
      if (this.conversation && event.message.conversation_id === this.conversation.id) {
        this.addNewMessage(event.message);
      }
    });

    // Listen for message updates
    this.realtimeService.private('user').listen('MessageUpdated', (event: any) => {
      if (this.conversation && event.message.conversation_id === this.conversation.id) {
        this.updateMessage(event.message);
      }
    });

    // Listen for message deletions
    this.realtimeService.private('user').listen('MessageDeleted', (event: any) => {
      if (this.conversation && event.conversation_id === this.conversation.id) {
        this.removeMessage(event.message_id);
      }
    });
  }

  private setupScrollListener(): void {
    // Set up scroll position tracking with debounce
    this.scrollPositionSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(100)
    ).subscribe(scrollTop => {
      this.updateScrollState(scrollTop);
    });
  }

  private setupIntersectionObserver(): void {
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported');
      return;
    }

    const options: IntersectionObserverInit = {
      root: null, // Use viewport as root
      rootMargin: '0px',
      threshold: 0.5 // Message is considered "read" when 50% visible
    };

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const messageElement = entry.target as HTMLElement;
          const messageId = messageElement.getAttribute('data-message-id');
          
          if (messageId) {
            const id = parseInt(messageId, 10);
            this.markMessageAsRead(id);
          }
        }
      });
    }, options);

    // Observe existing message elements
    this.observeMessageElements();
  }

  private observeMessageElements(): void {
    if (!this.intersectionObserver) return;

    // Wait for next tick to ensure DOM is updated
    setTimeout(() => {
      const messageElements = document.querySelectorAll('.message-observer-target');
      messageElements.forEach(element => {
        this.intersectionObserver!.observe(element);
      });
    }, 0);
  }

  private markMessageAsRead(messageId: number): void {
    // Only mark messages from other users as read
    const message = this.messages.find(m => m.id === messageId);
    if (!message || this.isOwnMessage(message)) {
      return;
    }

    // Add to queue for batch processing
    this.readStatusQueue.add(messageId);
    
    // Debounce the API call to avoid too many requests
    if (this.readStatusDebounceTimer) {
      clearTimeout(this.readStatusDebounceTimer);
    }

    this.readStatusDebounceTimer = setTimeout(() => {
      this.processReadStatusQueue();
    }, 1000); // Wait 1 second before sending
  }

  private processReadStatusQueue(): void {
    if (this.readStatusQueue.size === 0 || !this.conversation) {
      return;
    }

    const messageIds = Array.from(this.readStatusQueue);
    this.readStatusQueue.clear();

    // Send read status to server
    this.chatApiService.markMessagesAsRead(this.conversation.id, messageIds).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error marking messages as read:', error);
        // Re-add failed messages to queue for retry
        messageIds.forEach(id => this.readStatusQueue.add(id));
        return [];
      })
    ).subscribe(() => {
      // Update local message status
      messageIds.forEach(messageId => {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
          message.read_at = new Date().toISOString();
        }
      });
      
      this.messagesSubject.next([...this.messages]);
    });
  }
  
  onScrolledIndexChange(index: number): void {
    if (this.messagesViewport) {
      const scrollTop = this.messagesViewport.measureScrollOffset('top');
      this.scrollPositionSubject.next(scrollTop);
    }
  }
  
  private updateScrollState(scrollTop: number): void {
    if (!this.messagesViewport) return;
    
    const viewport = this.messagesViewport.elementRef.nativeElement;
    const scrollHeight = this.messagesViewport.measureScrollOffset('bottom');
    
    // Check if user is at bottom (within 100px threshold)
    this.isAtBottom = scrollHeight <= 100;
    this.showScrollToBottom = !this.isAtBottom && this.groupedMessages.length > 0;
    
    // Update last seen message when scrolling
    if (this.isAtBottom && this.messages.length > 0) {
      this.lastSeenMessageId = this.messages[this.messages.length - 1].id;
      this.newMessagesCount = 0;
    }
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
    try {
      if (this.messagesViewport) {
        this.messagesViewport.scrollToIndex(this.messages.length - 1, 'smooth');
        this.newMessagesCount = 0;
        this.isAtBottom = true;
        this.showScrollToBottom = false;
        this.accessibilityService.announce('Rolado para o final das mensagens');
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
  
  scrollToNewMessages(): void {
    if (this.newMessagesCount > 0 && this.lastSeenMessageId) {
      const lastSeenIndex = this.messages.findIndex(m => m.id === this.lastSeenMessageId);
      if (lastSeenIndex >= 0 && lastSeenIndex < this.messages.length - 1) {
        this.messagesViewport.scrollToIndex(lastSeenIndex + 1, 'smooth');
      }
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
    
    return currentMessage.user.id !== nextMessage.user.id || !this.isMessageGrouped(index + 1);
  }

  shouldShowTimestamp(index: number): boolean {
    if (index === this.messages.length - 1) {
      return true;
    }
    
    const currentMessage = this.messages[index];
    const nextMessage = this.messages[index + 1];
    
    // Show timestamp if messages are from different users or have significant time gap
    if (currentMessage.user.id !== nextMessage.user.id) {
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
    if (currentMessage.user.id !== previousMessage.user.id) {
      return false;
    }
    
    const timeDiff = new Date(currentMessage.created_at).getTime() - new Date(previousMessage.created_at).getTime();
    return timeDiff <= 5 * 60 * 1000; // 5 minutes
  }



  isOwnMessage(message: Message): boolean {
    return message.user.id === this.getCurrentUserId();
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
  
  private groupMessagesByDate(messages: Message[]): MessageGroup[] {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return Object.keys(groups)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        .map(date => ({
          date: date,
          messages: groups[date].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        }));
  }
  
  private updateNewMessagesCount(): void {
    if (!this.lastSeenMessageId || this.isAtBottom) {
      this.newMessagesCount = 0;
      return;
    }
    
    const lastSeenIndex = this.messages.findIndex(m => m.id === this.lastSeenMessageId);
    if (lastSeenIndex >= 0) {
      this.newMessagesCount = this.messages.length - lastSeenIndex - 1;
    }
  }
  
  trackByGroup(index: number, group: MessageGroup): string {
    return group.date;
  }
  
  shouldShowAvatarInGroup(messages: Message[], index: number): boolean {
    if (index === messages.length - 1) {
      return true;
    }
    
    const currentMessage = messages[index];
    const nextMessage = messages[index + 1];
    
    return currentMessage.user.id !== nextMessage.user.id || !this.isMessageGroupedInGroup(messages, index + 1);
  }

  shouldShowTimestampInGroup(messages: Message[], index: number): boolean {
    if (index === messages.length - 1) {
      return true;
    }
    
    const currentMessage = messages[index];
    const nextMessage = messages[index + 1];
    
    // Show timestamp if messages are from different users or have significant time gap
    if (currentMessage.user.id !== nextMessage.user.id) {
      return true;
    }
    
    const timeDiff = new Date(nextMessage.created_at).getTime() - new Date(currentMessage.created_at).getTime();
    return timeDiff > 5 * 60 * 1000; // 5 minutes
  }

  isMessageGroupedInGroup(messages: Message[], index: number): boolean {
    if (index === 0) {
      return false;
    }
    
    const currentMessage = messages[index];
    const previousMessage = messages[index - 1];
    
    // Group messages from same user within 5 minutes
    if (currentMessage.user.id !== previousMessage.user.id) {
      return false;
    }
    
    const timeDiff = new Date(currentMessage.created_at).getTime() - new Date(previousMessage.created_at).getTime();
    return timeDiff <= 5 * 60 * 1000; // 5 minutes
  }
}