import { Button } from '@/components/ui/button';
import { salir } from '@/lib/acciones';

export function SalirButton() {
  return (
    <form action={salir}>
      <Button variant="ghost" size="sm" title="Cerrar sesión">
        Salir
      </Button>
    </form>
  );
}
