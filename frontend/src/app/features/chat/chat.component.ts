import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { AuthUser } from '../../shared/models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <div class="chat-container">
      <!-- Header -->
      <mat-toolbar color="primary" class="chat-header">
        <span class="app-title">Chat App</span>
        
        <span class="spacer"></span>
        
        <div class="user-menu" *ngIf="currentUser">
          <button mat-icon-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          
          <mat-menu #userMenu="matMenu">
            <div class="user-info">
              <div class="user-name">{{ currentUser.name }}</div>
              <div class="user-email">{{ currentUser.email }}</div>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Sair</span>
            </button>
          </mat-menu>
        </div>
      </mat-toolbar>
      
      <!-- Main Content -->
      <div class="chat-content">
        <div class="welcome-message">
          <mat-icon class="welcome-icon">chat</mat-icon>
          <h2>Bem-vindo ao Chat!</h2>
          <p>Selecione uma conversa ou inicie uma nova para começar a conversar.</p>
          <p class="connection-status" [class.connected]="isConnected" [class.disconnected]="!isConnected">
            <mat-icon>{{ isConnected ? 'wifi' : 'wifi_off' }}</mat-icon>
            {{ isConnected ? 'Conectado' : 'Desconectado' }}
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .chat-header {
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .app-title {
      font-size: 1.2rem;
      font-weight: 500;
    }
    
    .spacer {
      flex: 1 1 auto;
    }
    
    .user-info {
      padding: 12px 16px;
      min-width: 200px;
    }
    
    .user-name {
      font-weight: 500;
      font-size: 14px;
      color: rgba(0,0,0,0.87);
    }
    
    .user-email {
      font-size: 12px;
      color: rgba(0,0,0,0.54);
      margin-top: 2px;
    }
    
    .chat-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f5f5f5;
    }
    
    .welcome-message {
      text-align: center;
      max-width: 400px;
      padding: 2rem;
    }
    
    .welcome-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: #666;
      margin-bottom: 1rem;
    }
    
    .welcome-message h2 {
      margin: 0 0 1rem 0;
      color: #333;
      font-weight: 400;
    }
    
    .welcome-message p {
      margin: 0 0 1rem 0;
      color: #666;
      line-height: 1.5;
    }
    
    .connection-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      margin-top: 1rem;
    }
    
    .connection-status.connected {
      background-color: #e8f5e8;
      color: #2e7d32;
    }
    
    .connection-status.disconnected {
      background-color: #ffebee;
      color: #c62828;
    }
    
    .connection-status mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy {
  currentUser: AuthUser | null = null;
  isConnected = false;

  constructor(
    private authService: AuthService,
    private realtimeService: RealtimeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get current user
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Initialize realtime connection
    this.initializeRealtimeConnection();
  }

  ngOnDestroy(): void {
    this.realtimeService.disconnect();
  }

  private initializeRealtimeConnection(): void {
    this.realtimeService.initialize();
    
    // Monitor connection status
    this.realtimeService.isConnected$.subscribe(connected => {
      this.isConnected = connected;
    });
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
}