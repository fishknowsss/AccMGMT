import { normalizeBookingInput } from '../../../lib/domain';
import { json, readJson } from '../../_lib/http';
import { createRepository } from '../../_lib/repository';
import type { Env } from '../../_lib/env';

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const input = normalizeBookingInput(readBookingBody(await readJson(request)));
  if (!input.ok) {
    return json({ message: input.reason }, { status: 400 });
  }

  try {
    const booking = await createRepository(env.DB).updateFutureBooking(String(params.id), input.value, new Date().toISOString());
    if (!booking) {
      return json({ message: '只能修改尚未开始的预约' }, { status: 409 });
    }

    return json({ booking });
  } catch (error) {
    if (isConflictError(error)) {
      return json({ message: '该时段已被占用' }, { status: 409 });
    }
    throw error;
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const booking = await createRepository(env.DB).cancelFutureBooking(String(params.id), new Date().toISOString());
  if (!booking) {
    return json({ message: '只能取消尚未开始的预约' }, { status: 409 });
  }

  return json({ booking });
};

function readBookingBody(body: unknown) {
  const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  return {
    accountId: stringValue(data.accountId),
    userName: stringValue(data.userName),
    groupName: stringValue(data.groupName),
    projectName: stringValue(data.projectName),
    startAt: stringValue(data.startAt),
    endAt: stringValue(data.endAt),
  };
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isConflictError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('BOOKING_CONFLICT');
}
