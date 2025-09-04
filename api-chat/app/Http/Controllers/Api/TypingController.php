<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TypingRequest;
use App\Events\TypingStarted;
use App\Events\TypingStopped;
use App\Models\Conversation;
use Illuminate\Support\Facades\Auth;

class TypingController extends Controller
{
    /**
     * Handle typing indicator
     */
    public function typing(TypingRequest $request, Conversation $conversation)
    {
        $user = Auth::user();

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
