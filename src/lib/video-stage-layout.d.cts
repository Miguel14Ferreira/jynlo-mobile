export declare function chooseVideoStageTracks<T extends {participant:{isLocal:boolean}}>(tracks:readonly T[],maxPreviews?:number):{dominant:T|null;previews:T[];remaining:number};
export declare function videoStageDimensions(width:number,height:number,expanded?:boolean):{stageHeight:number;previewWidth:number;previewHeight:number};
