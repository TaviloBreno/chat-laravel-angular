import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private isDarkThemeSubject = new BehaviorSubject<boolean>(false);
  
  public isDarkTheme$: Observable<boolean> = this.isDarkThemeSubject.asObservable();
  
  constructor(private rendererFactory: RendererFactory2) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
    this.initializeTheme();
  }
  
  private initializeTheme(): void {
    // Verificar se há tema salvo no localStorage
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    this.setTheme(isDark);
  }
  
  toggleTheme(): void {
    const currentTheme = this.isDarkThemeSubject.value;
    this.setTheme(!currentTheme);
  }
  
  setTheme(isDark: boolean): void {
    const body = document.body;
    
    if (isDark) {
      this.renderer.addClass(body, 'dark-theme');
      this.renderer.removeClass(body, 'light-theme');
    } else {
      this.renderer.addClass(body, 'light-theme');
      this.renderer.removeClass(body, 'dark-theme');
    }
    
    // Salvar preferência no localStorage
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    this.isDarkThemeSubject.next(isDark);
  }
  
  getCurrentTheme(): boolean {
    return this.isDarkThemeSubject.value;
  }
}