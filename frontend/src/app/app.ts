import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppChatLayoutComponent } from './shared/layouts/app-chat-layout/app-chat-layout.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppChatLayoutComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Chat App');
  
  constructor(private themeService: ThemeService) {}
  
  ngOnInit(): void {
    // Inicializar tema
    this.themeService.setTheme(this.themeService.getCurrentTheme());
  }
}
