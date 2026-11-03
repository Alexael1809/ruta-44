/**
 * Inventory management page allowing merchants and admins to create, edit, and archive products.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetCurrentUserQueryKey,
  getListProductsQueryKey,
  useCreateProduct,
  useDeleteProduct,
  useGetCurrentUser,
  useListProducts,
  useUpdateProduct,
  type Product,
} from '@workspace/api-client-react';
import {
  Boxes,
  Check,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { NoticeBar, type Notice } from '@/components/shared/notice-bar';
import { usd } from '@/lib/formatters';

type ProductFormValues = {
  name: string;
  sku: string;
  category: string;
  description: string;
  priceUsd: number;
  stock: number;
  imageUrl: string | null;
  isVisible: boolean;
  condition: 'new' | 'used' | 'refurbished';
};

interface ProductEditorProps {
  open: boolean;
  product: Product | null;
  pending: boolean;
  onClose: () => void;
  onSave: (values: ProductFormValues) => void;
}

function ProductEditor({ open, product, pending, onClose, onSave }: ProductEditorProps) {
  const [values, setValues] = useState<ProductFormValues>({
    name: '',
    sku: '',
    category: 'Motor',
    description: '',
    priceUsd: 0,
    stock: 0,
    imageUrl: null,
    isVisible: true,
    condition: 'new',
  });

  useEffect(() => {
    setValues(
      product
        ? {
            name: product.name,
            sku: product.sku,
            category: product.category,
            description: product.description,
            priceUsd: product.priceUsd,
            stock: product.stock,
            imageUrl: product.imageUrl,
            isVisible: product.isVisible,
            condition: product.condition as ProductFormValues['condition'],
          }
        : {
            name: '',
            sku: '',
            category: 'Motor',
            description: '',
            priceUsd: 0,
            stock: 0,
            imageUrl: null,
            isVisible: true,
            condition: 'new',
          },
    );
  }, [product, open]);

  const update = (
    key: keyof ProductFormValues,
    value: string | number | boolean | null,
  ) => setValues((current) => ({ ...current, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-w-xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {product ? 'Editar repuesto' : 'Nuevo repuesto'}
          </DialogTitle>
          <DialogDescription>
            Los datos claros reducen preguntas y devoluciones.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(values);
          }}
          className="grid gap-4 sm:grid-cols-2"
          data-testid="form-product-editor"
        >
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
            Nombre
            <input
              required
              minLength={2}
              value={values.name}
              onChange={(event) => update('name', event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              placeholder="Ej. Pastillas de freno delanteras"
              data-testid="input-product-name"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            SKU
            <input
              required
              value={values.sku}
              onChange={(event) => update('sku', event.target.value)}
              disabled={Boolean(product)}
              className="h-10 rounded-md border border-input bg-background px-3 font-mono text-xs outline-none focus:border-accent disabled:bg-muted"
              placeholder="FR-0001"
              data-testid="input-product-sku"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Categoría
            <input
              required
              value={values.category}
              onChange={(event) => update('category', event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              placeholder="Frenos"
              data-testid="input-product-category"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Precio USD
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={values.priceUsd}
              onChange={(event) => update('priceUsd', Number(event.target.value))}
              className="h-10 rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus:border-accent"
              data-testid="input-product-price"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Stock
            <input
              required
              type="number"
              min="0"
              step="1"
              value={values.stock}
              onChange={(event) => update('stock', Number(event.target.value))}
              className="h-10 rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus:border-accent"
              data-testid="input-product-stock"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
            Condición
            <select
              value={values.condition}
              onChange={(event) => update('condition', event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              data-testid="select-product-condition"
            >
              <option value="new">Nuevo</option>
              <option value="used">Usado</option>
              <option value="refurbished">Reacondicionado</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
            Descripción
            <textarea
              value={values.description}
              onChange={(event) => update('description', event.target.value)}
              className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="Qué incluye y para qué modelos sirve"
              data-testid="textarea-product-description"
            />
          </label>
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={values.isVisible}
              onChange={(event) => update('isVisible', event.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--accent))]"
              data-testid="checkbox-product-visible"
            />
            <span>Mostrar en el catálogo público</span>
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel-product"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending}
              data-testid="button-save-product"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>{product ? 'Guardar cambios' : 'Publicar repuesto'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface BulkImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

function BulkImportDialog({ open, onClose, onSuccess }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ importedCount: number; errors?: any[] } | null>(null);

  const downloadTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      encodeURIComponent(
        'SKU,Nombre,Categoría,Marca,Aplicación,Condición,Precio USD,Stock,Descripción\n' +
          'BER-001,Pistón Estándar 150cc,Motor,Bera,BR 150 / SBR,new,18.50,15,Pistón con aros y pasador original\n' +
          'EMP-002,Juego de Empacaduras Completo,Motor,EmpaqueTech,Bera 150 / Empire 150,new,9.00,25,Juego completo de juntas\n' +
          'PAS-003,Pastillas de Freno Delanteras,Frenos,Brembo,Universal Moto 150-200,new,6.50,40,Pastillas cerámicas de alta fricción\n'
      );
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'plantilla_inventario_ruta44.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/products/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64Data,
            fileName: file.name,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Error al procesar el archivo.');
          return;
        }

        setResult(data);
        onSuccess(data.importedCount);
      } catch (err: any) {
        setError(err.message || 'Error de conexión al importar.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className="max-w-[550px]"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-accent" />
            <span>Importación Masiva de Inventario</span>
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx) o CSV con tus repuestos para actualizar precios y existencias en lote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3 text-xs">
            <span className="text-muted-foreground">¿Primera vez que importas?</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="h-8 gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar plantilla CSV
            </Button>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Seleccionar archivo (.xlsx ó .csv)
            </label>
            <input
              type="file"
              accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer rounded-lg border border-input bg-background p-2 text-xs outline-none"
              data-testid="input-bulk-import-file"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
              <p className="font-semibold">¡Importación completada!</p>
              <p className="mt-1">Se agregaron o actualizaron {result.importedCount} repuestos correctamente.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {result ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!file || loading}
              data-testid="button-confirm-import"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>{loading ? 'Procesando...' : 'Iniciar importación'}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InventoryPage() {
  const { data: user } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false },
  });
  const params = useMemo(
    () => ({ merchantId: user?.merchantId ?? undefined, page: 1, pageSize: 50 }),
    [user?.merchantId],
  );
  const query = useListProducts(params);
  const client = useQueryClient();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [editorOpen, setEditorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const products = query.data?.items ?? [];

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setEditorOpen(true);
  };

  const saveProduct = (form: ProductFormValues) => {
    if (editing) {
      updateProduct.mutate(
        { productId: editing.id, data: form },
        {
          onSuccess: () => {
            setEditorOpen(false);
            setNotice({ tone: 'success', text: 'Inventario actualizado.' });
            window.setTimeout(() => {
              client.invalidateQueries({ queryKey: getListProductsQueryKey(params) });
            }, 60);
          },
          onError: (err: any) => {
            setNotice({ tone: 'error', text: err?.message || 'Error al actualizar el repuesto.' });
          },
        },
      );
    } else {
      createProduct.mutate(
        { data: form },
        {
          onSuccess: () => {
            setEditorOpen(false);
            setNotice({
              tone: 'success',
              text: 'Repuesto publicado en el catálogo.',
            });
            window.setTimeout(() => {
              client.invalidateQueries({ queryKey: getListProductsQueryKey(params) });
            }, 60);
          },
          onError: (err: any) => {
            setNotice({ tone: 'error', text: err?.message || 'Error al publicar el repuesto.' });
          },
        },
      );
    }
  };

  const archive = (product: Product) => {
    if (!window.confirm(`¿Archivar ${product.name}?`)) return;
    deleteProduct.mutate(
      { productId: product.id },
      {
        onSuccess: () => {
          client.invalidateQueries({ queryKey: getListProductsQueryKey(params) });
          setNotice({ tone: 'success', text: 'Repuesto archivado.' });
        },
        onError: (err: any) => {
          setNotice({
            tone: 'error',
            text: err?.message || 'No tienes permisos para archivar este repuesto.',
          });
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">
            Comerciante
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.05em]">
            Inventario
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Mantén visible lo que de verdad tienes en anaquel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setImportOpen(true)}
            data-testid="button-import-products"
          >
            <Upload className="h-4 w-4" />
            Importar Excel/CSV
          </Button>
          <Button type="button" onClick={openCreate} data-testid="button-new-product">
            <Plus className="h-4 w-4" />
            Nuevo repuesto
          </Button>
        </div>
      </div>

      {notice && (
        <div key="inventory-notice" className="mt-5">
          <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
        </div>
      )}

      <div className="mt-9 overflow-hidden rounded-2xl border border-card-border bg-card shadow-xs">
        {query.isLoading ? (
          <div key="inventory-loading" className="p-8">
            <div className="h-10 animate-pulse rounded bg-muted" />
          </div>
        ) : query.isError ? (
          <div key="inventory-error" className="p-6">
            <ErrorState retry={() => query.refetch()} />
          </div>
        ) : products.length === 0 ? (
          <div key="inventory-empty" className="p-6">
            <EmptyState
              icon={Boxes}
              title="Tu inventario está vacío"
              description="Publica tu primer repuesto para empezar a recibir pedidos."
              action={
                <Button
                  type="button"
                  onClick={openCreate}
                  data-testid="button-empty-new-product"
                >
                  <Plus className="h-4 w-4" />
                  Publicar repuesto
                </Button>
              }
            />
          </div>
        ) : (
          <div key="inventory-table" className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border bg-muted/60 font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Repuesto</th>
                  <th className="px-5 py-4">SKU</th>
                  <th className="px-5 py-4">Precio</th>
                  <th className="px-5 py-4">Stock</th>
                  <th className="px-5 py-4">Visibilidad</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="transition hover:bg-muted/30"
                    data-testid={`row-inventory-${product.id}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted font-mono text-xs font-bold text-accent">
                          {product.name
                            .split(' ')
                            .slice(0, 2)
                            .map((word) => word[0])
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.category}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                      {product.sku}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold">
                      {usd(product.priceUsd)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          product.stock < 5 ? 'font-semibold text-destructive' : ''
                        }
                      >
                        {product.stock} unid.
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs ${product.isVisible ? 'text-accent' : 'text-muted-foreground'}`}
                      >
                        {product.isVisible ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                        {product.isVisible ? 'Visible' : 'Oculto'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => openEdit(product)}
                          aria-label={`Editar ${product.name}`}
                          data-testid={`button-edit-product-${product.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-[#f7dfd8] hover:text-destructive"
                          onClick={() => archive(product)}
                          aria-label={`Archivar ${product.name}`}
                          data-testid={`button-delete-product-${product.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductEditor
        open={editorOpen}
        product={editing}
        pending={createProduct.isPending || updateProduct.isPending}
        onClose={() => setEditorOpen(false)}
        onSave={saveProduct}
      />

      <BulkImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={(count) => {
          client.invalidateQueries({ queryKey: getListProductsQueryKey(params) });
          setNotice({
            tone: 'success',
            text: `Importación exitosa: ${count} repuestos cargados o actualizados en inventario.`,
          });
        }}
      />
    </div>
  );
}
