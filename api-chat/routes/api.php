<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\MessageController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    // Broadcasting authentication endpoint
    Route::post('/broadcasting/auth', function (Request $request) {
        return response()->json([
            'auth' => auth()->user()->createToken('broadcasting')->plainTextToken
        ]);
    });
    
    // Conversation routes
    Route::apiResource('conversations', ConversationController::class);
    Route::post('/conversations/{conversation}/users', [ConversationController::class, 'addUser']);
    Route::delete('/conversations/{conversation}/users', [ConversationController::class, 'removeUser']);
    
    // Message routes
    Route::get('/conversations/{conversation}/messages', [MessageController::class, 'index']);
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);
    Route::get('/messages/{message}', [MessageController::class, 'show']);
    Route::put('/messages/{message}', [MessageController::class, 'update']);
    Route::delete('/messages/{message}', [MessageController::class, 'destroy']);
    Route::post('/messages/{message}/read', [MessageController::class, 'markAsRead']);
    Route::post('/conversations/{conversation}/messages/read-all', [MessageController::class, 'markAllAsRead']);
});