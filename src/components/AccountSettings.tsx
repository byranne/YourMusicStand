import { Camera, Minus, Monitor, Moon, Plus, Sun, type LucideIcon } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

import { ImageCropper } from '@/components/ImageCropper';
import { Avatar, Button, TextField } from '@/components/ui';
import { AVATAR_PRESETS } from '@/lib/avatars';
import { formatMinutes } from '@/lib/practice';
import {
  DEFAULT_SETTINGS,
  useProfile,
  useSession,
  useSetAvatarPhoto,
  useSettings,
  useUpdateProfile,
  useUpdateSettings,
} from '@/lib/queries';
import { applyTheme, BACKGROUNDS, readThemePref, writeThemePref, type Background, type ThemePref } from '@/lib/theme';

// The Account sheet's sections: profile picture and name, how the app looks,
// and the weekly practice goal.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

// A round 48px choice: ringed in brand teal when selected.
function choiceClass(selected: boolean) {
  return [
    'flex size-12 items-center justify-center rounded-full transition active:scale-95',
    selected ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface' : '',
  ].join(' ');
}

export function ProfileSettings() {
  const { session } = useSession();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const setPhoto = useSetAvatarPhoto();
  const fileInput = useRef<HTMLInputElement>(null);
  // The photo waiting in the cropper.
  const [picked, setPicked] = useState<File | null>(null);
  const data = profile.data;
  const email = session?.user.email ?? null;
  const error = updateProfile.error ?? setPhoto.error;

  const saveName = (value: string) => {
    const name = value.trim() || null;
    if (name !== (data?.display_name ?? null)) updateProfile.mutate({ display_name: name });
  };

  return (
    <Section title="Profile">
      <div className="flex items-center gap-4">
        <Avatar
          photoUrl={data?.avatar_photo_url}
          preset={data?.avatar_preset}
          name={data?.display_name}
          email={email}
          size={72}
        />
        <div className="min-w-0 flex-1">
          {/* Keyed by the loaded row, so the field starts from the saved name. */}
          <TextField
            key={data ? 'loaded' : 'loading'}
            label="Display name"
            placeholder="What should we call you?"
            maxLength={60}
            autoComplete="nickname"
            defaultValue={data?.display_name ?? ''}
            disabled={!data}
            onBlur={(event) => saveName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        </div>
      </div>

      <div role="radiogroup" aria-label="Profile picture" className="grid grid-cols-5 justify-items-center gap-3">
        {AVATAR_PRESETS.map((preset) => {
          const selected = !data?.avatar_path && data?.avatar_preset === preset;
          return (
            <button
              key={preset}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={preset === 'mascot' ? 'Mascot' : preset}
              disabled={!data}
              onClick={() => updateProfile.mutate({ avatar_preset: preset })}
              className={choiceClass(selected)}
            >
              <Avatar preset={preset} size={48} />
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Upload a photo"
          disabled={!data || setPhoto.isPending}
          onClick={() => fileInput.current?.click()}
          className={`${choiceClass(!!data?.avatar_path)} border border-dashed border-border bg-surface text-muted ${
            setPhoto.isPending ? 'animate-pulse' : ''
          }`}
        >
          <Camera className="size-5" aria-hidden />
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) setPicked(file);
          }}
        />
      </div>
      <ImageCropper
        file={picked}
        shape="circle"
        title="Crop your photo"
        onCancel={() => setPicked(null)}
        onConfirm={(crop) => {
          if (picked) setPhoto.mutate({ file: picked, crop });
          setPicked(null);
        }}
      />

      {data?.avatar_path ? (
        <Button
          label="Remove photo"
          variant="ghost"
          loading={setPhoto.isPending}
          onClick={() => setPhoto.mutate(null)}
        />
      ) : null}
      {error ? <p className="text-sm text-danger">{error.message}</p> : null}
    </Section>
  );
}

const themeOptions: { value: ThemePref; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

const backgroundLabels: Record<Background, string> = {
  plain: 'Plain',
  dots: 'Dots',
  staff: 'Staff',
  wash: 'Wash',
};

export function AppearanceSettings() {
  // Per device, so it lives in localStorage rather than the account.
  const [theme, setTheme] = useState(readThemePref);
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const background = settings.data?.background ?? DEFAULT_SETTINGS.background;

  const chooseTheme = (pref: ThemePref) => {
    setTheme(pref);
    writeThemePref(pref);
    applyTheme(pref);
  };

  return (
    <Section title="Appearance">
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-xl border border-border p-1">
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            onClick={() => chooseTheme(value)}
            className={`flex h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition ${
              theme === value ? 'bg-brand-soft text-on-brand-soft' : 'text-muted'
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label="Page background" className="grid grid-cols-4 gap-3">
        {BACKGROUNDS.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={background === value}
            disabled={settings.isPending}
            onClick={() => updateSettings.mutate({ background: value })}
            className="flex flex-col items-center gap-1.5 text-xs font-medium text-muted"
          >
            <span
              aria-hidden
              className={`h-16 w-full rounded-xl border bg-background bg-pattern-${value} ${
                background === value ? 'border-brand ring-2 ring-brand' : 'border-border'
              }`}
            />
            <span className={background === value ? 'text-text' : ''}>{backgroundLabels[value]}</span>
          </button>
        ))}
      </div>
      {updateSettings.error ? <p className="text-sm text-danger">{updateSettings.error.message}</p> : null}
    </Section>
  );
}

const GOAL_STEP = 15;
const GOAL_MIN = 15;
const GOAL_MAX = 3000;
const GOAL_DEFAULT = 120;

export function GoalSettings() {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const goal = settings.data?.weeklyGoalMin ?? null;
  const setGoal = (weeklyGoalMin: number | null) => updateSettings.mutate({ weeklyGoalMin });

  return (
    <Section title="Weekly goal">
      {goal === null ? (
        <Button
          label="Set a weekly practice goal"
          variant="secondary"
          disabled={settings.isPending}
          onClick={() => setGoal(GOAL_DEFAULT)}
        />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={`${GOAL_STEP} minutes less`}
              disabled={goal <= GOAL_MIN}
              onClick={() => setGoal(Math.max(GOAL_MIN, goal - GOAL_STEP))}
              className="flex size-12 items-center justify-center rounded-xl border border-border text-text active:scale-95 disabled:opacity-40"
            >
              <Minus className="size-5" aria-hidden />
            </button>
            <p className="flex-1 text-center">
              <span className="text-2xl font-bold text-text tabular-nums">{formatMinutes(goal)}</span>
              <span className="block text-xs text-muted">a week</span>
            </p>
            <button
              type="button"
              aria-label={`${GOAL_STEP} minutes more`}
              disabled={goal >= GOAL_MAX}
              onClick={() => setGoal(Math.min(GOAL_MAX, goal + GOAL_STEP))}
              className="flex size-12 items-center justify-center rounded-xl border border-border text-text active:scale-95 disabled:opacity-40"
            >
              <Plus className="size-5" aria-hidden />
            </button>
          </div>
          <Button label="Turn off the goal" variant="ghost" onClick={() => setGoal(null)} />
        </>
      )}
      {updateSettings.error ? <p className="text-sm text-danger">{updateSettings.error.message}</p> : null}
    </Section>
  );
}
