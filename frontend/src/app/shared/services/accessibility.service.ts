import { Injectable, ElementRef, Renderer2, RendererFactory2 } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FocusableElement {
  element: HTMLElement;
  priority: number;
  context?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private renderer: Renderer2;
  private focusStack: HTMLElement[] = [];
  private focusableElements: FocusableElement[] = [];
  private activeFocusTrap: FocusTrap | null = null;
  private isHighContrastMode$ = new BehaviorSubject<boolean>(false);
  private isReducedMotion$ = new BehaviorSubject<boolean>(false);

  constructor(
    private liveAnnouncer: LiveAnnouncer,
    private focusTrapFactory: FocusTrapFactory,
    rendererFactory: RendererFactory2
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.detectAccessibilityPreferences();
  }

  // Live announcements for screen readers
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.liveAnnouncer.announce(message, priority);
  }

  announceNewMessage(senderName: string, messageContent: string): void {
    const announcement = `Nova mensagem de ${senderName}: ${messageContent}`;
    this.announce(announcement, 'polite');
  }

  announceTyping(userName: string): void {
    this.announce(`${userName} está digitando`, 'polite');
  }

  announceConnectionStatus(isConnected: boolean): void {
    const status = isConnected ? 'conectado' : 'desconectado';
    this.announce(`Status da conexão: ${status}`, 'assertive');
  }

  // Focus management
  saveFocus(element?: HTMLElement): void {
    const activeElement = element || (document.activeElement as HTMLElement);
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
    }
  }

  restoreFocus(): boolean {
    const lastFocusedElement = this.focusStack.pop();
    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
      return true;
    }
    return false;
  }

  focusElement(element: HTMLElement, options?: FocusOptions): void {
    if (element && typeof element.focus === 'function') {
      element.focus(options);
    }
  }

  focusFirstFocusableElement(container: HTMLElement): boolean {
    const focusableElement = this.getFirstFocusableElement(container);
    if (focusableElement) {
      this.focusElement(focusableElement);
      return true;
    }
    return false;
  }

  focusLastFocusableElement(container: HTMLElement): boolean {
    const focusableElements = this.getFocusableElements(container);
    const lastElement = focusableElements[focusableElements.length - 1];
    if (lastElement) {
      this.focusElement(lastElement);
      return true;
    }
    return false;
  }

  private getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
    const focusableElements = this.getFocusableElements(container);
    return focusableElements.length > 0 ? focusableElements[0] : null;
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }

  // Focus trap management
  createFocusTrap(element: HTMLElement): FocusTrap {
    if (this.activeFocusTrap) {
      this.activeFocusTrap.destroy();
    }
    
    this.activeFocusTrap = this.focusTrapFactory.create(element);
    return this.activeFocusTrap;
  }

  destroyFocusTrap(): void {
    if (this.activeFocusTrap) {
      this.activeFocusTrap.destroy();
      this.activeFocusTrap = null;
    }
  }

  // ARIA attributes management
  setAriaLabel(element: HTMLElement, label: string): void {
    this.renderer.setAttribute(element, 'aria-label', label);
  }

  setAriaDescribedBy(element: HTMLElement, describedById: string): void {
    this.renderer.setAttribute(element, 'aria-describedby', describedById);
  }

  setAriaExpanded(element: HTMLElement, expanded: boolean): void {
    this.renderer.setAttribute(element, 'aria-expanded', expanded.toString());
  }

  setAriaHidden(element: HTMLElement, hidden: boolean): void {
    if (hidden) {
      this.renderer.setAttribute(element, 'aria-hidden', 'true');
    } else {
      this.renderer.removeAttribute(element, 'aria-hidden');
    }
  }

  setAriaLive(element: HTMLElement, politeness: 'off' | 'polite' | 'assertive'): void {
    this.renderer.setAttribute(element, 'aria-live', politeness);
  }

  setRole(element: HTMLElement, role: string): void {
    this.renderer.setAttribute(element, 'role', role);
  }

  // Keyboard navigation helpers
  handleArrowNavigation(
    event: KeyboardEvent, 
    items: HTMLElement[], 
    currentIndex: number,
    orientation: 'horizontal' | 'vertical' = 'vertical'
  ): number {
    let newIndex = currentIndex;
    
    if (orientation === 'vertical') {
      if (event.key === 'ArrowDown') {
        newIndex = (currentIndex + 1) % items.length;
      } else if (event.key === 'ArrowUp') {
        newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
      }
    } else {
      if (event.key === 'ArrowRight') {
        newIndex = (currentIndex + 1) % items.length;
      } else if (event.key === 'ArrowLeft') {
        newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
      }
    }

    if (newIndex !== currentIndex) {
      event.preventDefault();
      items[newIndex]?.focus();
    }

    return newIndex;
  }

  // Accessibility preferences detection
  private detectAccessibilityPreferences(): void {
    // Detect high contrast mode
    if (window.matchMedia) {
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
      this.isHighContrastMode$.next(highContrastQuery.matches);
      
      highContrastQuery.addEventListener('change', (e) => {
        this.isHighContrastMode$.next(e.matches);
      });

      // Detect reduced motion preference
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.isReducedMotion$.next(reducedMotionQuery.matches);
      
      reducedMotionQuery.addEventListener('change', (e) => {
        this.isReducedMotion$.next(e.matches);
      });
    }
  }

  isHighContrastMode(): Observable<boolean> {
    return this.isHighContrastMode$.asObservable();
  }

  isReducedMotion(): Observable<boolean> {
    return this.isReducedMotion$.asObservable();
  }

  // Skip links
  createSkipLink(targetId: string, text: string): HTMLElement {
    const skipLink = this.renderer.createElement('a');
    this.renderer.setAttribute(skipLink, 'href', `#${targetId}`);
    this.renderer.setAttribute(skipLink, 'class', 'skip-link');
    this.renderer.setProperty(skipLink, 'textContent', text);
    
    this.renderer.listen(skipLink, 'click', (event) => {
      event.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    return skipLink;
  }

  // Screen reader utilities
  hideFromScreenReader(element: HTMLElement): void {
    this.setAriaHidden(element, true);
  }

  showToScreenReader(element: HTMLElement): void {
    this.setAriaHidden(element, false);
  }

  makeElementReadOnly(element: HTMLElement): void {
    this.renderer.setAttribute(element, 'aria-readonly', 'true');
  }

  makeElementEditable(element: HTMLElement): void {
    this.renderer.removeAttribute(element, 'aria-readonly');
  }
}