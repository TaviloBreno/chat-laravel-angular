<?php

namespace App\Http\Controllers\Api;

use App\Events\TypingStarted;
use App\Events\TypingStopped;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TypingController extends Controller
{
    /**
     * Handle typing indicator
     */
    public function typing(Request $request, Conversation $conversation)
    {
        $user = Auth::user();
        
        // Verificar se o usuário faz parte da conversa
        if (!$conversation->users()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'action' => 'required|in:start,stop',
        ]);

        $action = $request->input('action');
        
        if ($action === 'start') {
            broadcast(new TypingStarted($user, $conversation->id));
            $message = 'Typing started';
        } else {
            broadcast(new TypingStopped($user, $conversation->id));
            $message = 'Typing stopped';
        }
        
        return response()->json([
            'message' => $message,
            'user_id' => $user->id,
            'conversation_id' => $conversation->id,
            'action' => $action,
        ]);
    }
}
