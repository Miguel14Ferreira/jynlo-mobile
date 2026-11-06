import {nativeRouteForWebLink} from '../src/lib/native-app-links.cjs';

/** Expo Router processes verified HTTPS Android App Links before rendering a screen. */
export function redirectSystemPath({path}:{path:string;initial:boolean}):string{
 return nativeRouteForWebLink(path);
}
