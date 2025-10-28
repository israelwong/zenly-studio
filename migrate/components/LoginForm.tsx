'use client'
import { useEffect, useState } from "react";
import Cookies from 'js-cookie';
import { login, verifyToken } from "@/app/lib/auth";
import { useRouter } from "next/navigation";

const LoginForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [sessionError, setSessionError] = useState("");
    const [errors, setErrors] = useState({ email: "", password: "" });
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const token = Cookies.get('token');

    useEffect(() => {
        const verify = async () => {
            if (token) {
                try {
                    const response = await verifyToken(token);
                    if (response.payload) {
                        router.push('/admin/dashboard');
                    } else {
                        Cookies.remove('token');
                    }
                } catch (error) {
                    console.error('Error verifying token:', error);
                    Cookies.remove('token');
                }
            }
        }
        verify();
    });

    const validate = () => {
        let valid = true;
        const errors = { email: "", password: "" };

        if (!email) {
            errors.email = "El correo electrónico es obligatorio";
            valid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            errors.email = "El correo electrónico no es válido";
            valid = false;
        }

        if (!password) {
            errors.password = "La contraseña es obligatoria";
            valid = false;
        } else if (password.length < 6) {
            errors.password = "La contraseña debe tener al menos 6 caracteres";
            valid = false;
        }

        setErrors(errors);
        return valid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (validate()) {
            try {
                setLoading(true);
                const response = await login(email, password);
                if (response.status) {
                    //redirect to dashboard
                    Cookies.set('token', response.token, { expires: 7 }); // La cookie expira en 7 días
                    router.push('/admin/dashboard');
                }
                else {
                    setSessionError('Credenciales incorrectas');
                    setLoading(false);
                }
            }
            catch (error) {
                console.log(error);
                setSessionError(`Error al iniciar sesión ${error}}`);
                setLoading(false);
            }

        };
    }

    return (
        <div className="flex items-center justify-center min-h-screen">

            <div className="w-full max-w-80 p-8 space-y-6 px-10 rounded shadow-md border border-gray-600">
                <h2 className="text-2xl font-light text-center">
                    Iniciar Sesión
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-200">
                            Correo Electrónico
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`text-black w-full px-3 py-2 mt-1 border rounded ${errors.email ? "border-red-500" : "border-gray-300"
                                }`}
                        />
                        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-200">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`text-black w-full px-3 py-2 mt-1 border rounded ${errors.password ? "border-red-500" : "border-gray-300"
                                }`}
                        />
                        {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                    </div>
                    {sessionError && <p className="text-sm text-red-500">{sessionError}</p>}
                    <button
                        type="submit"
                        className="w-full px-4 py-2 font-bold text-white bg-blue-900 rounded hover:bg-blue-700
                        disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Validando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>

        </div>
    );
};

export default LoginForm;