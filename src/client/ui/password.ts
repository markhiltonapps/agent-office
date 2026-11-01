import './accounts.css';
import type { ServerMsg } from '../../shared/protocol';
import type { Net } from '../net';
import { h, openModal } from './dom';

const PASSWORD_MIN = 8;

let onAnswer: ((msg: Extract<ServerMsg, { t: 'accounts.password' }>) => void) | null = null;

export function routePasswordMessage(msg: ServerMsg) {
  if (msg.t === 'accounts.password') onAnswer?.(msg);
}

/** 🔒 Change my password, for anyone signed in with an account of their own. */
export function openChangePassword(net: Net) {
  const field = (label: string, autocomplete: string) => {
    const input = h('input', { type: 'password', autocomplete, required: true, 'aria-label': label, placeholder: label }) as HTMLInputElement;
    return input;
  };
  const current = field('Current password', 'current-password');
  const next = field('New password', 'new-password');
  const again = field('New password again', 'new-password');
  const status = h('p.note', { role: 'status' });
  const save = h('button.btn.primary', { type: 'submit' }, 'Change password');
  const close = h('button.btn.close', { type: 'button', 'aria-label': 'Close' }, '✕');
  const form = h('form.invite-row', { style: 'flex-direction:column;align-items:stretch;gap:8px' }, current, next, again, save) as HTMLFormElement;
  const el = h(
    'div.modal',
    { role: 'dialog', 'aria-label': 'Change my password', style: 'width:min(420px,100%)' },
    h('header', {}, h('h2', {}, '🔒 Change my password'), close),
    h('div.body.team.accounts', {}, h('p.note', {}, `At least ${PASSWORD_MIN} characters. You stay signed in here; other computers keep their sessions until they sign out.`), form, status),
  );
  const modal = openModal(el, { onClose: () => (onAnswer = null) });
  close.addEventListener('click', () => modal.close());

  const say = (text: string, bad = false) => {
    status.textContent = text;
    status.style.color = bad ? 'var(--bad)' : 'var(--good)';
  };
  onAnswer = (msg) => {
    save.disabled = false;
    if (msg.error) return say(msg.error, true);
    say('✅ Password changed. Use the new one next time you sign in.');
    form.reset();
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (next.value.length < PASSWORD_MIN) return say(`Pick a password of at least ${PASSWORD_MIN} characters`, true);
    if (next.value !== again.value) return say("The two new passwords don't match", true);
    save.disabled = true;
    say('Changing…');
    net.send({ t: 'accounts.password', current: current.value, next: next.value });
  });
  current.focus();
}
