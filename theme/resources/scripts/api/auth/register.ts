import http from '@/api/http';
import { LoginResponse } from '@/api/auth/login';

export interface RegisterData {
    username: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    nameFirst?: string;
    nameLast?: string;
    terms?: boolean;
    recaptchaData?: string | null;
}

export default ({
    username,
    email,
    password,
    passwordConfirmation,
    nameFirst,
    nameLast,
    terms,
    recaptchaData,
}: RegisterData): Promise<LoginResponse> => {
    return new Promise((resolve, reject) => {
        http.get('/sanctum/csrf-cookie')
            .then(() =>
                http.post('/auth/register', {
                    username,
                    email,
                    password,
                    password_confirmation: passwordConfirmation,
                    name_first: nameFirst,
                    name_last: nameLast,
                    terms,
                    'g-recaptcha-response': recaptchaData,
                })
            )
            .then((response) => {
                if (!(response.data instanceof Object)) {
                    return reject(new Error('An error occurred while processing the registration request.'));
                }

                return resolve({
                    complete: response.data.data.complete,
                    intended: response.data.data.intended || undefined,
                });
            })
            .catch(reject);
    });
};
