import {useEffect,useState} from 'react';
import {acceptingVenues} from './venue-jynlo-api';

/** "Reservar campo" only shows once at least one venue takes Jynlo bookings. */
export function useBookingsOpen():boolean{
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  let alive=true;
  void acceptingVenues().then(ids=>{if(alive)setOpen(ids.length>0);});
  return()=>{alive=false;};
 },[]);
 return open;
}
