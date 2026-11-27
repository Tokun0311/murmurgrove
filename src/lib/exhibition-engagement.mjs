export const engagementOf=(d)=>d.engagement||'visited';
export const engagementLabel=(d)=>({visited:'Visited',researched:'Researched',planned:'Planned'})[engagementOf(d)];
export const archiveDate=(d)=>engagementOf(d)==='researched'?d.researchOn:engagementOf(d)==='planned'?d.recordedOn:d.visitedOn;
export const archiveDay=(d)=>{const date=archiveDate(d);return date?new Date(date).toISOString().slice(0,10):'';};
