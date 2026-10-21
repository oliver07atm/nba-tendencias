import React,{Children,useEffect,useId,useMemo,useRef,useState} from 'react';
import {filterSelectOptions} from './searchable-select.js';

// Selection remains controlled by the caller; typing never changes an identity.
export default function SearchableSelect({children,value,onChange,required=false,disabled=false,'aria-label':label='Jugador'}){
 const id=useId(),input=useRef(null),list=useRef(null);
 const options=useMemo(()=>Children.toArray(children).filter(c=>React.isValidElement(c)&&c.type==='option').map(c=>({value:String(c.props.value??''),label:Children.toArray(c.props.children).join(''),disabled:!!c.props.disabled})),[children]);
 const selected=options.find(o=>o.value===String(value??''));
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(-1);
 const results=filterSelectOptions(options,query);
 useEffect(()=>{setQuery('');setActive(-1);setOpen(false);},[value]);
 useEffect(()=>{if(open&&active>=0)list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({block:'nearest'});},[active,open]);
 const choose=o=>{if(!o||o.disabled)return;onChange?.({target:{value:o.value}});setOpen(false);setQuery('');setActive(-1);input.current?.focus();};
 const keydown=e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setOpen(false);setQuery('');setActive(-1);return;}
  if(e.key==='Tab'){setOpen(false);setQuery('');setActive(-1);return;}
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)&&(open||e.key.startsWith('Arrow'))){e.preventDefault();setOpen(true);setActive(i=>!results.length?-1:e.key==='Home'?0:e.key==='End'?results.length-1:e.key==='ArrowDown'?Math.min(i+1,results.length-1):i<0?results.length-1:Math.max(0,i-1));}
  if(e.key==='Enter'&&open){e.preventDefault();choose(results[active]);}
 };
 return <div className="searchable-select" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){setOpen(false);setQuery('');setActive(-1);}}}>
  <div className="searchable-select-control"><input ref={input} role="combobox" aria-label={label} aria-expanded={open} aria-controls={id} aria-autocomplete="list" aria-activedescendant={open&&active>=0&&results[active]?`${id}-${active}`:undefined} aria-required={required} disabled={disabled} autoComplete="off" value={open?query:selected?.label||''} placeholder={selected?.label||'Buscar jugador…'} onClick={()=>{setOpen(true);setActive(-1);}} onChange={e=>{setQuery(e.target.value);setOpen(true);setActive(-1);}} onKeyDown={keydown}/><span aria-hidden="true">⌕</span></div>
  {required&&<input className="select-validity" tabIndex={-1} aria-hidden="true" value={value??''} required onChange={()=>{}} onInvalid={e=>{e.preventDefault();input.current?.focus();setOpen(true);}}/>}
  {open&&<div className="searchable-select-menu"><div ref={list} id={id} role="listbox" aria-label={label}>{results.map((o,i)=><div key={o.value} id={`${id}-${i}`} data-index={i} role="option" aria-selected={o.value===String(value??'')} className={i===active?'searchable-option active':'searchable-option'} onMouseDown={e=>e.preventDefault()} onClick={e=>{e.preventDefault();e.stopPropagation();choose(o);}}>{o.label}</div>)}</div><div className="searchable-select-status" role="status">{results.length?`${results.length} resultados · ↑ ↓ y Enter para seleccionar`:'Sin coincidencias'}</div></div>}
 </div>;
}
