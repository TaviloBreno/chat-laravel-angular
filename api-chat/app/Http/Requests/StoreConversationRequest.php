<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreConversationRequest extends FormRequest
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
            'type' => 'required|in:private,group',
            'title' => 'required_if:type,group|string|max:255',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id|different:' . Auth::id(),
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'type.required' => 'O tipo da conversa é obrigatório.',
            'type.in' => 'O tipo deve ser private ou group.',
            'title.required_if' => 'O título é obrigatório para conversas em grupo.',
            'user_ids.required' => 'Pelo menos um usuário deve ser selecionado.',
            'user_ids.*.exists' => 'Um ou mais usuários selecionados não existem.',
            'user_ids.*.different' => 'Você não pode adicionar a si mesmo à conversa.',
        ];
    }
}
