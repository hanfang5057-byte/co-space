/** Shared modal surfaces: the base dialog and the reusable alert/confirm shell. */
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/** Shared accessible modal surface for all workbench dialogs. */
export function SpaceDialog({ open, onClose, labelledBy, title, closeLabel, className = '', closeOnBackdrop = false, actions, children }) {
  const dialogRef=useRef(null);
  const onCloseRef=useRef(onClose);
  onCloseRef.current=onClose;
  useEffect(()=>{
    if(!open||typeof document==='undefined')return;
    const dialog=dialogRef.current;
    const previousFocus=document.activeElement;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const focusable=()=>[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])')];
    const initial=dialog.querySelector('[autofocus]')||focusable()[0]||dialog;
    initial.focus();
    const onKeyDown=event=>{
      if(event.key==='Escape'){event.preventDefault();onCloseRef.current?.();return}
      if(event.key!=='Tab')return;
      const items=focusable();
      if(!items.length){event.preventDefault();dialog.focus();return}
      const first=items[0],last=items.at(-1);
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    };
    document.addEventListener('keydown',onKeyDown);
    return()=>{document.removeEventListener('keydown',onKeyDown);document.body.style.overflow=previousOverflow;if(previousFocus instanceof HTMLElement&&previousFocus.isConnected)previousFocus.focus()};
  },[open]);
  if(!open||typeof document==='undefined')return null;
  return <div className="space-dialog-backdrop" onMouseDown={event=>{if(closeOnBackdrop&&event.target===event.currentTarget)onClose()}}><section ref={dialogRef} className={`space-dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} onMouseDown={event=>event.stopPropagation()}><header className="space-dialog-header"><h2 id={labelledBy}>{title}</h2><button type="button" className="space-dialog-close" aria-label={closeLabel} onClick={()=>onCloseRef.current?.()}><X size={17} aria-hidden="true"/></button></header><div className="space-dialog-content">{children}</div>{actions&&<footer className="space-dialog-actions">{actions}</footer>}</section></div>;
}

/**
 * Reusable confirmation dialog for one decision or one error notice.
 *
 * The base dialog supplies focus trapping, Escape handling, and focus
 * restoration; this shell adds the two presentations every caller needs:
 * a single acknowledged notice (the default) and an explicit confirm/cancel
 * decision. Errors therefore no longer rely on a corner status line: the
 * message is announced with `role="alert"` inside the modal, and the caller
 * only owns the open state, the text, and the action.
 *
 * @param {object} props - dialog state, copy, tone, and the confirm/cancel handlers.
 * @param {boolean} props.open - whether the dialog is mounted and visible.
 * @param {string} props.title - dialog heading.
 * @param {string} [props.description] - message shown with `role="alert"`; children render instead when omitted.
 * @param {string} props.closeLabel - accessible label for the close button; also the default confirm label.
 * @param {string} [props.confirmLabel] - confirm button label; defaults to the close label.
 * @param {string} [props.cancelLabel] - when present, renders a cancel button so the dialog confirms instead of acknowledges.
 * @param {'default'|'danger'} [props.tone] - visual tone of the confirm button.
 * @param {() => void} [props.onClose] - close button, Escape, or backdrop dismissal.
 * @param {() => void} [props.onConfirm] - confirm action; falls back to `onClose`.
 * @param {() => void} [props.onCancel] - cancel action; falls back to `onClose`.
 * @param {React.ReactNode} [props.children] - custom body when `description` is omitted.
 * @returns {React.ReactElement | null} the dialog, or null while closed.
 */
export function SpaceAlertDialog({ open, title, description, closeLabel, confirmLabel, cancelLabel, tone = 'default', onClose, onConfirm, onCancel, children }) {
  const titleId=useId();
  const close=()=>onClose?.();
  const confirm=()=>{ (onConfirm||onClose)?.(); };
  const cancel=()=>{ (onCancel||onClose)?.(); };
  return <SpaceDialog open={open} onClose={close} labelledBy={titleId} title={title} closeLabel={closeLabel||confirmLabel} className={`space-alert-dialog${tone==='danger'?' is-danger':''}`} actions={<>
    {cancelLabel&&<button type="button" onClick={cancel}>{cancelLabel}</button>}
    <button type="button" autoFocus className={tone==='danger'?'is-danger':'is-primary'} onClick={confirm}>{confirmLabel||closeLabel}</button>
  </>}>
    {description!==undefined ? <p className="space-alert-dialog-message" role="alert">{description}</p> : children}
  </SpaceDialog>;
}
