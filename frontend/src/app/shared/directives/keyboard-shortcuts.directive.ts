import { Directive, Input, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { KeyboardShortcutsService, KeyboardShortcut } from '../services/keyboard-shortcuts.service';

@Directive({
  selector: '[appKeyboardShortcuts]',
  standalone: true
})
export class KeyboardShortcutsDirective implements OnInit, OnDestroy {
  @Input() shortcuts: KeyboardShortcut[] = [];
  @Input() context: string = 'component';
  @Input() enabled: boolean = true;

  private registeredShortcuts: KeyboardShortcut[] = [];

  constructor(
    private keyboardService: KeyboardShortcutsService,
    private elementRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.registerShortcuts();
  }

  ngOnDestroy(): void {
    this.unregisterShortcuts();
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Handle component-specific shortcuts
    const matchingShortcut = this.shortcuts.find(shortcut => 
      this.isShortcutMatch(shortcut, event)
    );

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
    }
  }

  private registerShortcuts(): void {
    this.shortcuts.forEach(shortcut => {
      const contextualShortcut: KeyboardShortcut = {
        ...shortcut,
        context: this.context
      };
      
      this.keyboardService.registerShortcut(contextualShortcut);
      this.registeredShortcuts.push(contextualShortcut);
    });
  }

  private unregisterShortcuts(): void {
    this.registeredShortcuts.forEach(shortcut => {
      this.keyboardService.unregisterShortcut(
        shortcut.key,
        {
          ctrlKey: shortcut.ctrlKey,
          shiftKey: shortcut.shiftKey,
          altKey: shortcut.altKey,
          metaKey: shortcut.metaKey
        },
        shortcut.context
      );
    });
    this.registeredShortcuts = [];
  }

  private isShortcutMatch(shortcut: KeyboardShortcut, event: KeyboardEvent): boolean {
    return (
      shortcut.key.toLowerCase() === event.key.toLowerCase() &&
      !!shortcut.ctrlKey === event.ctrlKey &&
      !!shortcut.shiftKey === event.shiftKey &&
      !!shortcut.altKey === event.altKey &&
      !!shortcut.metaKey === event.metaKey
    );
  }

  updateShortcuts(newShortcuts: KeyboardShortcut[]): void {
    this.unregisterShortcuts();
    this.shortcuts = newShortcuts;
    this.registerShortcuts();
  }

  enableShortcuts(): void {
    this.enabled = true;
  }

  disableShortcuts(): void {
    this.enabled = false;
  }
}