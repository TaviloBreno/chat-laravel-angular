<?php

namespace App\Jobs;

use App\Models\Message;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

class ProcessNotifications implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $eventType;
    public $data;

    /**
     * Create a new job instance.
     */
    public function __construct(string $eventType, array $data)
    {
        $this->eventType = $eventType;
        $this->data = $data;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            switch ($this->eventType) {
                case 'message.sent':
                    $this->handleMessageNotification();
                    break;
                case 'conversation.created':
                    $this->handleConversationNotification();
                    break;
                case 'participants.updated':
                    $this->handleParticipantsNotification();
                    break;
            }
        } catch (\Exception $e) {
            Log::error('Erro ao processar notificações', [
                'event_type' => $this->eventType,
                'data' => $this->data,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    private function handleMessageNotification(): void
    {
        $message = Message::with(['user', 'conversation.users'])->find($this->data['message_id']);
        
        if (!$message) {
            return;
        }

        $sender = $message->user;
        $conversation = $message->conversation;
        
        // Obter participantes exceto o remetente
        $recipients = $conversation->users->where('id', '!=', $sender->id);
        
        foreach ($recipients as $recipient) {
            // Verificar se o usuário está online
            if (!$this->isUserOnline($recipient->id)) {
                // Enviar notificação push
                $this->sendPushNotification($recipient, [
                    'title' => $sender->name,
                    'body' => $this->truncateMessage($message->content),
                    'data' => [
                        'conversation_id' => $conversation->id,
                        'message_id' => $message->id,
                        'type' => 'new_message'
                    ]
                ]);
                
                // Enviar email se configurado
                if ($recipient->email_notifications_enabled) {
                    $this->sendEmailNotification($recipient, $message);
                }
            }
        }
    }

    private function handleConversationNotification(): void
    {
        $conversation = Conversation::with(['owner', 'users'])->find($this->data['conversation_id']);
        
        if (!$conversation) {
            return;
        }

        $owner = $conversation->owner;
        $participants = $conversation->users->where('id', '!=', $owner->id);
        
        foreach ($participants as $participant) {
            $this->sendPushNotification($participant, [
                'title' => 'Nova Conversa',
                'body' => $owner->name . ' adicionou você a uma nova conversa: ' . $conversation->title,
                'data' => [
                    'conversation_id' => $conversation->id,
                    'type' => 'new_conversation'
                ]
            ]);
        }
    }

    private function handleParticipantsNotification(): void
    {
        $conversation = Conversation::with('users')->find($this->data['conversation_id']);
        $user = User::find($this->data['user_id']);
        $action = $this->data['action'];
        
        if (!$conversation || !$user) {
            return;
        }

        $participants = $conversation->users->where('id', '!=', $user->id);
        
        $message = $action === 'added' 
            ? $user->name . ' foi adicionado à conversa'
            : $user->name . ' saiu da conversa';
            
        foreach ($participants as $participant) {
            $this->sendPushNotification($participant, [
                'title' => $conversation->title,
                'body' => $message,
                'data' => [
                    'conversation_id' => $conversation->id,
                    'type' => 'participants_updated'
                ]
            ]);
        }
    }

    private function isUserOnline(int $userId): bool
    {
        // Implementar lógica para verificar se usuário está online
        // Pode usar Redis, cache, ou tabela de sessões
        return false; // Por enquanto, sempre considera offline
    }

    private function sendPushNotification(User $user, array $data): void
    {
        // Implementar envio de notificação push
        // Pode usar Firebase Cloud Messaging, Pusher Beams, etc.
        Log::info('Push notification enviada', [
            'user_id' => $user->id,
            'data' => $data
        ]);
    }

    private function sendEmailNotification(User $user, Message $message): void
    {
        // Implementar envio de email
        // Pode usar Mailable classes do Laravel
        Log::info('Email notification enviada', [
            'user_id' => $user->id,
            'message_id' => $message->id
        ]);
    }

    private function truncateMessage(string $content, int $length = 100): string
    {
        return strlen($content) > $length 
            ? substr($content, 0, $length) . '...'
            : $content;
    }
}
