<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class SearchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::check();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'query' => 'required|string|min:2|max:255',
            'type' => 'sometimes|string|in:messages,users,all',
            'conversation_id' => 'sometimes|exists:conversations,id',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'query.required' => 'O termo de busca é obrigatório.',
            'query.min' => 'O termo de busca deve ter pelo menos 2 caracteres.',
            'query.max' => 'O termo de busca não pode ter mais de 255 caracteres.',
            'type.in' => 'Tipo de busca inválido. Use: messages, users ou all.',
            'conversation_id.exists' => 'Conversa não encontrada.',
        ];
    }
}
