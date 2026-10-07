'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFeedbackSchema } from '@/contracts/api';
import { PRIORITIES, type FeedbackPriority } from '@/contracts/feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast-store';

export function CreateFeedbackForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<FeedbackPriority>('medium');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = createFeedbackSchema.safeParse({ title, description, priority });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!errors[key]) {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    try {
      let attachmentId: string | undefined;
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        const uploadForm = new FormData();
        uploadForm.append('file', file);
        const uploadRes = await fetch('/api/uploads', { method: 'POST', body: uploadForm });
        if (!uploadRes.ok) {
          setFormError('The attachment was rejected. Allowed types are PDF, PNG and JPEG up to 5 MB.');
          return;
        }
        attachmentId = ((await uploadRes.json()) as { attachmentId: string }).attachmentId;
      }

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: parsed.data.title,
          description: parsed.data.description,
          priority: parsed.data.priority,
          attachmentId,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setFormError(body?.error?.message ?? 'Feedback could not be created.');
        return;
      }
      const body = (await res.json()) as { feedback: { id: string } };
      toast('success', 'Feedback created');
      router.push(`/feedback/${body.feedback.id}`);
    } catch {
      setFormError('Something went wrong. Please try again.');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6"
      noValidate
    >
      {formError ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      ) : null}
      <Input
        id="title"
        label="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={fieldErrors.title}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          rows={5}
          value={description}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={fieldErrors.description ? 'description-error' : undefined}
          onChange={(event) => setDescription(event.target.value)}
          className={`rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 ${
            fieldErrors.description ? 'border-red-500' : 'border-slate-300'
          }`}
        />
        {fieldErrors.description ? (
          <p id="description-error" className="text-sm text-red-600">
            {fieldErrors.description}
          </p>
        ) : null}
      </div>
      <Select
        id="priority"
        label="Priority"
        value={priority}
        onChange={(event) => setPriority(event.target.value as FeedbackPriority)}
      >
        {PRIORITIES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </Select>
      <div className="flex flex-col gap-1">
        <label htmlFor="attachment" className="text-sm font-medium text-slate-700">
          Attachment (optional)
        </label>
        <input
          ref={fileInputRef}
          id="attachment"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="text-sm"
        />
        <p className="text-xs text-slate-500">PDF, PNG or JPEG, up to 5 MB.</p>
      </div>
      <Button type="submit" className="self-start">
        Create feedback
      </Button>
    </form>
  );
}
