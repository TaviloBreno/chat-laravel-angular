import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RealtimeService } from './realtime.service';
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

  constructor(
    private realtimeService: RealtimeService,
    private chatApiService: ChatApiService
  ) {
    // Debounce typing events to avoid too many API calls
    this.typingSubject.pipe(
      debounceTime(300),
      distinctUntilChanged((prev, curr) => 
        prev.conversationId === curr.conversationId && prev.isTyping === curr.isTyping
      )
    ).subscribe(({ conversationId, isTyping }) => {
      if (isTyping) {
        this.sendStartTyping(conversationId);
      } else {
        this.sendStopTyping(conversationId);
      }
    });
  }

  listenToTypingEvents(conversationId: number): void {
    const channelName = `private-conversation.${conversationId}`;
    
    if (this.activeChannels.has(channelName)) {
      return; // Already listening
    }

    const echo = this.realtimeService.getEcho();
    if (!echo) {
      console.warn('Echo not initialized, cannot listen to typing events');
      return;
    }

    const channel = echo.private(channelName);
    
    channel
      .listen('UserStartedTyping', (event: TypingEvent) => {
        console.log('User started typing:', event);
        this.addTypingUser(conversationId, event);
      })
      .listen('UserStoppedTyping', (event: TypingEvent) => {
        console.log('User stopped typing:', event);
        this.removeTypingUser(conversationId, event.user.id);
      })
      .error((error: Error) => {
        console.error('Typing channel error:', error);
      });

    this.activeChannels.add(channelName);
  }

  stopListeningToTypingEvents(conversationId: number): void {
    const channelName = `private-conversation.${conversationId}`;
    
    if (!this.activeChannels.has(channelName)) {
      return; // Not listening
    }

    this.realtimeService.leave(channelName);
    this.activeChannels.delete(channelName);
    
    // Remove typing users for this conversation
    const currentTypingUsers = this.typingUsersSubject.value;
    currentTypingUsers.delete(conversationId);
    this.typingUsersSubject.next(new Map(currentTypingUsers));
  }

  startTyping(conversationId: number): void {
    this.typingSubject.next({ conversationId, isTyping: true });
    
    // Auto-stop typing after 3 seconds of inactivity
    const timeoutKey = `${conversationId}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey));
    }
    
    const timeout = setTimeout(() => {
      this.stopTyping(conversationId);
    }, 3000);
    
    this.typingTimeouts.set(timeoutKey, timeout);
  }

  stopTyping(conversationId: number): void {
    const timeoutKey = `${conversationId}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey));
      this.typingTimeouts.delete(timeoutKey);
    }
    
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

  // Clean up all typing channels and timeouts
  cleanup(): void {
    this.activeChannels.forEach(channelName => {
      this.realtimeService.leave(channelName);
    });
    this.activeChannels.clear();
    
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
    
    this.typingUsersSubject.next(new Map());
  }
}