import { useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, HelpCircle, Loader2, Send, Wrench } from 'lucide-react';

interface PartRequestModalProps {
  open: boolean;
  onClose: () => void;
  defaultPartName?: string;
}

export function PartRequestModal({ open, onClose, defaultPartName }: PartRequestModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [motorcycleModel, setMotorcycleModel] = useState('');
  const [partDescription, setPartDescription] = useState(defaultPartName || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/part-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          contactPhone,
          motorcycleModel,
          partDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo registrar la solicitud');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCustomerName('');
        setContactPhone('');
        setMotorcycleModel('');
        setPartDescription('');
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent">
              <Wrench className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="font-display text-xl font-bold">
                ¿No encuentras tu repuesto?
              </DialogTitle>
              <DialogDescription className="text-xs">
                Lo buscamos en toda nuestra red de comercios aliados de Venezuela.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="my-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center text-emerald-800 dark:text-emerald-300">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white shadow-md">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">¡Solicitud Registrada!</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Nuestros comercios aliados verificarán sus existencias y te contactarán por WhatsApp con precio y disponibilidad.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-medium">
                <span>Tu Nombre y Apellido *</span>
                <input
                  required
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="h-10 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-accent"
                  data-testid="input-request-name"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-medium">
                <span>Teléfono / WhatsApp *</span>
                <input
                  required
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Ej. 0414-1234567"
                  className="h-10 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-accent"
                  data-testid="input-request-phone"
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-xs font-medium">
              <span>Modelo y Año de tu Moto *</span>
              <input
                required
                type="text"
                value={motorcycleModel}
                onChange={(e) => setMotorcycleModel(e.target.value)}
                placeholder="Ej. Bera SBR 150 (2024), Empire Horse 150, Suzuki GN"
                className="h-10 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-accent"
                data-testid="input-request-bike-model"
              />
            </label>

            <label className="grid gap-1.5 text-xs font-medium">
              <span>Repuesto que necesitas *</span>
              <textarea
                required
                rows={3}
                value={partDescription}
                onChange={(e) => setPartDescription(e.target.value)}
                placeholder="Describe qué pieza buscas (ej. Pistón a 0.50 con aros, Kit de arrastre relación corta, Barra de suspensión delantera...)"
                className="rounded-lg border border-input bg-background p-3 text-xs outline-none focus:border-accent"
                data-testid="textarea-request-part"
              />
            </label>

            <div className="rounded-xl border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">💡 ¿Cómo funciona?</span> Publicamos tu requerimiento en la red de talleres y repuesteras verificadas. Tan pronto un comercio confirme stock, te escribirá directamente con su oferta.
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="gap-2"
                data-testid="button-submit-part-request"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>{loading ? 'Enviando...' : 'Enviar Solicitud'}</span>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
