import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function SalirButton({ compacto }: { compacto?: boolean }) {
  return (
    <form
      action={async () => {
        'use server';
        (await cookies()).delete('sesion_local');
        redirect('/ingresar');
      }}
    >
      <Button variant="ghost" size="sm" title="Cerrar sesión">
        {compacto ? 'Salir' : 'Salir'}
      </Button>
    </form>
  );
}
