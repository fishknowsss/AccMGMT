import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from './ui/button';
import { Field, Input } from './ui/field';

type GateState = 'checking' | 'locked' | 'ready';

export function SiteGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/session')
      .then((response) => {
        if (!cancelled) {
          setState(response.ok ? 'ready' : 'locked');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState('locked');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setError('口令不正确');
        return;
      }

      setState('ready');
      setPassword('');
    } catch {
      setError('连接失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  }

  if (state === 'ready') {
    return children;
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-[#F6F7F9] px-4 py-8 text-[#202329]">
      <form className="w-full max-w-[420px] rounded-2xl border border-[#DDE3EA] bg-[#FCFDFE] p-6 shadow-[0_18px_46px_rgba(52,64,84,0.08)]" onSubmit={handleSubmit}>
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#1C2430] text-sm font-semibold text-white">AM</div>
          <div>
            <h1 className="text-[24px] font-semibold leading-tight text-[#15171B]">AccMGMT</h1>
            <div className="mt-1 font-mono text-sm tabular-nums text-[#667085]">app.pixverse.ai</div>
          </div>
        </div>

        <Field label="访问口令">
          <Input
            autoFocus
            autoComplete="current-password"
            disabled={state === 'checking' || submitting}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </Field>

        {error ? <div className="mt-3 rounded-lg border border-[#E5C1BD] bg-[#FCEDEA] px-3 py-2 text-sm text-[#8D3F36]">{error}</div> : null}

        <Button className="mt-5 w-full" disabled={state === 'checking' || submitting || !password} type="submit" variant="primary">
          {state === 'checking' ? '检查中' : '进入'}
        </Button>
      </form>
    </div>
  );
}
