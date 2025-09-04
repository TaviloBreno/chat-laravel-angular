import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, timer, EMPTY } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, filter } from 'rxjs/operators';
import { RealtimeService, RealtimeEvent } from './realtime.service';
import { ChatApiService } from './chat-api.service';
import { TypingEvent } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class TypingService {
  private typingUsersSubject = new BehaviorSubject<Map<number, TypingEvent[]>>(new Map());
  public typingUsers$ = this.typingUsersSubject.asObservable();
  
  private typingSubject = new Subject<{ conversationId: number; isTyping: boolean }>();
  private activeChannels = new Set<string>();
  private typingTimeouts = new Map<string, NodeJS.Timeout>();
  private destroy$ = new Subject<void>();
  
  // Configuration
  private readonly DEBOUNCE_TIME = 300; // ms
  private readonly TYPING_TIMEOUT = 3000; // ms
  private readonly AUTO_STOP_TIMEOUT = 5000; // ms

  constructor(
    private realtimeService: RealtimeService,
    private chatApiService: ChatApiService
  ) {
    this.setupTypingHandler();
    this.setupRealtimeEventListener();
  }

  /**
   * Start listening to typing events for a conversation
   * This is now handled automatically by RealtimeService
   */
  listenToTypingEvents(conversationId: number): void {
    // This method is kept for backward compatibility
    // The new RealtimeService handles typing events automatically
    console.log(`[TypingService] Typing events for conversation ${conversationId} are handled by RealtimeService`);
  }

  /**
   * Stop listening to typing events for a conversation
   */
  stopListeningToTypingEvents(conversationId: number): void {
    // Clear typing indicators for this conversation
    this.clearTypingIndicators(conversationId);
    console.log(`[TypingService] Stopped listening to typing events for conversation ${conversationId}`);
  }

  /**
   * Start typing in a conversation
   */
  startTyping(conversationId: number): void {
    this.typingSubject.next({ conversationId, isTyping: true });
  }

  /**
   * Handle typing input from composer (with debounce)
   */
  handleTypingInput(conversationId: number): void {
    this.startTyping(conversationId);
  }

  /**
   * Stop typing in a conversation
   */
  stopTyping(conversationId: number): void {
    this.typingSubject.next({ conversationId, isTyping: false });
  }

  getTypingUsersForConversation(conversationId: number): Observable<TypingEvent[]> {
    return new Observable(observer => {
      this.typingUsers$.subscribe(typingMap => {
        const typingUsers = typingMap.get(conversationId) || [];
        observer.next(typingUsers);
      });
    });
  }

  isUserTyping(conversationId: number, userId: number): boolean {
    const typingUsers = this.typingUsersSubject.value.get(conversationId) || [];
    return typingUsers.some(event => event.user.id === userId);
  }

  private sendStartTyping(conversationId: number): void {
    this.chatApiService.startTyping(conversationId).subscribe({
      next: () => console.log('Started typing notification sent'),
      error: (error) => console.error('Error sending start typing:', error)
    });
  }

  private sendStopTyping(conversationId: number): void {
    this.chatApiService.stopTyping(conversationId).subscribe({
      next: () => console.log('Stopped typing notification sent'),
      error: (error) => console.error('Error sending stop typing:', error)
    });
  }

  private addTypingUser(conversationId: number, event: TypingEvent): void {
    const currentTypingUsers = this.typingUsersSubject.value;
    const conversationTypingUsers = currentTypingUsers.get(conversationId) || [];
    
    // Check if user is not already in the typing list
    if (!conversationTypingUsers.some(e => e.user.id === event.user.id)) {
      conversationTypingUsers.push(event);
      currentTypingUsers.set(conversationId, conversationTypingUsers);
      this.typingUsersSubject.next(new Map(currentTypingUsers));
    }
  }

  private removeTypingUser(conversationId: number, userId: number): void {
    const currentTypingUsers = this.typingUsersSubject.value;
    const conversationTypingUsers = currentTypingUsers.get(conversationId) || [];
    
    const filteredUsers = conversationTypingUsers.filter(event => event.user.id !== userId);
    currentTypingUsers.set(conversationId, filteredUsers);
    this.typingUsersSubject.next(new Map(currentTypingUsers));
  }

  /**
   * Clear typing indicators for a specific conversation
   */
  clearTypingIndicators(conversationId: number): void {
    const currentTypingUsers = this.typingUsersSubject.value;
    
    // Clear timeouts for this conversation
    this.typingTimeouts.forEach((timeout, key) => {
      if (key.startsWith(`${conversationId}-`)) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }
    });
    
    currentTypingUsers.delete(conversationId);
    this.typingUsersSubject.next(new Map(currentTypingUsers));
  }

  /**
   * Check if anyone is typing in a conversation
   */
  isAnyoneTyping(conversationId: number): boolean {
    const typingUsers = this.typingUsersSubject.value.get(conversationId) || [];
    return typingUsers.length > 0;
  }

  /**
   * Get typing users count for a conversation
   */
  getTypingUsersCount(conversationId: number): number {
    const typingUsers = this.typingUsersSubject.value.get(conversationId) || [];
    return typingUsers.length;
  }

  /**
   * Destroy the service and clean up resources
   */
  destroy(): void {
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
    
    this.destroy$.next();
    this.destroy$.complete();
    
    this.typingUsersSubject.next(new Map());
  }

  // Clean up all typing channels and timeouts (legacy method)
  cleanup(): void {
    this.destroy();
  }

  /**
   * Setup the typing handler with debounce and auto-stop
   */
  private setupTypingHandler(): void {
    this.typingSubject
      .pipe(
        distinctUntilChanged((prev, curr) => 
          prev.conversationId === curr.conversationId && prev.isTyping === curr.isTyping
        ),
        debounceTime(this.DEBOUNCE_TIME),
        switchMap(({ conversationId, isTyping }) => {
          if (isTyping) {
            // Send typing started event
            return this.sendStartTyping(conversationId)
              .pipe(
                switchMap(() => {
                  // Set up auto-stop timer
                  return timer(this.TYPING_TIMEOUT).pipe(
                    switchMap(() => this.sendStopTyping(conversationId))
                  );
                }),
                takeUntil(
                  this.typingSubject.pipe(
                    filter(next => next.conversationId === conversationId && !next.isTyping),
                    switchMap(() => this.sendStopTyping(conversationId))
                  )
                )
              );
          } else {
            // Send typing stopped event
            return this.sendStopTyping(conversationId);
          }
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          console.log('[TypingService] Typing status sent successfully');
        },
        error: (error) => {
          console.error('[TypingService] Failed to send typing status:', error);
        }
      });
  }

  /**
   * Setup listener for realtime events from RealtimeService
   */
  private setupRealtimeEventListener(): void {
    this.realtimeService.events$
      .pipe(
        filter((event: RealtimeEvent) => 
          event.type === 'typing.started' || event.type === 'typing.stopped'
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((event: RealtimeEvent) => {
        const { conversationId } = event.data;
        
        if (event.type === 'typing.started') {
          this.handleTypingStartedEvent(conversationId, event.data);
        } else if (event.type === 'typing.stopped') {
          this.handleTypingStoppedEvent(conversationId, event.data);
        }
      });
  }

  /**
   * Handle typing started event from realtime
   */
  private handleTypingStartedEvent(conversationId: number, data: any): void {
    const typingEvent: TypingEvent = {
      user: data.user,
      conversation_id: conversationId,
      created_at: new Date().toISOString()
    };
    
    this.addTypingUser(conversationId, typingEvent);
    
    // Set auto-stop timer for this user
    const timeoutKey = `${conversationId}-${data.user.id}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey));
    }
    
    const timeout = setTimeout(() => {
      this.removeTypingUser(conversationId, data.user.id);
    }, this.AUTO_STOP_TIMEOUT);
    
    this.typingTimeouts.set(timeoutKey, timeout);
  }

  /**
   * Handle typing stopped event from realtime
   */
  private handleTypingStoppedEvent(conversationId: number, data: any): void {
    this.removeTypingUser(conversationId, data.user.id);
    
    // Clear timeout for this user
    const timeoutKey = `${conversationId}-${data.user.id}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey));
      this.typingTimeouts.delete(timeoutKey);
    }
  }
}