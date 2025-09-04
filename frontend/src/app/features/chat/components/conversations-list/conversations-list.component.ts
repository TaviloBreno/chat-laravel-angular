import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Subject, takeUntil, Observable, BehaviorSubject, debounceTime, distinctUntilChanged, map, combineLatest } from 'rxjs';
import { ChatApiService } from '../../../../core/services/chat-api.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { PresenceService } from '../../../../core/services/presence.service';
import { Conversation, User, Message } from '../../../../shared/models';

@Component({
  selector: 'app-conversations-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    ScrollingModule
  ],
  template: `
    <div class="conversations-container">
      <!-- Header -->
      <div class="conversations-header">
        <h3>Conversas</h3>
        <button mat-icon-button [matMenuTriggerFor]="actionsMenu">
          <mat-icon>more_vert</mat-icon>
        </button>
        
        <mat-menu #actionsMenu="matMenu">
          <button mat-menu-item (click)="createNewConversation()">
            <mat-icon>add</mat-icon>
            <span>Nova Conversa</span>
          </button>
          <button mat-menu-item (click)="refreshConversations()">
            <mat-icon>refresh</mat-icon>
            <span>Atualizar</span>
          </button>
        </mat-menu>
      </div>
      
      <!-- Search and Filter -->
      <div class="search-container">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Buscar conversas</mat-label>
          <input matInput 
                 [(ngModel)]="searchTerm" 
                 (input)="onSearchChange($event)"
                 placeholder="Digite para buscar...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="sort-field">
          <mat-label>Ordenar por</mat-label>
          <mat-select [(value)]="sortBy" (selectionChange)="onSortChange()">
            <mat-option value="recent">Mais recentes</mat-option>
            <mat-option value="name">Nome</mat-option>
            <mat-option value="unread">Não lidas</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      
      <mat-divider></mat-divider>
      
      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Carregando conversas...</p>
      </div>
      
      <!-- Empty State -->
      <div *ngIf="!loading && conversations.length === 0" class="empty-state">
        <mat-icon class="empty-icon">chat_bubble_outline</mat-icon>
        <h4>Nenhuma conversa</h4>
        <p>Inicie uma nova conversa para começar</p>
        <button mat-raised-button color="primary" (click)="createNewConversation()">
          <mat-icon>add</mat-icon>
          Nova Conversa
        </button>
      </div>
      
      <!-- Conversations List with Virtual Scrolling -->
      <div *ngIf="!loading && (filteredConversations$ | async)?.length === 0 && searchTerm" class="no-results">
        <mat-icon class="no-results-icon">search_off</mat-icon>
        <h4>Nenhum resultado encontrado</h4>
        <p>Tente buscar com outros termos</p>
      </div>
      
      <div *ngIf="filteredConversations$ | async as filteredConversations">
        <cdk-virtual-scroll-viewport 
          *ngIf="!loading && filteredConversations.length > 0" 
          itemSize="72" 
          class="conversations-viewport"
        >
          <div 
            *cdkVirtualFor="let conversation of filteredConversations; trackBy: trackByConversationId"
          [class.selected]="selectedConversationId === conversation.id"
          (click)="selectConversation(conversation)"
          class="conversation-item"
        >
          <div class="conversation-content">
            <!-- Avatar -->
            <div class="avatar-container">
              <div class="avatar" [class.group]="conversation.type === 'group'">
                <mat-icon *ngIf="conversation.type === 'group'">group</mat-icon>
                <mat-icon *ngIf="conversation.type === 'private'">person</mat-icon>
              </div>
              <div 
                *ngIf="isUserOnline(conversation) && conversation.type === 'private'" 
                class="online-indicator"
              ></div>
            </div>
            
            <!-- Conversation Info -->
            <div class="conversation-info">
              <div class="conversation-header">
                <h4 class="conversation-name">{{ getConversationName(conversation) }}</h4>
                <span class="conversation-time">{{ formatTime(conversation.updated_at) }}</span>
              </div>
              
              <div class="conversation-preview">
                <p class="last-message" [class.unread]="hasUnreadMessages(conversation)">
                  {{ getLastMessagePreview(conversation) }}
                </p>
                <div class="conversation-badges">
                  <span 
                    *ngIf="getUnreadCount(conversation) > 0" 
                    class="unread-badge"
                    [matBadge]="getUnreadCount(conversation)"
                    matBadgeSize="small"
                    matBadgeColor="accent"
                  ></span>
                </div>
              </div>
            </div>
          </div>
          </div>
        </cdk-virtual-scroll-viewport>
      </div>
    </div>
  `,
  styles: [`
    .conversations-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: white;
      border-right: 1px solid #e0e0e0;
    }
    
    .conversations-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: #f5f5f5;
    }
    
    .conversations-header h3 {
      margin: 0;
      font-weight: 500;
      color: #333;
    }
    
    .search-container {
      padding: 16px;
      display: flex;
      gap: 12px;
      background: #fafafa;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .search-field {
      flex: 2;
    }
    
    .sort-field {
      flex: 1;
      min-width: 120px;
    }
    
    .search-field .mat-mdc-form-field,
    .sort-field .mat-mdc-form-field {
      font-size: 14px;
    }
    
    .no-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      color: #666;
    }
    
    .no-results-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      color: #ccc;
      margin-bottom: 1rem;
    }
    
    .no-results h4 {
      margin: 0 0 0.5rem 0;
      color: #666;
    }
    
    .no-results p {
      margin: 0;
      color: #999;
    }
    
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      gap: 1rem;
    }
    
    .loading-container p {
      color: #666;
      margin: 0;
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      flex: 1;
    }
    
    .empty-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      color: #ccc;
      margin-bottom: 1rem;
    }
    
    .empty-state h4 {
      margin: 0 0 0.5rem 0;
      color: #666;
    }
    
    .empty-state p {
      margin: 0 0 1.5rem 0;
      color: #999;
    }
    
    .conversations-viewport {
      flex: 1;
      height: 100%;
    }
    
    .conversations-viewport .cdk-virtual-scroll-content-wrapper {
      max-width: 100%;
    }
    
    .conversation-item {
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: background-color 0.2s;
      padding: 12px 16px;
      height: auto;
      min-height: 72px;
    }
    
    .conversation-item:hover {
      background-color: #f8f9fa;
    }
    
    .conversation-item.selected {
      background-color: #e3f2fd;
      border-right: 3px solid #2196f3;
    }
    
    .conversation-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      width: 100%;
    }
    
    .avatar-container {
      position: relative;
      flex-shrink: 0;
    }
    
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
    }
    
    .avatar.group {
      background: #4caf50;
      color: white;
    }
    
    .online-indicator {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 12px;
      height: 12px;
      background: #4caf50;
      border: 2px solid white;
      border-radius: 50%;
    }
    
    .conversation-info {
      flex: 1;
      min-width: 0;
    }
    
    .conversation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    
    .conversation-name {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .conversation-time {
      font-size: 12px;
      color: #999;
      flex-shrink: 0;
    }
    
    .conversation-preview {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .last-message {
      margin: 0;
      font-size: 13px;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    
    .last-message.unread {
      font-weight: 500;
      color: #333;
    }
    
    .conversation-badges {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .unread-badge {
      width: 8px;
      height: 8px;
    }
  `]
})
export class ConversationsListComponent implements OnInit, OnDestroy {
  @Output() conversationSelected = new EventEmitter<Conversation>();
  @Output() newConversationRequested = new EventEmitter<void>();

  conversations: Conversation[] = [];
  selectedConversationId: number | null = null;
  loading = true;
  onlineUsers: User[] = [];
  
  // Search and filtering
  searchTerm = '';
  sortBy: 'recent' | 'name' | 'unread' = 'recent';
  filteredConversations$: Observable<Conversation[]>;
  
  private destroy$ = new Subject<void>();
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  private searchSubject = new BehaviorSubject<string>('');
  private sortSubject = new BehaviorSubject<string>('recent');

  constructor(
    private chatApiService: ChatApiService,
    private realtimeService: RealtimeService,
    private presenceService: PresenceService
  ) {
    // Setup filtered conversations stream
    this.filteredConversations$ = combineLatest([
      this.conversationsSubject.asObservable(),
      this.searchSubject.asObservable().pipe(
        debounceTime(300),
        distinctUntilChanged()
      ),
      this.sortSubject.asObservable()
    ]).pipe(
      map(([conversations, searchTerm, sortBy]) => {
        let filtered = conversations;
        
        // Apply search filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          filtered = conversations.filter(conv => 
            this.getConversationName(conv).toLowerCase().includes(term) ||
            this.getLastMessagePreview(conv).toLowerCase().includes(term)
          );
        }
        
        // Apply sorting
        return this.sortConversations(filtered, sortBy as any);
      })
    );
  }

  ngOnInit(): void {
    this.loadConversations();
    this.setupRealtimeListeners();
    this.subscribeToPresence();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadConversations(): void {
    this.loading = true;
    this.chatApiService.getConversations().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.conversations = response.data;
        this.conversationsSubject.next(this.conversations);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading conversations:', error);
        this.loading = false;
      }
    });
  }

  private setupRealtimeListeners(): void {
    // Listen for new messages
    this.realtimeService.private('user').listen('MessageSent', (event: any) => {
      this.updateConversationWithNewMessage(event.message);
    });

    // Listen for conversation updates
    this.realtimeService.private('user').listen('ConversationUpdated', (event: any) => {
      this.updateConversation(event.conversation);
    });
  }

  private subscribeToPresence(): void {
    this.presenceService.onlineUsers$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(users => {
      // Convert Map to array for template usage
      this.onlineUsers = Array.from(users.values()).flat();
    });
  }

  private updateConversationWithNewMessage(message: Message): void {
    const conversationIndex = this.conversations.findIndex(
      conv => conv.id === message.conversation_id
    );
    
    if (conversationIndex !== -1) {
      const conversation = { ...this.conversations[conversationIndex] };
      conversation.last_message = message;
      conversation.updated_at = message.created_at;
      
      // Move conversation to top
      this.conversations.splice(conversationIndex, 1);
      this.conversations.unshift(conversation);
      
      this.conversationsSubject.next([...this.conversations]);
    }
  }

  private updateConversation(updatedConversation: Conversation): void {
    const index = this.conversations.findIndex(conv => conv.id === updatedConversation.id);
    if (index !== -1) {
      this.conversations[index] = updatedConversation;
      this.conversationsSubject.next([...this.conversations]);
    }
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversationId = conversation.id;
    this.conversationSelected.emit(conversation);
  }

  createNewConversation(): void {
    this.newConversationRequested.emit();
  }

  refreshConversations(): void {
    this.loadConversations();
  }

  trackByConversationId(index: number, conversation: Conversation): number {
    return conversation.id;
  }

  getConversationName(conversation: Conversation): string {
    if (conversation.type === 'group') {
      return conversation.name || 'Grupo sem nome';
    }
    
    // For direct conversations, show the other participant's name
    const otherParticipant = conversation.participants?.find(p => p.user.id !== this.getCurrentUserId());
    return otherParticipant?.user.name || 'Usuário';
  }

  getLastMessagePreview(conversation: Conversation): string {
    if (!conversation.last_message) {
      return 'Nenhuma mensagem';
    }
    
    const message = conversation.last_message;
    if (message.type === 'file') {
      return '📎 Arquivo';
    }
    
    return message.body || 'Mensagem';
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  }

  hasUnreadMessages(conversation: Conversation): boolean {
    // This would typically check against read receipts
    // For now, we'll return false as a placeholder
    return false;
  }

  getUnreadCount(conversation: Conversation): number {
    // This would typically count unread messages
    // For now, we'll return 0 as a placeholder
    return 0;
  }

  isUserOnline(conversation: Conversation): boolean {
    if (conversation.type !== 'private') {
      return false;
    }
    
    const otherParticipant = conversation.participants?.find(p => p.user.id !== this.getCurrentUserId());
    if (!otherParticipant) {
      return false;
    }
    
    return this.onlineUsers.some(user => user.id === otherParticipant.user.id);
  }

  private getCurrentUserId(): number {
    // This should get the current user ID from AuthService
    // For now, we'll return a placeholder
    return 1;
  }

  // Search and Sort Methods
  onSearchChange(event: any): void {
    const searchTerm = event.target.value;
    this.searchTerm = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  onSortChange(): void {
    this.sortSubject.next(this.sortBy);
  }

  private sortConversations(conversations: Conversation[], sortBy: 'recent' | 'name' | 'unread'): Conversation[] {
    const sorted = [...conversations];
    
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.updated_at).getTime();
          const dateB = new Date(b.updated_at).getTime();
          return dateB - dateA; // Most recent first
        });
        
      case 'name':
        return sorted.sort((a, b) => {
          const nameA = this.getConversationName(a).toLowerCase();
          const nameB = this.getConversationName(b).toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
      case 'unread':
        return sorted.sort((a, b) => {
          const unreadA = this.getUnreadCount(a);
          const unreadB = this.getUnreadCount(b);
          if (unreadA === unreadB) {
            // If same unread count, sort by recent
            const dateA = new Date(a.updated_at).getTime();
            const dateB = new Date(b.updated_at).getTime();
            return dateB - dateA;
          }
          return unreadB - unreadA; // Most unread first
        });
        
      default:
        return sorted;
    }
  }
}