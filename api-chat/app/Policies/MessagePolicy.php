<?php

namespace App\Policies;

use App\Models\Message;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class MessagePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true; // Usuários autenticados podem ver mensagens das suas conversas
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Message $message): bool
    {
        // Usuário pode ver mensagem se faz parte da conversa
        return $message->conversation->users()->where('user_id', $user->id)->exists();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true; // Será validado no contexto da conversa específica
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Message $message): bool
    {
        // Apenas o autor da mensagem pode editá-la
        return $message->user_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Message $message): bool
    {
        // Autor da mensagem ou admin da conversa podem deletar
        if ($message->user_id === $user->id) {
            return true;
        }
        
        $userRole = $message->conversation->users()->where('user_id', $user->id)->first();
        $role = $userRole && $userRole->pivot ? ($userRole->pivot->role ?? 'member') : null;
        return $role === 'admin';
    }

    /**
     * Determine whether the user can mark message as read.
     */
    public function markAsRead(User $user, Message $message): bool
    {
        // Usuário pode marcar como lida se faz parte da conversa
        return $message->conversation->users()->where('user_id', $user->id)->exists();
    }
}
