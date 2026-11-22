import React,{createContext,useCallback,useContext,useMemo,useState} from 'react';
import {File,Paths} from 'expo-file-system';
import {pickLanguage,translate,localeTag,setCurrentLanguage,type AppLanguage} from './i18n-core.cjs';
import {EN} from './i18n-en.cjs';

type T=(text:string,params?:Record<string,string|number>)=>string;
interface LanguageState {language:AppLanguage;setLanguage:(next:AppLanguage)=>void;locale:string}

let current:AppLanguage='pt';
/**
 * Translate a Portuguese text to the app language. Safe anywhere at render
 * time: changing the language re-creates the screens (see LanguageProvider).
 */
export const t:T=(text,params)=>translate(EN,current,text,params);
export function currentLocale():string{return localeTag(current);}

function deviceLocale():string{
 try{return Intl.DateTimeFormat().resolvedOptions().locale||'pt-PT';}catch{return 'pt-PT';}
}
function languageFile():File|null{
 try{return new File(Paths.document,'language.txt');}catch{return null;}
}
function savedLanguage():string|null{
 try{const f=languageFile();return f&&f.exists?f.textSync().trim():null;}catch{return null;}
}

const Ctx=createContext<LanguageState|null>(null);

/** Wrap the navigation: a language change re-creates the screens so every t() call is fresh. */
export function LanguageProvider({children}:{children:React.ReactNode}){
 const [language,setState]=useState<AppLanguage>(()=>{current=pickLanguage(savedLanguage(),deviceLocale());setCurrentLanguage(current);return current;});
 const setLanguage=useCallback((next:AppLanguage)=>{
  current=next;setCurrentLanguage(next);setState(next);
  try{void Promise.resolve(languageFile()?.write(next)).catch(()=>{});}catch{/* the choice still applies until the app closes */}
 },[]);
 const value=useMemo(()=>({language,setLanguage,locale:localeTag(language)}),[language,setLanguage]);
 return <Ctx.Provider value={value}><React.Fragment key={language}>{children}</React.Fragment></Ctx.Provider>;
}

export function useLanguage():LanguageState{
 return useContext(Ctx)??{language:current,setLanguage:()=>{},locale:localeTag(current)};
}
