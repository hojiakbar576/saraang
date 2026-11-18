import { useRef, useState, type DragEvent } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Star, Trash2, AlertCircle } from 'lucide-react';
import type { ProductImage } from '@/types/catalog';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { imageStorage } from '@/services/storage';
import {
  ACCEPT_ATTR,
  IMAGE_ERROR_TEXT,
  MAX_IMAGES_PER_PRODUCT,
  baseFilename,
  prepareImage,
  validateImageFile,
} from '@/features/products/admin/images';
import { msg, translateMsg } from '@/i18n';


interface Pending {
  id: string;
  name: string;
  preview: string;
  progress: number;
}

interface Props {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  /** Reports whether uploads are in progress so the form can block saving. */
  onBusyChange?: (busy: boolean) => void;
  altBase: string;
  error?: string;
}

export function ImageManager({ images, onChange, onBusyChange, altBase, error }: Props) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<Pending[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Always apply uploads to the latest list, even if the admin reorders meanwhile.
  const latest = useRef(images);
  latest.current = images;

  const addFiles = async (files: File[]) => {
    const errors: string[] = [];
    const room = MAX_IMAGES_PER_PRODUCT - images.length - pending.length;
    const valid: File[] = [];
    for (const f of files) {
      const err = validateImageFile(f);
      if (err) errors.push(msg('images.fileError', { file: f.name, message: IMAGE_ERROR_TEXT[err] }));
      else valid.push(f);
    }
    if (valid.length > room) {
      errors.push(msg('admin.productForm.tooMany', { max: MAX_IMAGES_PER_PRODUCT }));
      valid.splice(Math.max(room, 0));
    }
    setFileErrors(errors);
    if (!valid.length) return;

    const items = valid.map((f) => ({ file: f, p: { id: crypto.randomUUID(), name: f.name, preview: URL.createObjectURL(f), progress: 0 } }));
    setPending((cur) => [...cur, ...items.map((i) => i.p)]);
    onBusyChange?.(true);

    const uploaded: ProductImage[] = [];
    for (const { file, p } of items) {
      try {
        const blob = await prepareImage(file);
        const res = await imageStorage.upload(blob, {
          onProgress: (fr) => setPending((cur) => cur.map((x) => (x.id === p.id ? { ...x, progress: fr } : x))),
        });
        const img: ProductImage = {
          id: crypto.randomUUID(),
          url: res.url,
          storagePath: res.storagePath,
          alt: altBase || baseFilename(file.name),
          position: 0,
        };
        uploaded.push(img);
        const next = [...latest.current, img].map((im, i) => ({ ...im, position: i }));
        latest.current = next;
        onChange(next);
      } catch {
        setFileErrors((cur) => [...cur, msg('images.uploadFailed', { file: file.name })]);
      } finally {
        URL.revokeObjectURL(p.preview);
        setPending((cur) => cur.filter((x) => x.id !== p.id));
      }
    }
    onBusyChange?.(false);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next.map((im, i) => ({ ...im, position: i })));
  };

  const remove = (index: number) => onChange(images.filter((_, i) => i !== index).map((im, i) => ({ ...im, position: i })));

  const onDropZone = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles([...e.dataTransfer.files]);
  };

  const iconBtn = 'inline-flex h-7 w-7 items-center justify-center bg-paper/90 text-ink hover:bg-paper disabled:opacity-30';

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
        {images.map((img, i) => (
          <figure
            key={img.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dragIndex != null) move(dragIndex, i);
              setDragIndex(null);
            }}
            className={cn('group relative aspect-[4/5] cursor-grab overflow-hidden bg-mist', dragIndex === i && 'opacity-40')}
          >
            <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 bg-ink px-1.5 py-0.5 text-[10px] tracking-wider text-paper uppercase">{t('admin.productForm.primary')}</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 p-1.5">
              <div className="flex gap-1">
                <button type="button" className={iconBtn} onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={t('admin.productForm.moveLeft')} title={t('admin.productForm.moveLeft')}>
                  <ChevronLeft size={14} />
                </button>
                <button type="button" className={iconBtn} onClick={() => move(i, i + 1)} disabled={i === images.length - 1} aria-label={t('admin.productForm.moveRight')} title={t('admin.productForm.moveRight')}>
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="flex gap-1">
                {i !== 0 && (
                  <button type="button" className={iconBtn} onClick={() => move(i, 0)} aria-label={t('admin.productForm.makePrimary')} title={t('admin.productForm.makePrimary')}>
                    <Star size={13} />
                  </button>
                )}
                <button type="button" className={cn(iconBtn, 'hover:text-danger')} onClick={() => remove(i)} aria-label={t('admin.productForm.removeImage')} title={t('admin.productForm.removeImage')}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </figure>
        ))}

        {pending.map((p) => (
          <figure key={p.id} className="relative aspect-[4/5] overflow-hidden bg-mist" aria-busy="true">
            <img src={p.preview} alt="" className="h-full w-full object-cover opacity-40" />
            <figcaption className="absolute inset-x-2 bottom-2">
              <p className="mb-1 truncate text-[10px] text-ink">{t('admin.productForm.uploading')} {Math.round(p.progress * 100)}%</p>
              <div className="h-1 w-full bg-paper/80">
                <div className="h-1 bg-ink transition-[width]" style={{ width: `${Math.max(5, p.progress * 100)}%` }} />
              </div>
            </figcaption>
          </figure>
        ))}

        {images.length + pending.length < MAX_IMAGES_PER_PRODUCT && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDropZone}
            className={cn(
              'flex aspect-[4/5] flex-col items-center justify-center gap-2 border border-dashed p-2 text-center text-[11px] text-muted transition-colors hover:border-ink hover:text-ink',
              dragOver ? 'border-ink bg-sand/50 text-ink' : error ? 'border-danger' : 'border-stone',
            )}
          >
            <ImagePlus size={22} strokeWidth={1.25} />
            {t('admin.productForm.dropzone')}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label={t('admin.productForm.choose')}
        onChange={(e) => {
          if (e.target.files?.length) addFiles([...e.target.files]);
          e.target.value = '';
        }}
      />
      <p className="mt-2 text-xs text-muted">{t('admin.productForm.imagesHint', { max: MAX_IMAGES_PER_PRODUCT })}</p>
      {error && <p role="alert" className="mt-1.5 text-xs text-danger">{translateMsg(error, t)}</p>}
      {fileErrors.map((e) => (
        <p key={e} role="alert" className="mt-1 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle size={12} /> {translateMsg(e, t)}
        </p>
      ))}
    </div>
  );
}
