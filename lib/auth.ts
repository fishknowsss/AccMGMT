export type PinCheck = { ok: true } | { ok: false; status: number; reason: string };

export function verifyOperatorPin(request: Request, expectedPin?: string): PinCheck {
  if (!expectedPin) {
    return { ok: false, status: 500, reason: '未配置操作口令' };
  }

  const actualPin = request.headers.get('x-operator-pin')?.trim();

  if (!actualPin || actualPin !== expectedPin) {
    return { ok: false, status: 401, reason: '操作口令不正确' };
  }

  return { ok: true };
}
