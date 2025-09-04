import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RealtimeService } from './realtime.service';
import { User } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  private onlineUsersSubject = new BehaviorSubject<Map<number, User[]>>(new Map());
  public onlineUsers$ = this.onlineUsersSubject.asObservable();
  
  private activeChannels = new Set<string>();

  constructor(private realtimeService: RealtimeService) {}

  joinConversationPresence(conversationId: number): void {
    const channelName = `presence-conversation.${conversationId}`;
    
    if (this.activeChannels.has(channelName)) {
      return; // Already joined
    }

    const echo = this.realtimeService.getEcho();
    if (!echo) {
      console.warn('Echo not initialized, cannot join presence channel');
      return;
    }

    const channel = echo.join(channelName);
    
    channel
      .here((users: User[]) => {
        console.log('Users currently in conversation:', users);
        this.updateOnlineUsers(conversationId, users);
      })
      .joining((user: User) => {
        console.log('User joined conversation:', user);
        this.addOnlineUser(conversationId, user);
      })
      .leaving((user: User) => {
        console.log('User left conversation:', user);
        this.removeOnlineUser(conversationId, user);
      })
      .error((error: any) => {
        console.error('Presence channel error:', error);
      });

    this.activeChannels.add(channelName);
  }

  leaveConversationPresence(conversationId: number): void {
    const channelName = `presence-conversation.${conversationId}`;
    
    if (!this.activeChannels.has(channelName)) {
      return; // Not joined
    }

    this.realtimeService.leave(channelName);
    this.activeChannels.delete(channelName);
    
    // Remove online users for this conversation
    const currentUsers = this.onlineUsersSubject.value;
    currentUsers.delete(conversationId);
    this.onlineUsersSubject.next(new Map(currentUsers));
  }

  getOnlineUsersForConversation(conversationId: number): Observable<User[]> {
    return new Observable(observer => {
      this.onlineUsers$.subscribe(usersMap => {
        const users = usersMap.get(conversationId) || [];
        observer.next(users);
      });
    });
  }

  isUserOnline(conversationId: number, userId: number): boolean {
    const users = this.onlineUsersSubject.value.get(conversationId) || [];
    return users.some(user => user.id === userId);
  }

  private updateOnlineUsers(conversationId: number, users: User[]): void {
    const currentUsers = this.onlineUsersSubject.value;
    currentUsers.set(conversationId, users);
    this.onlineUsersSubject.next(new Map(currentUsers));
  }

  private addOnlineUser(conversationId: number, user: User): void {
    const currentUsers = this.onlineUsersSubject.value;
    const conversationUsers = currentUsers.get(conversationId) || [];
    
    // Check if user is not already in the list
    if (!conversationUsers.some(u => u.id === user.id)) {
      conversationUsers.push(user);
      currentUsers.set(conversationId, conversationUsers);
      this.onlineUsersSubject.next(new Map(currentUsers));
    }
  }

  private removeOnlineUser(conversationId: number, user: User): void {
    const currentUsers = this.onlineUsersSubject.value;
    const conversationUsers = currentUsers.get(conversationId) || [];
    
    const filteredUsers = conversationUsers.filter(u => u.id !== user.id);
    currentUsers.set(conversationId, filteredUsers);
    this.onlineUsersSubject.next(new Map(currentUsers));
  }

  // Clean up all presence channels
  cleanup(): void {
    this.activeChannels.forEach(channelName => {
      this.realtimeService.leave(channelName);
    });
    this.activeChannels.clear();
    this.onlineUsersSubject.next(new Map());
  }
}