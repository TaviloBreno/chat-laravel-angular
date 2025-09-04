import { Component, OnInit, OnDestroy, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ConversationsListComponent } from '../../../features/chat/components/conversations-list/conversations-list.component';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    ConversationsListComponent
  ],
  template: `
    <div class="chat-layout">
      <!-- Header fixo -->
      <mat-toolbar class="app-header" color="primary">
        <button 
          mat-icon-button 
          (click)="toggleSidenav()" 
          [class.hidden-desktop]="!isMobile"
          matTooltip="Menu"
        >
          <mat-icon>menu</mat-icon>
        </button>
        
        <span class="app-title">Chat App</span>
        
        <div class="header-spacer"></div>
        
        <!-- Botão de tema -->
        <button 
          mat-icon-button 
          (click)="toggleTheme()" 
          matTooltip="Alternar tema"
        >
          <mat-icon>{{ isDarkTheme ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>
        
        <!-- Menu do usuário -->
        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item (click)="openProfile()">
            <mat-icon>person</mat-icon>
            <span>Perfil</span>
          </button>
          <button mat-menu-item (click)="openSettings()">
            <mat-icon>settings</mat-icon>
            <span>Configurações</span>
          </button>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Sair</span>
          </button>
        </mat-menu>
      </mat-toolbar>
      
      <!-- Container principal com sidenav -->
      <mat-sidenav-container class="sidenav-container">
        <mat-sidenav 
          #sidenav
          [mode]="sidenavMode"
          [opened]="sidenavOpened"
          class="app-sidenav"
          [fixedInViewport]="true"
          [fixedTopGap]="64"
        >
          <app-conversations-list></app-conversations-list>
        </mat-sidenav>
        
        <mat-sidenav-content class="main-content">
          <router-outlet></router-outlet>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .chat-layout {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .app-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      height: 64px;
    }
    
    .app-title {
      font-size: 1.2rem;
      font-weight: 500;
    }
    
    .header-spacer {
      flex: 1;
    }
    
    .sidenav-container {
      flex: 1;
      margin-top: 64px;
    }
    
    .app-sidenav {
      width: 320px;
      border-right: 1px solid var(--mat-divider-color);
    }
    
    .main-content {
      height: 100%;
      overflow: hidden;
    }
    
    @media (max-width: 959px) {
      .hidden-desktop {
        display: block !important;
      }
      
      .app-sidenav {
        width: 280px;
      }
    }
    
    @media (min-width: 960px) {
      .hidden-desktop {
        display: none !important;
      }
    }
  `]
})
export class AppChatLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  
  private destroy$ = new Subject<void>();
  
  isMobile = false;
  sidenavMode: 'over' | 'side' = 'side';
  sidenavOpened = true;
  isDarkTheme = false;
  
  constructor(
    private breakpointObserver: BreakpointObserver,
    private authService: AuthService,
    private themeService: ThemeService
  ) {}
  
  ngOnInit(): void {
    this.setupResponsiveLayout();
    this.setupTheme();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private setupResponsiveLayout(): void {
    this.breakpointObserver
      .observe(['(max-width: 959px)'])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isMobile = result.matches;
        this.sidenavMode = this.isMobile ? 'over' : 'side';
        this.sidenavOpened = !this.isMobile;
      });
  }
  
  private setupTheme(): void {
    this.themeService.isDarkTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isDark => {
        this.isDarkTheme = isDark;
      });
  }
  
  toggleSidenav(): void {
    if (this.sidenav) {
      this.sidenav.toggle();
    }
  }
  
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
  
  openProfile(): void {
    // Implementar navegação para perfil
    console.log('Abrir perfil');
  }
  
  openSettings(): void {
    // Implementar navegação para configurações
    console.log('Abrir configurações');
  }
  
  logout(): void {
    this.authService.logout();
  }
  
  @HostListener('window:resize')
  onResize(): void {
    // Força reavaliação do layout em redimensionamento
  }
}