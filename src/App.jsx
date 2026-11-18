import { useEffect, useMemo, useRef, useState } from 'react';

const columns = [
  { letter: 'B', start: 1, end: 15 },
  { letter: 'I', start: 16, end: 30 },
  { letter: 'N', start: 31, end: 45 },
  { letter: 'G', start: 46, end: 60 },
  { letter: 'O', start: 61, end: 75 },
];

const numberLetter = (number) => columns.find(({ start, end }) => number >= start && number <= end)?.letter ?? '';
const pad = (value) => String(value).padStart(2, '0');
const suggestedSupportAmounts = ['10', '20', '50'];

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Erro inesperado.');
    error.status = response.status;
    if (response.status === 401 && !url.startsWith('/api/auth/')) {
      window.dispatchEvent(new Event('bingo:unauthorized'));
    }
    throw error;
  }
  return data;
}

function Icon({ name, size = 20 }) {
  const paths = {
    plus: <><path d="M12 5v14M5 12h14" /></>,
    undo: <><path d="M9 7 4 12l5 5" /><path d="M4 12h9a6 6 0 1 1 0 12h-2" /></>,
    new: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
    camera: <><path d="M14.5 4H9.5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4Z" /><circle cx="12" cy="13" r="3" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Logo() {
  return (
    <div className="brand" aria-label="SHOW DE PREMIOS">
      <div className="brand-word">SHOW DE <span>PREMIOS</span></div>
      <div className="brand-line" />
    </div>
  );
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ parishName: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const registering = mode === 'register';

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const account = await api(`/api/auth/${registering ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      await onAuthenticated(account);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-intro">
          <Logo />
          <p className="support-kicker">BINGO DA COMUNIDADE</p>
          <h1>Um painel para cada paróquia</h1>
          <p>Cada comunidade mantém seus próprios jogos, chamadas e histórico em segurança.</p>
          <div className="auth-benefits">
            <span><b>01</b> Cadastro rápido</span>
            <span><b>02</b> Histórico separado</span>
            <span><b>03</b> Acesso persistente</span>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-tabs" role="tablist" aria-label="Acesso à conta">
            <button className={!registering ? 'active' : ''} onClick={() => changeMode('login')} type="button">Entrar</button>
            <button className={registering ? 'active' : ''} onClick={() => changeMode('register')} type="button">Criar conta</button>
          </div>
          <h2>{registering ? 'Cadastre sua paróquia' : 'Acesse sua paróquia'}</h2>
          <p>{registering ? 'Leva menos de um minuto.' : 'Continue de onde sua comunidade parou.'}</p>

          <form onSubmit={submit}>
            {registering && (
              <>
                <label>
                  <span>Nome da paróquia</span>
                  <input name="parishName" value={form.parishName} onChange={updateField} autoComplete="organization" required minLength="3" placeholder="Ex.: Paróquia São José" />
                </label>
                <label>
                  <span>Seu nome</span>
                  <input name="name" value={form.name} onChange={updateField} autoComplete="name" required minLength="2" placeholder="Responsável pelo bingo" />
                </label>
              </>
            )}
            <label>
              <span>E-mail</span>
              <input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required placeholder="voce@paroquia.org.br" />
            </label>
            <label>
              <span>Senha</span>
              <input name="password" type="password" value={form.password} onChange={updateField} autoComplete={registering ? 'new-password' : 'current-password'} required minLength="8" placeholder="Mínimo de 8 caracteres" />
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? 'Aguarde…' : registering ? 'Criar conta da paróquia' : 'Entrar no painel'}
            </button>
          </form>
          <small>Ao entrar, sua sessão permanece ativa neste dispositivo por 30 dias.</small>
        </div>
      </section>
    </main>
  );
}

function Ball({ number, small = false }) {
  return (
    <div className={small ? 'mini-ball' : 'bingo-ball'} aria-label={number ? `${numberLetter(number)} ${number}` : 'Aguardando chamada'}>
      {number ? <><strong>{numberLetter(number)}</strong><span>{number}</span></> : <span className="waiting">—</span>}
    </div>
  );
}

function HistoryModal({ onClose, onSelect }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/games').then(setGames).finally(() => setLoading(false));
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <header>
          <div>
            <p className="eyebrow">ARQUIVO</p>
            <h2 id="history-title">Histórico de jogos</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar histórico"><Icon name="close" /></button>
        </header>
        <div className="history-list">
          {loading && <p className="empty-state">Carregando jogos…</p>}
          {!loading && games.length === 0 && <p className="empty-state">Nenhum jogo gravado.</p>}
          {games.map((game) => (
            <button key={game.id} className="history-row" onClick={() => onSelect(game.id)}>
              <span className={`status-dot ${game.status}`} />
              <span className="history-main">
                <strong>Jogo #{game.id}</strong>
                <small>{new Date(game.started_at).toLocaleString('pt-BR')}</small>
              </span>
              <span className="history-count"><strong>{game.call_count}</strong><small>chamadas</small></span>
              <span className="chevron">›</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function App() {
  const [account, setAccount] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [game, setGame] = useState(null);
  const [displayGame, setDisplayGame] = useState(null);
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');
  const [initialError, setInitialError] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [fullscreenPrompt, setFullscreenPrompt] = useState(false);
  const [supportAmount, setSupportAmount] = useState('20');
  const [pixQrAvailable, setPixQrAvailable] = useState(true);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const shown = displayGame || game;
  const calls = shown?.calls ?? [];
  const calledNumbers = useMemo(() => new Set(calls.map((call) => call.number)), [calls]);
  const current = calls.at(-1)?.number;
  const previous = calls.at(-2)?.number;
  const isArchive = Boolean(displayGame);

  useEffect(() => {
    async function initialize() {
      try {
        const currentAccount = await api('/api/auth/me');
        setAccount(currentAccount);
        setGame(await api('/api/games/current'));
      } catch (error) {
        if (error.status === 401) setAccount(null);
        else setInitialError(error.message);
      } finally {
        setAuthChecked(true);
      }
    }

    initialize();
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setAccount(null);
      setGame(null);
      setDisplayGame(null);
      setHistoryOpen(false);
    };
    window.addEventListener('bingo:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('bingo:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setFullscreenPrompt(!document.fullscreenElement);

    async function openFullscreen() {
      if (document.fullscreenElement) return;
      try {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      } catch {
        setFullscreenPrompt(true);
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    openFullscreen();
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      setFullscreenPrompt(false);
    } catch {
      setMessage('O navegador não permitiu abrir o painel em tela cheia.');
    }
  }

  async function handleAuthenticated(nextAccount) {
    setAccount(nextAccount);
    setInitialError('');
    setGame(await api('/api/games/current'));
  }

  async function logout() {
    setBusy(true);
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setCameraOn(false);
      setAccount(null);
      setGame(null);
      setDisplayGame(null);
      setHistoryOpen(false);
      setBusy(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    }
  }

  async function refresh() {
    const fresh = await api('/api/games/current');
    setGame(fresh);
    setDisplayGame(null);
  }

  async function addCall(number) {
    if (!game || busy || isArchive) return;
    const parsed = Number(number);
    setBusy(true);
    setMessage('');
    try {
      await api(`/api/games/${game.id}/calls`, {
        method: 'POST',
        body: JSON.stringify({ number: parsed }),
      });
      setValue('');
      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!game || busy || !game.calls.length) return;
    setBusy(true);
    setMessage('');
    try {
      await api(`/api/games/${game.id}/calls/last`, { method: 'DELETE' });
      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function newGame() {
    if (game?.calls.length && !window.confirm('Encerrar este jogo e começar um novo?')) return;
    setBusy(true);
    setMessage('');
    try {
      const created = await api('/api/games', { method: 'POST' });
      setGame(created);
      setDisplayGame(null);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function openArchivedGame(id) {
    try {
      const selected = await api(`/api/games/${id}`);
      setDisplayGame(selected.id === game.id ? null : selected);
      setHistoryOpen(false);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function toggleCamera() {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
      setMessage('');
    } catch {
      setMessage('Não foi possível acessar a câmera. Verifique a permissão do navegador.');
    }
  }

  if (!authChecked) {
    return (
      <main className="loading-screen">
        {!initialError && <div className="spinner" />}
        <p>{initialError || 'Verificando seu acesso…'}</p>
        {initialError && (
          <button className="primary-button" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        )}
      </main>
    );
  }

  if (!account && initialError) {
    return (
      <main className="loading-screen">
        <p>{initialError}</p>
        <button className="primary-button" onClick={() => window.location.reload()}>Tentar novamente</button>
      </main>
    );
  }

  if (!account) return <AuthScreen onAuthenticated={handleAuthenticated} />;

  if (!shown) {
    return (
      <main className="loading-screen">
        {!initialError && <div className="spinner" />}
        <p>{initialError || 'Preparando o painel…'}</p>
        {initialError && <button className="primary-button" onClick={() => window.location.reload()}>Tentar novamente</button>}
      </main>
    );
  }

  return (
    <main className="app-shell">
      {fullscreenPrompt && (
        <div className="fullscreen-gate" role="dialog" aria-modal="true" aria-labelledby="fullscreen-title">
          <div className="fullscreen-gate-card">
            <section className="support-copy">
              <Logo />
              <p className="support-kicker">BINGO BENEFICENTE</p>
              <h2 id="fullscreen-title">Apoie o projeto</h2>
              <p className="support-message">
                Este sistema apoia os bingos beneficentes das comunidades. Sua contribuição ajuda a manter a plataforma funcionando.
              </p>

              <div className="support-amounts" aria-label="Escolha um valor para contribuir">
                {suggestedSupportAmounts.map((amount) => (
                  <button
                    type="button"
                    className={supportAmount === amount ? 'selected' : ''}
                    aria-pressed={supportAmount === amount}
                    onClick={() => setSupportAmount(amount)}
                    key={amount}
                  >
                    R$ {amount}
                  </button>
                ))}
                <label className={!suggestedSupportAmounts.includes(supportAmount) ? 'selected' : ''}>
                  <span>R$</span>
                  <input
                    aria-label="Outro valor de contribuição"
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="1"
                    placeholder="Outro valor"
                    value={suggestedSupportAmounts.includes(supportAmount) ? '' : supportAmount}
                    onChange={(event) => setSupportAmount(event.target.value)}
                  />
                </label>
              </div>
              <small>Escolha uma sugestão ou informe qualquer valor.</small>
            </section>

            <section className="pix-support">
              <div className="pix-qr-frame">
                {pixQrAvailable ? (
                  <img
                    src="/pix-fostertech.jpg"
                    alt="QR Code PIX da FosterTech"
                    onError={() => setPixQrAvailable(false)}
                  />
                ) : (
                  <div className="pix-qr-missing">
                    <strong>QR PIX</strong>
                    <span>Salve a imagem enviada como<br /><b>public/pix-fostertech.png</b></span>
                  </div>
                )}
              </div>
              <strong className="pix-title">PIX FosterTech</strong>
              <span className="pix-hint">Escaneie o QR Code no aplicativo do seu banco.</span>
              <button className="primary-button" onClick={enterFullscreen}>Abrir painel em tela cheia</button>
            </section>
          </div>
        </div>
      )}
      <aside className="control-panel">
        <Logo />

        <div className="account-card">
          <div>
            <span>PARÓQUIA</span>
            <strong>{account.parish.name}</strong>
            <small>{account.user.name}</small>
          </div>
          <button type="button" onClick={logout} disabled={busy}>Sair</button>
        </div>

        <div className="score-row">
          <div className="score-card"><span>CHAMADAS</span><strong>{pad(calls.length)}</strong></div>
          <div className="score-card"><span>ANTERIOR</span><div className="score-number">{previous ? <><b>{numberLetter(previous)}</b>{previous}</> : '—'}</div></div>
        </div>

        {isArchive && (
          <button className="archive-banner" onClick={() => setDisplayGame(null)}>
            Vendo jogo #{shown.id} · voltar ao atual
          </button>
        )}

        <section className="control-card">
          <h2>Adicionar chamada</h2>
          <form onSubmit={(event) => { event.preventDefault(); addCall(value); }}>
            <input
              aria-label="Número da chamada"
              type="number"
              inputMode="numeric"
              min="1"
              max="75"
              placeholder="1–75"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={isArchive}
            />
            <button className="primary-button" type="submit" disabled={busy || isArchive || !value}>
              <Icon name="plus" /> Adicionar
            </button>
          </form>
          <p className="hint">Digite um número de 1 a 75</p>
          {message && <p className="message" role="alert">{message}</p>}
          <button className="secondary-button" onClick={undo} disabled={busy || isArchive || !calls.length}>
            <Icon name="undo" /> Desfazer última
          </button>
          <div className="card-divider" />
          <button className="text-button" onClick={newGame} disabled={busy}>
            <Icon name="new" /> Novo jogo
          </button>
          <button className="text-button muted" onClick={() => setHistoryOpen(true)}>
            <Icon name="history" /> Ver histórico
          </button>
        </section>

        <section className="parish-logo-card" aria-label="Paróquia Nossa Senhora da Conceição">
          <img src="/FESTA_PADROEIRA.png" alt="Festa Padroeira" />
        </section>
      </aside>

      <section className="main-stage">
        <section className="number-board" aria-label="Cartela de números chamados">
          {columns.map(({ letter, start, end }) => (
            <div className="number-row" key={letter}>
              <div className="letter-cell">{letter}</div>
              <div className="numbers">
                {Array.from({ length: 15 }, (_, index) => start + index).map((number) => (
                  <button
                    type="button"
                    aria-label={`Marcar ${letter} ${number}`}
                    aria-pressed={calledNumbers.has(number)}
                    disabled={calledNumbers.has(number) || busy || isArchive}
                    className={calledNumbers.has(number) ? 'called' : ''}
                    onClick={() => addCall(number)}
                    key={number}
                  >
                    {number}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="stage-lower">
          <section className="current-card">
            <p className="eyebrow">CHAMADA ATUAL</p>
            <div className="ball-scene"><Ball number={current} /></div>
            <div className="current-caption">
              {current ? <><span>{numberLetter(current)}</span> número <strong>{current}</strong></> : 'Faça a primeira chamada'}
            </div>
            <div className="partners" aria-label="Realização e apoio">
              <img src="/LogoHorizontalMatriz.png" height="60px" alt="Festa Padroeira" />
              <div className="partner-divider" aria-hidden="true" />
              <div className="fostertech-brand">
                <small>TECNOLOGIA POR</small>
                <img src="/fostertech-logo.jpg" alt="FosterTech" />
              </div>
            </div>
          </section>

          <section className="camera-card">
            <header>
              <div><span className="camera-icon"><Icon name="camera" /></span><strong>Câmera do sorteio</strong></div>
              <div className={`camera-status ${cameraOn ? 'on' : ''}`}><i />{cameraOn ? 'Câmera ativa' : 'Câmera desligada'}</div>
              <button className="camera-button" onClick={toggleCamera} aria-label={cameraOn ? 'Desligar câmera' : 'Ligar câmera'}><Icon name="camera" /></button>
            </header>
            <div className="video-frame">
              <video ref={videoRef} autoPlay muted playsInline className={cameraOn ? 'visible' : ''} />
              {!cameraOn && (
                <div className="camera-placeholder">
                  <div className="camera-orbit"><Icon name="camera" size={40} /></div>
                  <h3>Mostre o sorteio ao vivo</h3>
                  <p>Ative a câmera para exibir o globo e as bolas.</p>
                  <button onClick={toggleCamera}><Icon name="camera" /> Ativar câmera</button>
                </div>
              )}
              {cameraOn && current && <div className="video-call"><Ball number={current} small /><strong>{numberLetter(current)} {current}</strong></div>}
            </div>
          </section>
        </div>
      </section>

      {historyOpen && <HistoryModal onClose={() => setHistoryOpen(false)} onSelect={openArchivedGame} />}
    </main>
  );
}

export default App;
