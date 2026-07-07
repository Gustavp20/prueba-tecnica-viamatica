import { useState } from 'react';
import { LogIn, AlertCircle, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../services/api';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados Globales (Login y Recuperación)
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para la Recuperación de Contraseña
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  // --- FUNCIÓN DE LOGIN AL BACKEND ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identificador: username, password: password }),
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!recoveryEmail.includes('@')) {
        throw new Error("Por favor, ingresa un correo electrónico válido.");
      }

      await apiFetch('/auth/recover', {
        method: 'POST',
        body: JSON.stringify({ email: recoveryEmail }),
      });

      setRecoverySuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isRecovering) {
    return (
      <div className="login-container">
        <div className="background-decoration">
          <div className="gradient-sphere sphere-1"></div>
          <div className="gradient-sphere sphere-2"></div>
        </div>
        <div className="login-card">
          <button 
            onClick={() => { setIsRecovering(false); setError(''); setRecoverySuccess(false); }}
            style={{background:'transparent', border:'none', color:'var(--text-secondary)', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', marginBottom:'20px'}}
          >
            <ArrowLeft size={16} /> Volver al Login
          </button>
          
          <div className="login-header">
            <div className="logo-icon" style={{ background: 'linear-gradient(135deg, var(--color-warning), #f97316)' }}>
              <KeyRound size={32} strokeWidth={1.5} />
            </div>
            <h1>Recuperar Acceso</h1>
            <p className="subtitle">Te enviaremos instrucciones a tu correo</p>
          </div>

          {recoverySuccess ? (
            <div style={{textAlign: 'center', animation: 'fadeInUp 0.5s ease'}}>
              <CheckCircle2 size={48} color="var(--color-success)" style={{margin:'0 auto 15px'}} />
              <h3 style={{marginBottom: '10px', color: 'var(--text-primary)'}}>¡Correo Enviado!</h3>
              <p style={{color: 'var(--text-secondary)', fontSize:'14px', lineHeight:'1.5'}}>
                Si el correo <strong>{recoveryEmail}</strong> está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRecoverySubmit} className="login-form" noValidate>
              <div className="input-group">
                <label htmlFor="recoveryEmail">Correo Electrónico Registrado</label>
                <input
                  type="email"
                  id="recoveryEmail"
                  value={recoveryEmail}
                  onChange={(e) => { setRecoveryEmail(e.target.value); if (error) setError(''); }}
                  placeholder="ejemplo@mail.com"
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="error-message" role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="login-button" disabled={isLoading || !recoveryEmail}>
                {isLoading ? (
                  <><span className="loader"></span> Procesando...</>
                ) : (
                  <><KeyRound size={18} /> Enviar enlace de recuperación</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="background-decoration">
        <div className="gradient-sphere sphere-1"></div>
        <div className="gradient-sphere sphere-2"></div>
      </div>
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">
            <LogIn size={32} strokeWidth={1.5} />
          </div>
          <h1>Iniciar Sesión</h1>
          <p className="subtitle">Accede a tu dashboard personal</p>
        </div>
        <form onSubmit={handleLoginSubmit} className="login-form" noValidate>
          <div className="input-group">
            <label htmlFor="username">Usuario o Correo</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ingresa tu usuario o correo"
              required
              disabled={isLoading}
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Ingresa tu contraseña"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="show-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={0}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {/* ENLACE PARA RECUPERAR CONTRASEÑA OBLIGATORIO */}
          <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '5px' }}>
            <a href="#" 
               onClick={(e) => { e.preventDefault(); setIsRecovering(true); setError(''); }}
               style={{ fontSize: '13px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '600' }}>
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {error && (
            <div className="error-message" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !username || !password}
          >
            {isLoading ? (
              <>
                <span className="loader"></span>
                Validando...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Ingresar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;