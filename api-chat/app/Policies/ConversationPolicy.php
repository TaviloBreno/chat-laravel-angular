<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ConversationPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true; // Usuários autenticados podem ver suas conversas
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Conversation $conversation): bool
    {
        return $conversation->users()->where('user_id', $user->id)->exists();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true; // Usuários autenticados podem criar conversas
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Conversation $conversation): bool
    {
        // Apenas admins podem atualizar conversas
        $userRole = $conversation->users()->where('user_id', $user->id)->first();
        $role = $userRole && $userRole->pivot ? ($userRole->pivot->role ?? 'member') : null;
        return $role === 'admin';
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Conversation $conversation): bool
    {
        // Apenas o owner pode deletar a conversa
        return $conversation->owner_id === $user->id;
    }

    /**
     * Determine whether the user can manage participants.
     */
    public function manageParticipants(User $user, Conversation $conversation): bool
    {
        // Apenas admins podem gerenciar participantes
        $userRole = $conversation->users()->where('user_id', $user->id)->first();
        $role = $userRole && $userRole->pivot ? ($userRole->pivot->role ?? 'member') : null;
        return $role === 'admin';
    }

    /**
     * Determine whether the user can send messages.
     */
    public function sendMessage(User $user, Conversation $conversation): bool
    {
        // Usuários que fazem parte da conversa podem enviar mensagens
        return $conversation->users()->where('user_id', $user->id)->exists();
    }

    /**
     * Determine whether the user can send typing indicators.
     */
    public function sendTyping(User $user, Conversation $conversation): bool
    {
        // Usuários que fazem parte da conversa podem enviar indicadores de digitação
        return $conversation->users()->where('user_id', $user->id)->exists();
    }
}
