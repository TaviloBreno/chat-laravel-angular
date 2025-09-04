import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { Subject, takeUntil } from 'rxjs';
import { PresenceService } from '../../../../core/services/presence.service';
import { TypingService } from '../../../../core/services/typing.service';
import { Conversation, User } from '../../../../shared/models';

@Component({
  selector: 'app-conversation-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  template: `
    <mat-toolbar *ngIf="conversation" class="conversation-header">
      <!-- Back Button (Mobile) -->
      <button 
        mat-icon-button 
        class="back-button"
        (click)="onBackClick()"
        [class.mobile-only]="true"
      >
        <mat-icon>arrow_back</mat-icon>
      </button>
      
      <!-- Conversation Info -->
      <div class="conversation-info">
        <!-- Avatar Stack -->
        <div class="avatar-container">
          <!-- Group Avatar Stack -->
          <ng-container *ngIf="conversation.type === 'group'">
            <div class="avatar-stack">
              <div 
                *ngFor="let participant of getVisibleParticipants(); let i = index; trackBy: trackParticipant"
                class="avatar stacked"
                [style.z-index]="getVisibleParticipants().length - i"
                [style.transform]="'translateX(' + (i * -8) + 'px)'"
                [matTooltip]="participant.user.name"
              >
                <span class="avatar-text">{{ getUserInitials(participant.user.name) }}</span>
                <div 
                  *ngIf="isParticipantOnline(participant.user.id)" 
                  class="online-indicator"
                ></div>
              </div>
              <div 
                *ngIf="getRemainingParticipantsCount() > 0"
                class="avatar stacked more-count"
                [style.z-index]="0"
                [style.transform]="'translateX(' + (getVisibleParticipants().length * -8) + 'px)'"
                [matTooltip]="'Mais ' + getRemainingParticipantsCount() + ' participantes'"
              >
                <span class="avatar-text">+{{ getRemainingParticipantsCount() }}</span>
              </div>
            </div>
          </ng-container>
          
          <!-- Private Conversation Avatar -->
          <ng-container *ngIf="conversation.type === 'private'">
            <div class="avatar private">
              <span class="avatar-text">{{ getOtherParticipantInitials() }}</span>
              <div 
                *ngIf="isUserOnline()" 
                class="online-indicator"
                [class.online]="isUserOnline()"
              ></div>
            </div>
          </ng-container>
        </div>
        
        <!-- Name and Status -->
        <div class="conversation-details">
          <h3 class="conversation-name">{{ getConversationName() }}</h3>
          <div class="conversation-status">
            <!-- Online Status for Direct Conversations -->
            <ng-container *ngIf="conversation.type === 'private'">
              <span class="status-text" [class.online]="isUserOnline()" [class.offline]="!isUserOnline()">
                <mat-icon class="status-icon">{{ isUserOnline() ? 'circle' : 'radio_button_unchecked' }}</mat-icon>
                {{ isUserOnline() ? 'Online' : getLastSeenText() }}
              </span>
            </ng-container>
            
            <!-- Participants Info for Group Conversations -->
            <ng-container *ngIf="conversation.type === 'group'">
              <span class="status-text">
                <mat-icon class="status-icon">group</mat-icon>
                {{ getParticipantsCount() }} participantes
                <span *ngIf="getOnlineParticipantsCount() > 0" class="online-count">
                  • {{ getOnlineParticipantsCount() }} online
                </span>
              </span>
            </ng-container>
            
            <!-- Typing Indicator -->
            <span *ngIf="typingUsers.length > 0" class="typing-indicator">
              <mat-icon class="typing-icon">edit</mat-icon>
              {{ getTypingText() }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="header-actions">
        <!-- Search Button -->
        <button 
          mat-icon-button 
          (click)="onSearchClick()"
          matTooltip="Buscar mensagens"
          matTooltipPosition="below"
          aria-label="Buscar mensagens"
        >
          <mat-icon>search</mat-icon>
        </button>
        
        <!-- Voice Call Button -->
        <button 
          mat-icon-button 
          (click)="onVoiceCallClick()"
          matTooltip="Iniciar chamada de áudio"
          matTooltipPosition="below"
          aria-label="Iniciar chamada"
          [disabled]="conversation.type === 'group'"
        >
          <mat-icon>call</mat-icon>
        </button>
        
        <!-- Video Call Button -->
        <button 
          mat-icon-button 
          (click)="onVideoCallClick()"
          matTooltip="Iniciar videochamada"
          matTooltipPosition="below"
          aria-label="Iniciar videochamada"
          [disabled]="conversation.type === 'group'"
        >
          <mat-icon>videocam</mat-icon>
        </button>
        
        <!-- More Options -->
        <button 
          mat-icon-button 
          [matMenuTriggerFor]="optionsMenu"
          matTooltip="Mais opções"
          matTooltipPosition="below"
          aria-label="Mais opções"
          [matBadge]="getNotificationCount()"
          [matBadgeHidden]="getNotificationCount() === 0"
          matBadgeColor="accent"
          matBadgeSize="small"
        >
          <mat-icon>more_vert</mat-icon>
        </button>
        
        <mat-menu #optionsMenu="matMenu">
          <!-- Conversation Info -->
          <button mat-menu-item (click)="onInfoClick()">
            <mat-icon>info</mat-icon>
            <span>Informações da conversa</span>
          </button>
          
          <mat-divider></mat-divider>
          
          <!-- Notification Settings -->
          <button mat-menu-item (click)="onMuteToggle()">
            <mat-icon>{{ isMuted ? 'notifications_off' : 'notifications' }}</mat-icon>
            <span>{{ isMuted ? 'Ativar notificações' : 'Silenciar notificações' }}</span>
          </button>
          
          <!-- Conversation Actions -->
          <button mat-menu-item (click)="onPinClick()">
            <mat-icon>{{ isPinned() ? 'push_pin' : 'push_pin' }}</mat-icon>
            <span>{{ isPinned() ? 'Desafixar conversa' : 'Fixar conversa' }}</span>
          </button>
          
          <button mat-menu-item (click)="onArchiveClick()">
            <mat-icon>archive</mat-icon>
            <span>Arquivar conversa</span>
          </button>
          
          <mat-divider></mat-divider>
          
          <!-- Group-specific Actions -->
          <ng-container *ngIf="conversation.type === 'group'">
            <button mat-menu-item (click)="onViewMembersClick()">
              <mat-icon>group</mat-icon>
              <span>Ver membros ({{ getParticipantsCount() }})</span>
            </button>
            
            <button mat-menu-item (click)="onEditGroupClick()">
              <mat-icon>edit</mat-icon>
              <span>Editar grupo</span>
            </button>
            
            <button mat-menu-item (click)="onAddParticipantClick()">
              <mat-icon>person_add</mat-icon>
              <span>Adicionar participante</span>
            </button>
            
            <button mat-menu-item (click)="onLeaveGroupClick()" class="warning-action">
              <mat-icon>exit_to_app</mat-icon>
              <span>Sair do grupo</span>
            </button>
            
            <mat-divider></mat-divider>
          </ng-container>
          
          <!-- Private conversation actions -->
          <ng-container *ngIf="conversation.type === 'private'">
            <button mat-menu-item (click)="onBlockUserClick()" class="warning-action">
              <mat-icon>block</mat-icon>
              <span>Bloquear usuário</span>
            </button>
            
            <mat-divider></mat-divider>
          </ng-container>
          
          <!-- Destructive Actions -->
          <button mat-menu-item (click)="onClearHistoryClick()" class="warning-action">
            <mat-icon>clear_all</mat-icon>
            <span>Limpar histórico</span>
          </button>
          
          <button mat-menu-item (click)="onDeleteClick()" class="delete-option">
            <mat-icon>delete</mat-icon>
            <span>Excluir conversa</span>
          </button>
        </mat-menu>
      </div>
    </mat-toolbar>
    
    <!-- Empty State -->
    <mat-toolbar *ngIf="!conversation" class="conversation-header empty">
      <div class="empty-header">
        <mat-icon class="empty-icon">chat_bubble_outline</mat-icon>
        <span>Selecione uma conversa</span>
      </div>
    </mat-toolbar>
  `,
  styles: [`
    .conversation-header {
      background: white;
      border-bottom: 1px solid #e0e0e0;
      padding: 8px 16px;
      min-height: 64px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .conversation-header.empty {
      justify-content: center;
    }
    
    .empty-header {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #999;
    }
    
    .empty-icon {
      font-size: 1.5rem;
      width: 1.5rem;
      height: 1.5rem;
    }
    
    .back-button {
      margin-right: 8px;
    }
    
    .mobile-only {
      display: none;
    }
    
    @media (max-width: 768px) {
      .mobile-only {
        display: flex;
      }
    }
    
    .conversation-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }
    
    .avatar-container {
      position: relative;
      flex-shrink: 0;
      min-width: 40px;
    }
    
    .avatar-stack {
      display: flex;
      position: relative;
      height: 40px;
      min-width: 40px;
    }
    
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 500;
      font-size: 14px;
      position: relative;
      border: 2px solid white;
    }
    
    .avatar.stacked {
      position: absolute;
      top: 0;
      background: #2196f3;
    }
    
    .avatar.stacked.more-count {
      background: #757575;
      color: white;
      font-size: 12px;
    }
    
    .avatar.private {
      background: #2196f3;
      position: relative;
    }
    
    .avatar-text {
      line-height: 1;
    }
    
    .online-indicator {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 12px;
      height: 12px;
      background: #4caf50;
      border: 2px solid white;
      border-radius: 50%;
    }
    
    .conversation-details {
      flex: 1;
      min-width: 0;
    }
    
    .conversation-name {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.2;
    }
    
    .conversation-status {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 2px;
    }
    
    .status-text {
      font-size: 12px;
      color: #666;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .status-text.online {
      color: #4caf50;
    }
    
    .status-text.offline {
      color: #999;
    }
    
    .status-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }
    
    .online-count {
      color: #4caf50;
      font-weight: 500;
    }
    
    .typing-indicator {
      font-size: 12px;
      color: #2196f3;
      font-style: italic;
      display: flex;
      align-items: center;
      gap: 4px;
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    .typing-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
      animation: typing-bounce 1.4s ease-in-out infinite;
    }
    
    @keyframes typing-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      // Menu action styles
      .warning-action {
        color: var(--mat-sys-error) !important;
        
        mat-icon {
          color: var(--mat-sys-error) !important;
        }
      }
      
      .delete-action {
        color: var(--mat-sys-error) !important;
        
        mat-icon {
          color: var(--mat-sys-error) !important;
        }
      }
      
      // Responsive design
      @media (max-width: 768px) {
        .conversation-header {
          padding: 8px 12px;
        }
        
        .avatar {
          width: 36px;
          height: 36px;
          
          &.stacked {
            width: 36px;
            height: 36px;
          }
        }
        
        .conversation-name {
          font-size: 16px;
        }
        
        .action-buttons {
          gap: 4px;
          
          button {
            width: 36px;
            height: 36px;
          }
        }
      }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .delete-option {
      color: #f44336;
    }
    
    .delete-option mat-icon {
      color: #f44336;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .conversation-header {
        padding: 8px 12px;
      }
      
      .header-actions button:not(:last-child) {
        display: none;
      }
    }
    
    @media (max-width: 480px) {
      .conversation-name {
        font-size: 14px;
      }
      
      .status-text {
        font-size: 11px;
      }
    }
  `]
})
export class ConversationHeaderComponent implements OnInit, OnDestroy {
  @Input() conversation: Conversation | null = null;
  @Output() backClicked = new EventEmitter<void>();
  @Output() searchClicked = new EventEmitter<void>();
  @Output() videoCallClicked = new EventEmitter<void>();
  @Output() voiceCallClicked = new EventEmitter<void>();
  @Output() infoClicked = new EventEmitter<void>();
  @Output() muteToggled = new EventEmitter<boolean>();
  @Output() archiveClicked = new EventEmitter<void>();
  @Output() addParticipantClicked = new EventEmitter<void>();
  @Output() leaveGroupClicked = new EventEmitter<void>();
  @Output() deleteClicked = new EventEmitter<void>();
  @Output() pinClicked = new EventEmitter<void>();
  @Output() viewMembersClicked = new EventEmitter<void>();
  @Output() editGroupClicked = new EventEmitter<void>();
  @Output() blockUserClicked = new EventEmitter<void>();
  @Output() clearHistoryClicked = new EventEmitter<void>();

  typingUsers: User[] = [];
  onlineUsers: User[] = [];
  isMuted = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private presenceService: PresenceService,
    private typingService: TypingService
  ) {}

  ngOnInit(): void {
    this.subscribeToPresence();
    this.subscribeToTyping();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToPresence(): void {
    this.presenceService.onlineUsers$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(users => {
      // Convert Map to array for template usage
      this.onlineUsers = Array.from(users.values()).flat();
    });
  }

  private subscribeToTyping(): void {
    this.typingService.typingUsers$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(users => {
      // Convert Map to array and filter typing users
      const typingArray = Array.from(users.values()).flat();
      const filteredTypingEvents = typingArray.filter((event: any) =>
         this.conversation && 
         event.conversation_id === this.conversation.id &&
         event.user.id !== this.getCurrentUserId()
       );
       this.typingUsers = filteredTypingEvents.map((event: any) => event.user);
    });
  }

  getConversationName(): string {
    if (!this.conversation) {
      return '';
    }
    
    if (this.conversation.type === 'group') {
      return this.conversation.name || 'Grupo sem nome';
    }
    
    // For direct conversations, show the other participant's name
    const otherParticipant = this.conversation.participants?.find(
      p => p.user.id !== this.getCurrentUserId()
    );
    return otherParticipant?.user.name || 'Usuário';
  }

  getParticipantsCount(): number {
    return this.conversation?.participants?.length || 0;
  }

  isUserOnline(): boolean {
    if (!this.conversation || this.conversation.type !== 'private') {
      return false;
    }
    
    const otherParticipant = this.conversation.participants?.find(
      p => p.user.id !== this.getCurrentUserId()
    );
    
    if (!otherParticipant) {
      return false;
    }
    
    return this.onlineUsers.some(user => user.id === otherParticipant.user.id);
  }

  getTypingText(): string {
    if (this.typingUsers.length === 0) {
      return '';
    }
    
    if (this.typingUsers.length === 1) {
      return `${this.typingUsers[0].name} está digitando...`;
    }
    
    if (this.typingUsers.length === 2) {
      return `${this.typingUsers[0].name} e ${this.typingUsers[1].name} estão digitando...`;
    }
    
    return `${this.typingUsers.length} pessoas estão digitando...`;
  }

  onBackClick(): void {
    this.backClicked.emit();
  }

  onSearchClick(): void {
    this.searchClicked.emit();
  }

  onVideoCallClick(): void {
    this.videoCallClicked.emit();
  }

  onVoiceCallClick(): void {
    this.voiceCallClicked.emit();
  }

  onInfoClick(): void {
    this.infoClicked.emit();
  }

  onMuteToggle(): void {
    this.isMuted = !this.isMuted;
    this.muteToggled.emit(this.isMuted);
  }

  onArchiveClick(): void {
    this.archiveClicked.emit();
  }

  onAddParticipantClick(): void {
    this.addParticipantClicked.emit();
  }

  onLeaveGroupClick(): void {
    this.leaveGroupClicked.emit();
  }

  onDeleteClick(): void {
    this.deleteClicked.emit();
  }

  onPinClick(): void {
    this.pinClicked.emit();
  }

  onViewMembersClick(): void {
    this.viewMembersClicked.emit();
  }

  onEditGroupClick(): void {
    this.editGroupClicked.emit();
  }

  onBlockUserClick(): void {
    this.blockUserClicked.emit();
  }

  onClearHistoryClick(): void {
    this.clearHistoryClicked.emit();
  }

  getVisibleParticipants(): any[] {
    if (!this.conversation?.participants) {
      return [];
    }
    return this.conversation.participants.slice(0, 3);
  }

  getRemainingParticipantsCount(): number {
    if (!this.conversation?.participants) {
      return 0;
    }
    return Math.max(0, this.conversation.participants.length - 3);
  }

  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getOtherParticipantInitials(): string {
    const otherParticipant = this.conversation?.participants?.find(
      p => p.user.id !== this.getCurrentUserId()
    );
    return otherParticipant ? this.getUserInitials(otherParticipant.user.name) : '??';
  }

  isParticipantOnline(userId: number): boolean {
    return this.onlineUsers.some(user => user.id === userId);
  }

  getOnlineParticipantsCount(): number {
    if (!this.conversation?.participants) {
      return 0;
    }
    return this.conversation.participants.filter(p => 
      this.isParticipantOnline(p.user.id)
    ).length;
  }

  getLastSeenText(): string {
    // This would typically come from the user's last seen timestamp
    return 'Visto por último hoje';
  }

  getNotificationCount(): number {
    // This would come from unread notifications count
    return 0;
  }

  isPinned(): boolean {
    // This would check if conversation is pinned
    return false;
  }

  trackParticipant(index: number, participant: any): any {
    return participant.user.id;
  }

  private getCurrentUserId(): number {
    // This should get the current user ID from AuthService
    // For now, we'll return a placeholder
    return 1;
  }
}