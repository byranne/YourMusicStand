import { Disc3, Drum, Guitar, Headphones, MicVocal, Music, Piano, Radio, type LucideIcon } from 'lucide-react';

import { Mascot } from '@/components/Mascot';
import { initials, isAvatarPreset, type AvatarPreset } from '@/lib/avatars';

export const presetIcons: Record<Exclude<AvatarPreset, 'mascot'>, LucideIcon> = {
  guitar: Guitar,
  music: Music,
  mic: MicVocal,
  drum: Drum,
  headphones: Headphones,
  piano: Piano,
  radio: Radio,
  disc: Disc3,
};

type AvatarProps = {
  photoUrl?: string | null;
  preset?: string | null;
  // For the initials when there is no photo or preset.
  name?: string | null;
  email?: string | null;
  size: number;
};

// A round profile picture: the uploaded photo, else the chosen preset, else
// the person's initials. Decorative: the button or label around it names it.
export function Avatar({ photoUrl, preset, name, email, size }: AvatarProps) {
  const box = 'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-on-brand-soft';
  const style = { width: size, height: size };

  if (photoUrl) {
    return <img src={photoUrl} alt="" aria-hidden style={style} className={`${box} object-cover`} />;
  }
  if (isAvatarPreset(preset)) {
    return (
      <span aria-hidden style={style} className={box}>
        {preset === 'mascot' ? (
          <span className="translate-y-[6%]">
            <Mascot mood="idle" size={size * 0.62} decorative still />
          </span>
        ) : (
          <PresetIcon preset={preset} size={size} />
        )}
      </span>
    );
  }
  return (
    <span aria-hidden style={{ ...style, fontSize: size * 0.4 }} className={`${box} font-semibold`}>
      {initials(name, email)}
    </span>
  );
}

function PresetIcon({ preset, size }: { preset: Exclude<AvatarPreset, 'mascot'>; size: number }) {
  const Icon = presetIcons[preset];
  return <Icon style={{ width: size * 0.5, height: size * 0.5 }} />;
}
