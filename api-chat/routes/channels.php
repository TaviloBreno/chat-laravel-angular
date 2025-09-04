<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Conversation;
use App\Models\User;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// Canal privado para conversas - apenas usuários da conversa podem ouvir
Broadcast::channel('private-conversation.{conversationId}', function (User $user, int $conversationId) {
    $conversation = Conversation::find($conversationId);
    
    if (!$conversation) {
        return false;
    }
    
    // Verifica se o usuário é participante da conversa
    return $conversation->users()->where('user_id', $user->id)->exists();
});

// Canal presence para conversas - mostra usuários online e typing
Broadcast::channel('presence-conversation.{conversationId}', function (User $user, int $conversationId) {
    $conversation = Conversation::find($conversationId);
    
    if (!$conversation) {
        return false;
    }
    
    // Verifica se o usuário é participante da conversa
    if ($conversation->users()->where('user_id', $user->id)->exists()) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar_url' => $user->avatar_url,
            'status_online' => $user->status_online,
        ];
    }
    
    return false;
});

// Canal privado para usuário - notificações pessoais
Broadcast::channel('private-user.{userId}', function (User $user, int $userId) {
    return $user->id === $userId;
});