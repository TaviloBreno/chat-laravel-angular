<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UploadFileRequest extends FormRequest
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
            'file' => 'required|file|max:10240', // 10MB max
            'type' => 'sometimes|string|in:image,document,audio,video,other',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'file.required' => 'Um arquivo deve ser enviado.',
            'file.file' => 'O arquivo enviado é inválido.',
            'file.max' => 'O arquivo não pode ser maior que 10MB.',
            'type.in' => 'Tipo de arquivo inválido.',
        ];
    }
}
