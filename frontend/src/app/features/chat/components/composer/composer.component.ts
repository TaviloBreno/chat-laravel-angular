import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { ChatApiService } from '../../../../core/services/chat-api.service';
import { TypingService } from '../../../../core/services/typing.service';
import { Conversation, Message, SendMessageRequest } from '../../../../shared/models';

@Component({
  selector: 'app-composer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="composer-container" *ngIf="conversation">
      <!-- File Upload Progress -->
      <div *ngIf="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
        <mat-progress-bar [value]="uploadProgress"></mat-progress-bar>
        <span class="progress-text">Enviando arquivo... {{ uploadProgress }}%</span>
        <button mat-icon-button (click)="cancelUpload()" class="cancel-upload">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <!-- Reply Preview -->
      <div *ngIf="replyingTo" class="reply-preview">
        <div class="reply-content">
          <div class="reply-header">
            <mat-icon>reply</mat-icon>
            <span>Respondendo a {{ replyingTo.user?.name }}</span>
          </div>
          <div class="reply-message">{{ getReplyPreview(replyingTo) }}</div>
        </div>
        <button mat-icon-button (click)="cancelReply()" class="cancel-reply">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <!-- Main Composer -->
      <div class="composer-main">
        <!-- Attachment Button -->
        <button 
          mat-icon-button 
          class="attachment-button"
          [matMenuTriggerFor]="attachmentMenu"
          matTooltip="Anexar arquivo"
          [disabled]="sending"
        >
          <mat-icon>attach_file</mat-icon>
        </button>
        
        <mat-menu #attachmentMenu="matMenu">
          <button mat-menu-item (click)="selectFile('image')">
            <mat-icon>image</mat-icon>
            <span>Imagem</span>
          </button>
          <button mat-menu-item (click)="selectFile('document')">
            <mat-icon>description</mat-icon>
            <span>Documento</span>
          </button>
          <button mat-menu-item (click)="selectFile('any')">
            <mat-icon>attach_file</mat-icon>
            <span>Qualquer arquivo</span>
          </button>
        </mat-menu>
        
        <!-- Message Input -->
        <div class="message-input-container">
          <mat-form-field appearance="outline" class="message-field">
            <textarea 
              matInput
              #messageInput
              [(ngModel)]="messageText"
              (keydown)="onKeyDown($event)"
              (input)="onInput()"
              (focus)="onFocus()"
              (blur)="onBlur()"
              placeholder="Digite uma mensagem..."
              rows="1"
              [disabled]="sending"
              class="message-textarea"
            ></textarea>
          </mat-form-field>
          
          <!-- Emoji Button -->
          <button 
            mat-icon-button 
            class="emoji-button"
            (click)="toggleEmojiPicker()"
            matTooltip="Adicionar emoji"
            [disabled]="sending"
          >
            <mat-icon>emoji_emotions</mat-icon>
          </button>
        </div>
        
        <!-- Send Button -->
        <button 
          mat-fab 
          class="send-button"
          [disabled]="!canSend() || sending"
          (click)="sendMessage()"
          color="primary"
          matTooltip="Enviar mensagem"
        >
          <mat-icon *ngIf="!sending">send</mat-icon>
          <mat-icon *ngIf="sending" class="sending-icon">hourglass_empty</mat-icon>
        </button>
      </div>
      
      <!-- Emoji Picker (Simple) -->
      <div *ngIf="showEmojiPicker" class="emoji-picker">
        <div class="emoji-grid">
          <button 
            *ngFor="let emoji of commonEmojis"
            class="emoji-item"
            (click)="insertEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
        <div class="emoji-picker-footer">
          <button mat-button (click)="toggleEmojiPicker()">Fechar</button>
        </div>
      </div>
    </div>
    
    <!-- Hidden File Input -->
    <input 
      #fileInput
      type="file"
      (change)="onFileSelected($event)"
      [accept]="fileAccept"
      style="display: none;"
      multiple
    >
  `,
  styles: [`
    .composer-container {
      background: white;
      border-top: 1px solid #e0e0e0;
      padding: 16px;
    }
    
    .upload-progress {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    
    .upload-progress mat-progress-bar {
      flex: 1;
    }
    
    .progress-text {
      font-size: 12px;
      color: #666;
      white-space: nowrap;
    }
    
    .cancel-upload {
      width: 24px;
      height: 24px;
    }
    
    .cancel-upload mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .reply-preview {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-left: 3px solid #2196f3;
      border-radius: 0 8px 8px 0;
    }
    
    .reply-content {
      flex: 1;
      min-width: 0;
    }
    
    .reply-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #2196f3;
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .reply-header mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .reply-message {
      font-size: 13px;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .cancel-reply {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    
    .cancel-reply mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .composer-main {
      display: flex;
      align-items: flex-end;
      gap: 12px;
    }
    
    .attachment-button {
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    
    .message-input-container {
      flex: 1;
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }
    
    .message-field {
      flex: 1;
    }
    
    .message-field .mat-mdc-form-field-wrapper {
      padding-bottom: 0;
    }
    
    .message-textarea {
      resize: none;
      min-height: 20px;
      max-height: 120px;
      overflow-y: auto;
      line-height: 1.4;
    }
    
    .emoji-button {
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    
    .send-button {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }
    
    .sending-icon {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .emoji-picker {
      position: absolute;
      bottom: 100%;
      right: 60px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      width: 280px;
      max-height: 200px;
    }
    
    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 4px;
      padding: 12px;
      max-height: 150px;
      overflow-y: auto;
    }
    
    .emoji-item {
      width: 28px;
      height: 28px;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: background-color 0.2s;
    }
    
    .emoji-item:hover {
      background: #f0f0f0;
    }
    
    .emoji-picker-footer {
      padding: 8px 12px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .composer-container {
        padding: 12px;
      }
      
      .composer-main {
        gap: 8px;
      }
      
      .send-button {
        width: 40px;
        height: 40px;
      }
      
      .emoji-picker {
        right: 48px;
        width: 240px;
      }
      
      .emoji-grid {
        grid-template-columns: repeat(6, 1fr);
      }
    }
    
    @media (max-width: 480px) {
      .attachment-button {
        display: none;
      }
      
      .emoji-picker {
        right: 8px;
        left: 8px;
        width: auto;
      }
    }
  `]
})
export class ComposerComponent implements OnInit, OnDestroy {
  @Input() conversation: Conversation | null = null;
  @Input() replyingTo: Message | null = null;
  @Output() messageSent = new EventEmitter<Message>();
  @Output() replyCancel = new EventEmitter<void>();
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  messageText = '';
  sending = false;
  showEmojiPicker = false;
  uploadProgress = 0;
  fileAccept = '*/*';
  
  commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
    '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
    '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
    '👍', '👎', '👌', '🤞', '✌️', '🤟', '🤘', '👏',
    '🙌', '👐', '🤲', '🤝', '🙏', '❤️', '🧡', '💛'
  ];
  
  private destroy$ = new Subject<void>();
  private typingTimeout: any;
  private isTyping = false;

  constructor(
    private chatApiService: ChatApiService,
    private typingService: TypingService
  ) {}

  ngOnInit(): void {
    // Component initialization
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearTypingTimeout();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onInput(): void {
    this.adjustTextareaHeight();
    this.handleTyping();
  }

  onFocus(): void {
    this.showEmojiPicker = false;
  }

  onBlur(): void {
    this.stopTyping();
  }

  private adjustTextareaHeight(): void {
    if (this.messageInput) {
      const textarea = this.messageInput.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }

  private handleTyping(): void {
    if (!this.conversation) return;

    if (!this.isTyping && this.messageText.trim()) {
      this.isTyping = true;
      this.typingService.startTyping(this.conversation.id);
    }

    this.clearTypingTimeout();
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 3000);
  }

  private stopTyping(): void {
    if (this.isTyping && this.conversation) {
      this.isTyping = false;
      this.typingService.stopTyping(this.conversation.id);
    }
    this.clearTypingTimeout();
  }

  private clearTypingTimeout(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  canSend(): boolean {
    return this.messageText.trim().length > 0 && !this.sending;
  }

  sendMessage(): void {
    if (!this.canSend() || !this.conversation) {
      return;
    }

    const messageData: SendMessageRequest = {
      conversation_id: this.conversation.id,
      body: this.messageText.trim(),
      type: 'text' as const
    };

    this.sending = true;
    this.stopTyping();

    this.chatApiService.sendMessage(messageData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (message) => {
        this.messageSent.emit(message);
        this.messageText = '';
        this.sending = false;
        this.cancelReply();
        this.adjustTextareaHeight();
        
        // Focus back to input
        setTimeout(() => {
          if (this.messageInput) {
            this.messageInput.nativeElement.focus();
          }
        });
      },
      error: (error: any) => {
        console.error('Error sending message:', error);
        this.sending = false;
      }
    });
  }

  selectFile(type: 'image' | 'document' | 'any'): void {
    switch (type) {
      case 'image':
        this.fileAccept = 'image/*';
        break;
      case 'document':
        this.fileAccept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
        break;
      default:
        this.fileAccept = '*/*';
    }
    
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.uploadFile(files[i]);
      }
    }
    
    // Reset input
    input.value = '';
  }

  private uploadFile(file: File): void {
    if (!this.conversation) return;

    this.uploadProgress = 0;
    
    const messageData: SendMessageRequest = {
       conversation_id: this.conversation.id,
       body: file.name,
       type: 'file' as const,
       file: file
     };
    
    this.chatApiService.sendMessage(messageData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (message: Message) => {
        this.uploadProgress = 0;
        this.messageSent.emit(message);
      },
      error: (error: any) => {
        console.error('Error uploading file:', error);
        this.uploadProgress = 0;
      }
    });
  }

  cancelUpload(): void {
    // Implement upload cancellation logic
    this.uploadProgress = 0;
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  insertEmoji(emoji: string): void {
    const textarea = this.messageInput.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const textBefore = this.messageText.substring(0, start);
    const textAfter = this.messageText.substring(end);
    
    this.messageText = textBefore + emoji + textAfter;
    
    // Set cursor position after emoji
    setTimeout(() => {
      const newPosition = start + emoji.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    });
    
    this.adjustTextareaHeight();
  }

  cancelReply(): void {
    this.replyCancel.emit();
  }

  getReplyPreview(message: Message): string {
    if (message.type === 'file') {
      return `📎 ${message.file_name || 'Arquivo'}`;
    }
    return message.body || 'Mensagem';
  }
}