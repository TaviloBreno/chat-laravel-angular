<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreMessageRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $conversation = $this->route('conversation');
        
        // Verificar se o usuário faz parte da conversa
        return $conversation->users()->where('user_id', Auth::id())->exists();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'body' => 'required|string|max:5000',
            'type' => 'sometimes|string|in:text,image,file,audio,video',
            'meta' => 'sometimes|array',
            'meta.file_url' => 'sometimes|string|url',
            'meta.file_name' => 'sometimes|string|max:255',
            'meta.file_size' => 'sometimes|integer|min:0',
            'meta.file_type' => 'sometimes|string|max:100',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'body.required' => 'O conteúdo da mensagem é obrigatório.',
            'body.string' => 'O conteúdo deve ser um texto.',
            'body.max' => 'A mensagem não pode ter mais de 5000 caracteres.',
            'type.in' => 'Tipo de mensagem inválido.',
            'meta.array' => 'Os metadados devem ser um objeto.',
            'meta.file_url.url' => 'URL do arquivo inválida.',
        ];
    }
}
