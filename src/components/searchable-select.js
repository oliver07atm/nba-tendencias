export const normalizeSearch=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
export function filterSelectOptions(options,query){const term=normalizeSearch(query);return options.filter(o=>!o.disabled&&normalizeSearch(o.label).includes(term));}
