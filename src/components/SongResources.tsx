import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Link as LinkIcon, LoaderCircle, X } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { Button, TextField } from '@/components/ui';
import type { LibraryEntry } from '@/lib/library';
import { useAddFile, useAddLink, useLibrary, useRemoveResource, useResourceUrls } from '@/lib/queries';
import {
  formatFileSize,
  linkTitle,
  MAX_FILE_BYTES,
  MAX_TOTAL_FILE_BYTES,
  normalizeLink,
  sortResources,
  usedFileBytes,
  type Resource,
} from '@/lib/resources';
import { resourceLinkSchema, type ResourceLink } from '@/lib/schemas/entry';

// Everything the user keeps with a song: links and uploaded files in one list.
// Tapping a row opens it.
export function SongResources({ entry }: { entry: LibraryEntry }) {
  const addLink = useAddLink();
  const addFile = useAddFile();
  const removeResource = useRemoveResource();
  const urls = useResourceUrls(entry);
  // The upload allowance covers every song's files, not just this one's.
  const usedBytes = usedFileBytes(useLibrary().data ?? []);

  const [addingLink, setAddingLink] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const resources = sortResources(entry.resources);
  const uploading = addFile.isPending ? addFile.variables.file : null;
  const failed = addLink.isError || addFile.isError || removeResource.isError || urls.isError;

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`That file is ${formatFileSize(file.size)}. The limit is ${formatFileSize(MAX_FILE_BYTES)}.`);
      return;
    }
    if (usedBytes + file.size > MAX_TOTAL_FILE_BYTES) {
      setFileError(
        `You've used ${formatFileSize(usedBytes)} of ${formatFileSize(MAX_TOTAL_FILE_BYTES)}, and that file is ${formatFileSize(file.size)}. Remove a file to make room, or add it as a link.`,
      );
      return;
    }
    setFileError(null);
    addFile.mutate({ entryId: entry.id, file });
  };

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-muted">Resources</h3>

      {resources.length === 0 && !uploading ? (
        <p className="text-sm text-muted">Keep tabs and PDFs here as files, and videos as links.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {resources.map((resource) => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              href={resource.url ?? (resource.storage_path ? urls.data?.[resource.storage_path] : undefined)}
              confirming={confirmingId === resource.id}
              onRemove={() => {
                if (confirmingId !== resource.id) return setConfirmingId(resource.id);
                setConfirmingId(null);
                removeResource.mutate(resource);
              }}
            />
          ))}
          {uploading ? (
            <li className="flex h-14 items-center gap-3 rounded-2xl border border-border px-4 text-muted">
              <LoaderCircle className="size-5 shrink-0 animate-spin" aria-hidden />
              <span className="truncate text-base">Uploading {uploading.name}…</span>
            </li>
          ) : null}
        </ul>
      )}

      {addingLink ? (
        <AddLinkForm
          saving={addLink.isPending}
          onCancel={() => setAddingLink(false)}
          onAdd={(url) =>
            addLink.mutate({ entryId: entry.id, url }, { onSuccess: () => setAddingLink(false) })
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button label="Add link" variant="secondary" onClick={() => setAddingLink(true)} />
          <Button
            label="Add file"
            variant="secondary"
            disabled={addFile.isPending}
            onClick={() => fileInput.current?.click()}
          />
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          pickFile(event.target.files?.[0]);
          // Let the same file be picked again after a failure.
          event.target.value = '';
        }}
      />

      {fileError ? <p className="text-sm text-danger">{fileError}</p> : null}
      {failed ? (
        <p className="text-sm text-danger">Something didn't go through. Check your connection and try again.</p>
      ) : null}
    </section>
  );
}

type ResourceRowProps = {
  resource: Resource;
  // Missing while a file's signed link is still loading.
  href: string | undefined;
  confirming: boolean;
  onRemove: () => void;
};

function ResourceRow({ resource, href, confirming, onRemove }: ResourceRowProps) {
  const Icon = resource.kind === 'link' ? LinkIcon : FileText;
  const title = resource.title;
  const detail =
    resource.kind === 'link'
      ? linkDetail(resource)
      : resource.size_bytes !== null
        ? formatFileSize(resource.size_bytes)
        : null;

  const content: ReactNode = (
    <>
      <Icon className="size-5 shrink-0 text-brand" aria-hidden />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-base text-text">{title}</span>
        {detail ? <span className="truncate text-sm text-muted">{detail}</span> : null}
      </span>
    </>
  );
  const layout = 'flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 pl-4';

  return (
    <li className="flex items-center rounded-2xl border border-border">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`${layout} active:opacity-80`}>
          {content}
        </a>
      ) : (
        <span className={`${layout} opacity-50`}>{content}</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={confirming ? `Confirm removing ${title}` : `Remove ${title}`}
        className={`flex h-11 min-w-11 shrink-0 items-center justify-center px-3 text-sm font-medium ${
          confirming ? 'text-danger' : 'text-muted'
        }`}
      >
        {confirming ? 'Remove?' : <X className="size-5" aria-hidden />}
      </button>
    </li>
  );
}

// The rest of a link after its site, so two links to the same site can be told apart.
function linkDetail(resource: Resource): string | null {
  if (!resource.url) return null;
  // Links moved over from the old Tab / Video fields aren't titled by their site.
  if (resource.title !== linkTitle(resource.url)) return linkTitle(resource.url);
  const { pathname, search } = new URL(resource.url);
  const rest = `${pathname}${search}`;
  return rest === '/' ? null : rest;
}

type AddLinkFormProps = {
  saving: boolean;
  onAdd: (url: string) => void;
  onCancel: () => void;
};

function AddLinkForm({ saving, onAdd, onCancel }: AddLinkFormProps) {
  const { register, handleSubmit, formState } = useForm<ResourceLink>({
    resolver: zodResolver(resourceLinkSchema),
    defaultValues: { url: '' },
  });

  const submit = handleSubmit(({ url }) => {
    const link = normalizeLink(url);
    if (link) onAdd(link);
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <TextField
        aria-label="Link"
        placeholder="Paste a link"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        autoFocus
        error={formState.errors.url?.message}
        {...register('url')}
      />
      <div className="grid grid-cols-2 gap-3">
        <Button label="Cancel" variant="ghost" onClick={onCancel} />
        <Button type="submit" label="Add" loading={saving} />
      </div>
    </form>
  );
}
