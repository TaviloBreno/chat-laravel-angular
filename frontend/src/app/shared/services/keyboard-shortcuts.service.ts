import { Injectable, OnDestroy } from '@angular/core';
import { Subject, fromEvent, takeUntil } from 'rxjs';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  context?: string;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private shortcuts: KeyboardShortcut[] = [];
  private isEnabled = true;

  constructor() {
    this.initializeGlobalShortcuts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeGlobalShortcuts(): void {
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (!this.isEnabled) return;
        
        // Skip if user is typing in an input field
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
          // Only allow specific shortcuts in input fields
          this.handleInputFieldShortcuts(event);
          return;
        }

        this.handleGlobalShortcuts(event);
      });
  }

  private handleInputFieldShortcuts(event: KeyboardEvent): void {
    const shortcut = this.findMatchingShortcut(event, 'input');
    if (shortcut) {
      event.preventDefault();
      shortcut.action();
    }
  }

  private handleGlobalShortcuts(event: KeyboardEvent): void {
    const shortcut = this.findMatchingShortcut(event, 'global');
    if (shortcut) {
      event.preventDefault();
      shortcut.action();
    }
  }

  private findMatchingShortcut(event: KeyboardEvent, context: string): KeyboardShortcut | undefined {
    return this.shortcuts.find(shortcut => {
      if (shortcut.context && shortcut.context !== context) return false;
      
      return (
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.shiftKey === event.shiftKey &&
        !!shortcut.altKey === event.altKey &&
        !!shortcut.metaKey === event.metaKey
      );
    });
  }

  registerShortcut(shortcut: KeyboardShortcut): void {
    // Remove existing shortcut with same key combination
    this.shortcuts = this.shortcuts.filter(s => 
      !(s.key === shortcut.key && 
        s.ctrlKey === shortcut.ctrlKey && 
        s.shiftKey === shortcut.shiftKey && 
        s.altKey === shortcut.altKey && 
        s.metaKey === shortcut.metaKey &&
        s.context === shortcut.context)
    );
    
    this.shortcuts.push(shortcut);
  }

  unregisterShortcut(key: string, modifiers?: Partial<Pick<KeyboardShortcut, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>>, context?: string): void {
    this.shortcuts = this.shortcuts.filter(s => 
      !(s.key === key && 
        s.ctrlKey === modifiers?.ctrlKey && 
        s.shiftKey === modifiers?.shiftKey && 
        s.altKey === modifiers?.altKey && 
        s.metaKey === modifiers?.metaKey &&
        s.context === context)
    );
  }

  getShortcuts(context?: string): KeyboardShortcut[] {
    if (context) {
      return this.shortcuts.filter(s => s.context === context);
    }
    return [...this.shortcuts];
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  isShortcutsEnabled(): boolean {
    return this.isEnabled;
  }
}