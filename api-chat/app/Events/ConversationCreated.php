<?php

namespace App\Events;

use App\Models\Conversation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConversationCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $conversation;

    /**
     * Create a new event instance.
     */
    public function __construct(Conversation $conversation)
    {
        $this->conversation = $conversation;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [];
        
        // Envia para cada participante da conversa
        foreach ($this->conversation->users as $user) {
            $channels[] = new PrivateChannel('private-user.' . $user->id);
        }
        
        return $channels;
    }

    /**
     * Get the data to broadcast.
     *
     * @return array
     */
    public function broadcastWith(): array
    {
        return [
            'conversation' => [
                'id' => $this->conversation->id,
                'type' => $this->conversation->type,
                'title' => $this->conversation->title,
                'owner_id' => $this->conversation->owner_id,
                'created_at' => $this->conversation->created_at,
                'updated_at' => $this->conversation->updated_at,
                'owner' => [
                    'id' => $this->conversation->owner->id,
                    'name' => $this->conversation->owner->name,
                    'avatar_url' => $this->conversation->owner->avatar_url,
                ],
                'users' => $this->conversation->users->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'avatar_url' => $user->avatar_url,
                        'role' => $user->pivot->role,
                    ];
                }),
            ],
        ];
    }

    /**
     * The event's broadcast name.
     *
     * @return string
     */
    public function broadcastAs(): string
    {
        return 'conversation.created';
    }
}
