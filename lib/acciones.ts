'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function salir() {
  (await cookies()).delete('sesion_local');
  redirect('/ingresar');
}
