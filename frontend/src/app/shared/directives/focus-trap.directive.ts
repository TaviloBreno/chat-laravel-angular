import { Directive, Input, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { AccessibilityService } from '../services/accessibility.service';
import { FocusTrap } from '@angular/cdk/a11y';

@Directive({
  selector: '[appFocusTrap]',
  standalone: true
})
export class FocusTrapDirective implements OnInit, OnDestroy {
  @Input() enabled: boolean = true;
  @Input() autoFocus: boolean = true;
  @Input() restoreFocus: boolean = true;

  private focusTrap: FocusTrap | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private accessibilityService: AccessibilityService
  ) {}

  ngOnInit(): void {
    if (this.enabled) {
      this.initializeFocusTrap();
    }
  }

  ngOnDestroy(): void {
    this.destroyFocusTrap();
  }

  @HostListener('keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.enabled && this.focusTrap) {
      event.preventDefault();
      this.destroyFocusTrap();
    }
  }

  private initializeFocusTrap(): void {
    // Save current focus
    if (this.restoreFocus) {
      this.previouslyFocusedElement = document.activeElement as HTMLElement;
      this.accessibilityService.saveFocus(this.previouslyFocusedElement);
    }

    // Create focus trap
    this.focusTrap = this.accessibilityService.createFocusTrap(this.elementRef.nativeElement);
    
    // Auto focus first element
    if (this.autoFocus) {
      setTimeout(() => {
        if (this.focusTrap) {
          const success = this.accessibilityService.focusFirstFocusableElement(this.elementRef.nativeElement);
          if (!success) {
            // If no focusable element found, focus the container itself
            this.elementRef.nativeElement.focus();
          }
        }
      }, 0);
    }
  }

  private destroyFocusTrap(): void {
    if (this.focusTrap) {
      this.accessibilityService.destroyFocusTrap();
      this.focusTrap = null;
    }

    // Restore previous focus
    if (this.restoreFocus) {
      const restored = this.accessibilityService.restoreFocus();
      if (!restored && this.previouslyFocusedElement) {
        this.previouslyFocusedElement.focus();
      }
    }
  }

  enableTrap(): void {
    if (!this.enabled) {
      this.enabled = true;
      this.initializeFocusTrap();
    }
  }

  disableTrap(): void {
    if (this.enabled) {
      this.enabled = false;
      this.destroyFocusTrap();
    }
  }
}