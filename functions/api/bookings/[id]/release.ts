import { json } from '../../../_lib/http';
import { createRepository } from '../../../_lib/repository';
import type { Env } from '../../../_lib/env';

export const onRequestPost: PagesFunction<Env> = async ({ env, params }) => {
  const booking = await createRepository(env.DB).releaseBooking(String(params.id), new Date().toISOString());
  if (!booking) {
    return json({ message: '当前没有可释放的占用' }, { status: 409 });
  }

  return json({ booking });
};
