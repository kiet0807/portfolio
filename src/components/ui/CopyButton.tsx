import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { CheckIcon, CopyIcon } from './Icons';
import { useLang } from '@/i18n/useLang';

type State = 'idle' | 'copied' | 'failed';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Copies `value` and confirms both visually and to screen readers. */
export function CopyButton({ value }: { value: string }) {
  const { t } = useLang();
  const [state, setState] = useState<State>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = async () => {
    const ok = await copyText(value);
    setState(ok ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2200);
  };

  const label =
    state === 'copied'
      ? t('contact.copied')
      : state === 'failed'
        ? t('contact.copyFailed')
        : t('contact.copy');

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => void onClick()}>
        {state === 'copied' ? <CheckIcon size={16} className="text-link" /> : <CopyIcon size={16} />}
        {label}
      </Button>
      <span role="status" className="sr-only">
        {state === 'idle' ? '' : label}
      </span>
    </>
  );
}
