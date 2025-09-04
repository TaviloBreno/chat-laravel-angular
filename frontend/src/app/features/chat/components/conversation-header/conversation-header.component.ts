import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
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
    MatChipsModule
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
        <!-- Avatar -->
        <div class="avatar-container">
          <div class="avatar" [class.group]="conversation.type === 'group'">
            <mat-icon *ngIf="conversation.type === 'group'">group</mat-icon>
            <mat-icon *ngIf="conversation.type === 'private'">person</mat-icon>
          </div>
          <div 
            *ngIf="isUserOnline() && conversation.type === 'private'" 
            class="online-indicator"
          ></div>
        </div>
        
        <!-- Name and Status -->
        <div class="conversation-details">
          <h3 class="conversation-name">{{ getConversationName() }}</h3>
          <div class="conversation-status">
            <!-- Online Status for Direct Conversations -->
            <span *ngIf="conversation.type === 'private'" class="status-text">
              {{ isUserOnline() ? 'Online' : 'Offline' }}
            </span>
            
            <!-- Participants Count for Group Conversations -->
            <span *ngIf="conversation.type === 'group'" class="status-text">
              {{ getParticipantsCount() }} participantes
            </span>
            
            <!-- Typing Indicator -->
            <span *ngIf="typingUsers.length > 0" class="typing-indicator">
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
        >
          <mat-icon>search</mat-icon>
        </button>
        
        <!-- Video Call Button -->
        <button 
          mat-icon-button 
          (click)="onVideoCallClick()"
          matTooltip="Chamada de vídeo"
          [disabled]="conversation.type === 'group'"
        >
          <mat-icon>videocam</mat-icon>
        </button>
        
        <!-- Voice Call Button -->
        <button 
          mat-icon-button 
          (click)="onVoiceCallClick()"
          matTooltip="Chamada de voz"
          [disabled]="conversation.type === 'group'"
        >
          <mat-icon>call</mat-icon>
        </button>
        
        <!-- More Options -->
        <button 
          mat-icon-button 
          [matMenuTriggerFor]="optionsMenu"
          matTooltip="Mais opções"
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
          
          <!-- Mute/Unmute -->
          <button mat-menu-item (click)="onMuteToggle()">
            <mat-icon>{{ isMuted ? 'volume_up' : 'volume_off' }}</mat-icon>
            <span>{{ isMuted ? 'Ativar notificações' : 'Silenciar' }}</span>
          </button>
          
          <!-- Archive -->
          <button mat-menu-item (click)="onArchiveClick()">
            <mat-icon>archive</mat-icon>
            <span>Arquivar conversa</span>
          </button>
          
          <mat-divider *ngIf="conversation.type === 'group'"></mat-divider>
          
          <!-- Group-specific options -->
          <ng-container *ngIf="conversation.type === 'group'">
            <button mat-menu-item (click)="onAddParticipantClick()">
              <mat-icon>person_add</mat-icon>
              <span>Adicionar participante</span>
            </button>
            
            <button mat-menu-item (click)="onLeaveGroupClick()">
              <mat-icon>exit_to_app</mat-icon>
              <span>Sair do grupo</span>
            </button>
          </ng-container>
          
          <mat-divider></mat-divider>
          
          <!-- Delete Conversation -->
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
    }
    
    .avatar {
      width: 40px;
      height: 40px;
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
      align-items: center;
      gap: 8px;
      margin-top: 2px;
    }
    
    .status-text {
      font-size: 12px;
      color: #666;
    }
    
    .typing-indicator {
      font-size: 12px;
      color: #2196f3;
      font-style: italic;
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
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

  private getCurrentUserId(): number {
    // This should get the current user ID from AuthService
    // For now, we'll return a placeholder
    return 1;
  }
}