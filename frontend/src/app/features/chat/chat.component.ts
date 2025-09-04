import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { ConversationsListComponent } from './components/conversations-list/conversations-list.component';
import { ConversationHeaderComponent } from './components/conversation-header/conversation-header.component';
import { MessagesThreadComponent } from './components/messages-thread/messages-thread.component';
import { ComposerComponent } from './components/composer/composer.component';
import { User, Conversation, Message } from '../../shared/models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule,
    MatSidenavModule,
    ConversationsListComponent,
    ConversationHeaderComponent,
    MessagesThreadComponent,
    ComposerComponent
  ],
  template: `
    <div class="chat-container">
      <!-- Header -->
      <mat-toolbar color="primary" class="chat-header">
        <div class="header-content">
          <div class="app-info">
            <button 
              mat-icon-button 
              class="menu-toggle"
              (click)="toggleSidenav()"
              [class.mobile-only]="true"
            >
              <mat-icon>menu</mat-icon>
            </button>
            <mat-icon class="app-icon">chat</mat-icon>
            <h1>Chat App</h1>
          </div>
          
          <div class="header-actions">
            <!-- Connection Status -->
            <div class="connection-status" [class.connected]="isConnected">
              <mat-icon>{{ isConnected ? 'wifi' : 'wifi_off' }}</mat-icon>
              <span class="status-text">{{ isConnected ? 'Conectado' : 'Desconectado' }}</span>
            </div>
            
            <!-- User Menu -->
            <button mat-icon-button [matMenuTriggerFor]="userMenu" class="user-menu-button">
              <div class="user-avatar">
                {{ getUserInitials() }}
              </div>
            </button>
            
            <mat-menu #userMenu="matMenu">
              <div class="user-info">
                <div class="user-details">
                  <strong>{{ currentUser?.name }}</strong>
                  <small>{{ currentUser?.email }}</small>
                </div>
              </div>
              
              <mat-divider></mat-divider>
              
              <button mat-menu-item>
                <mat-icon>person</mat-icon>
                <span>Perfil</span>
              </button>
              
              <button mat-menu-item>
                <mat-icon>settings</mat-icon>
                <span>Configurações</span>
              </button>
              
              <mat-divider></mat-divider>
              
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>Sair</span>
              </button>
            </mat-menu>
          </div>
        </div>
      </mat-toolbar>
      
      <!-- Main Chat Layout -->
      <div class="chat-main">
        <mat-sidenav-container class="chat-sidenav-container">
          <!-- Conversations Sidebar -->
          <mat-sidenav 
            #sidenav
            mode="side"
            opened="true"
            class="conversations-sidenav"
            [class.mobile-mode]="isMobile"
          >
            <app-conversations-list
              (conversationSelected)="onConversationSelected($event)"
              (newConversationRequested)="onNewConversationRequested()"
            ></app-conversations-list>
          </mat-sidenav>
          
          <!-- Main Chat Content -->
          <mat-sidenav-content class="chat-content">
            <div class="conversation-container">
              <!-- Conversation Header -->
              <app-conversation-header
                [conversation]="selectedConversation"
                (backClicked)="onBackToConversations()"
                (searchClicked)="onSearchMessages()"
                (videoCallClicked)="onVideoCall()"
                (voiceCallClicked)="onVoiceCall()"
                (infoClicked)="onConversationInfo()"
                (muteToggled)="onMuteToggle($event)"
                (archiveClicked)="onArchiveConversation()"
                (addParticipantClicked)="onAddParticipant()"
                (leaveGroupClicked)="onLeaveGroup()"
                (deleteClicked)="onDeleteConversation()"
              ></app-conversation-header>
              
              <!-- Messages Thread -->
              <div class="messages-container">
                <app-messages-thread
                  [conversation]="selectedConversation"
                ></app-messages-thread>
              </div>
              
              <!-- Message Composer -->
              <app-composer
                [conversation]="selectedConversation"
                [replyingTo]="replyingToMessage"
                (messageSent)="onMessageSent($event)"
                (replyCancel)="onReplyCancel()"
              ></app-composer>
            </div>
          </mat-sidenav-content>
        </mat-sidenav-container>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f5f5f5;
    }
    
    .chat-header {
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 10;
    }
    
    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    
    .app-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .menu-toggle {
      display: none;
    }
    
    .mobile-only {
      display: none;
    }
    
    @media (max-width: 768px) {
      .mobile-only {
        display: flex;
      }
    }
    
    .app-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    
    .chat-header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.1);
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
    }
    
    .connection-status.connected {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }
    
    .connection-status mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .status-text {
      display: inline;
    }
    
    @media (max-width: 480px) {
      .status-text {
        display: none;
      }
    }
    
    .user-menu-button {
      padding: 0;
    }
    
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 500;
      color: white;
    }
    
    .user-info {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .user-details strong {
      display: block;
      margin-bottom: 4px;
    }
    
    .user-details small {
      color: #666;
    }
    
    .chat-main {
      flex: 1;
      overflow: hidden;
    }
    
    .chat-sidenav-container {
      height: 100%;
    }
    
    .conversations-sidenav {
      width: 320px;
      border-right: 1px solid #e0e0e0;
    }
    
    .conversations-sidenav.mobile-mode {
      width: 280px;
    }
    
    .chat-content {
      display: flex;
      flex-direction: column;
    }
    
    .conversation-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .messages-container {
      flex: 1;
      overflow: hidden;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .conversations-sidenav {
        position: fixed;
        z-index: 100;
      }
      
      .chat-header h1 {
        font-size: 18px;
      }
      
      .header-actions {
        gap: 8px;
      }
    }
    
    @media (max-width: 480px) {
      .conversations-sidenav {
        width: 100vw;
      }
      
      .app-info gap {
        gap: 8px;
      }
      
      .chat-header h1 {
        font-size: 16px;
      }
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isConnected = false;
  selectedConversation: Conversation | null = null;
  replyingToMessage: Message | null = null;
  isMobile = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private realtimeService: RealtimeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.subscribeToConnection();
    this.checkMobileView();
    this.setupResizeListener();
  }

  ngOnDestroy(): void {
    this.realtimeService.disconnect();
  }

  private loadCurrentUser(): void {
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUser = user;
    });
  }

  private subscribeToConnection(): void {
    this.realtimeService.isConnected$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(connected => {
      this.isConnected = connected;
    });
  }

  private checkMobileView(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  private setupResizeListener(): void {
    window.addEventListener('resize', () => {
      this.checkMobileView();
    });
  }

  getUserInitials(): string {
    if (!this.currentUser?.name) return 'U';
    return this.currentUser.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Force logout even if API call fails
        this.authService.clearAuthData();
        this.router.navigate(['/auth/login']);
      }
    });
  }

  // Sidenav methods
  toggleSidenav(): void {
    // This would be implemented with ViewChild reference to sidenav
    console.log('Toggle sidenav');
  }

  // Conversation methods
  onConversationSelected(conversation: Conversation): void {
    this.selectedConversation = conversation;
    this.replyingToMessage = null;
  }

  onNewConversationRequested(): void {
    // Implement new conversation logic
    console.log('New conversation requested');
  }

  onBackToConversations(): void {
    if (this.isMobile) {
      this.selectedConversation = null;
    }
  }

  // Message methods
  onMessageSent(message: Message): void {
    console.log('Message sent:', message);
  }

  onReplyCancel(): void {
    this.replyingToMessage = null;
  }

  // Header action methods
  onSearchMessages(): void {
    console.log('Search messages');
  }

  onVideoCall(): void {
    console.log('Start video call');
  }

  onVoiceCall(): void {
    console.log('Start voice call');
  }

  onConversationInfo(): void {
    console.log('Show conversation info');
  }

  onMuteToggle(muted: boolean): void {
    console.log('Mute toggled:', muted);
  }

  onArchiveConversation(): void {
    console.log('Archive conversation');
  }

  onAddParticipant(): void {
    console.log('Add participant');
  }

  onLeaveGroup(): void {
    console.log('Leave group');
  }

  onDeleteConversation(): void {
    console.log('Delete conversation');
  }
}