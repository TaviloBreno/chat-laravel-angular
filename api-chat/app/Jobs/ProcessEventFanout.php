<?php

namespace App\Jobs;

use App\Events\MessageSent;
use App\Events\MessageUpdated;
use App\Events\MessageDeleted;
use App\Events\ConversationCreated;
use App\Events\ParticipantsUpdated;
use App\Models\Message;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessEventFanout implements ShouldQueue
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
                    $this->handleMessageSent();
                    break;
                case 'message.updated':
                    $this->handleMessageUpdated();
                    break;
                case 'message.deleted':
                    $this->handleMessageDeleted();
                    break;
                case 'conversation.created':
                    $this->handleConversationCreated();
                    break;
                case 'participants.updated':
                    $this->handleParticipantsUpdated();
                    break;
            }
        } catch (\Exception $e) {
            Log::error('Erro ao processar fanout de evento', [
                'event_type' => $this->eventType,
                'data' => $this->data,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    private function handleMessageSent(): void
    {
        $message = Message::find($this->data['message_id']);
        if ($message) {
            broadcast(new MessageSent($message));
            
            // Disparar job de notificações
            ProcessNotifications::dispatch('message.sent', [
                'message_id' => $message->id,
                'conversation_id' => $message->conversation_id,
                'sender_id' => $message->user_id
            ]);
        }
    }

    private function handleMessageUpdated(): void
    {
        $message = Message::find($this->data['message_id']);
        if ($message) {
            broadcast(new MessageUpdated($message));
        }
    }

    private function handleMessageDeleted(): void
    {
        $message = Message::find($this->data['message_id']);
        if ($message) {
            broadcast(new MessageDeleted($message));
        }
    }

    private function handleConversationCreated(): void
    {
        $conversation = Conversation::find($this->data['conversation_id']);
        if ($conversation) {
            broadcast(new ConversationCreated($conversation));
            
            // Notificar participantes sobre nova conversa
            ProcessNotifications::dispatch('conversation.created', [
                'conversation_id' => $conversation->id,
                'owner_id' => $conversation->owner_id
            ]);
        }
    }

    private function handleParticipantsUpdated(): void
    {
        $conversation = Conversation::find($this->data['conversation_id']);
        $user = User::find($this->data['user_id']);
        $action = $this->data['action'];
        
        if ($conversation && $user) {
            broadcast(new ParticipantsUpdated($conversation, $action, $user));
            
            // Notificar sobre mudança de participantes
            ProcessNotifications::dispatch('participants.updated', [
                'conversation_id' => $conversation->id,
                'user_id' => $user->id,
                'action' => $action
            ]);
        }
    }
}
