import {useLayoutEffect,useRef} from 'react';
import {useLocation,useNavigationType} from 'react-router-dom';
// Separate from personal data. Each history entry keeps its own scroll position.
const positions=new Map();
export default function ScrollMemory({ready}){
 const location=useLocation(),type=useNavigationType(),previous=useRef(null);
 useLayoutEffect(()=>{
  if(!ready)return;
  const old=history.scrollRestoration;history.scrollRestoration='manual';
  const same=previous.current===location.pathname;
  const y=positions.get(location.key)??positions.get(location.state?.restoreKey)??(type==='REPLACE'&&same?window.scrollY:0);
  previous.current=location.pathname;
  let second;const first=requestAnimationFrame(()=>{window.scrollTo(0,y);second=requestAnimationFrame(()=>window.scrollTo(0,y));});
  return()=>{positions.set(location.key,window.scrollY);cancelAnimationFrame(first);cancelAnimationFrame(second);history.scrollRestoration=old;};
 },[location.key,ready]);
 return null;
}
