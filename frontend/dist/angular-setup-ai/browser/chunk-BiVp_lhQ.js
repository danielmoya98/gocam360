import{A as Jc,Nt as _p,Q as Qe,_n as le,l as C,v as Fs}from"./chunk-Bve7f2Ph.js";import{r as Gs}from"./chunk-DlTCiFgP.js";var g=class r{_supabase=C(Gs);_prints=Fs(null);prints=this._prints.asReadonly();mapPrintRow(t){let e=t.photo||{},s=e.guest||t.guest||{},i=e.frame||{},a=e.event||t.event||{};return{id:t.id,eventId:e.event_id||a.id||t.event_id||``,photoId:t.photo_id||t.photoId||e.id,guestId:t.guest_id||t.guestId||s.id,status:t.status||`PENDING`,copies:t.quantity||t.copies||1,quantity:t.quantity||t.copies||1,createdAt:t.requested_at||t.created_at||new Date,requestedAt:t.requested_at||t.created_at,printedAt:t.printed_at,eventTitle:a.name||`Evento 360°`,photo:{id:e.id||t.photo_id,storagePath:e.storage_path||e.storagePath||e.original_path||``,originalPath:e.storage_path||``,thumbnailPath:e.thumbnail_path||e.storage_path||``,width:e.width||1080,height:e.height||1920,guest:{id:s.id||``,name:s.name||`Invitado`,phone:s.phone||``},frame:i.id?{id:i.id,name:i.name||`Marco 360`}:void 0}}}findAll(t,e=!1){return this._prints()&&!e&&!t?_p(this._prints()):Qe((async()=>{let{data:a,error:n}=await this._supabase.from(`print_requests`).select(`
          id,
          photo_id,
          guest_id,
          quantity,
          status,
          requested_at,
          printed_at,
          photo:photos(
            id,
            event_id,
            storage_path,
            thumbnail_path,
            uploaded_at,
            width,
            height,
            event:events(id, name),
            guest:guests(id, name, phone),
            frame:frames(id, name)
          )
        `).order(`requested_at`,{ascending:!1});if(n)throw new Error(n.message||`Error al obtener la cola de impresiones`);let o=(a||[]).map(d=>this.mapPrintRow(d));return t&&t!==`ALL`&&(o=o.filter(d=>d.eventId===t)),o})()).pipe(Jc(i=>{(!t||t===`ALL`)&&this._prints.set(i)}))}updateStatus(t,e){return Qe((async()=>{let i={status:e};e===`PRINTED`&&(i.printed_at=new Date().toISOString());let{data:a,error:n}=await this._supabase.from(`print_requests`).update(i).eq(`id`,t).select(`
          id,
          photo_id,
          guest_id,
          quantity,
          status,
          requested_at,
          printed_at,
          photo:photos(
            id,
            event_id,
            storage_path,
            thumbnail_path,
            uploaded_at,
            width,
            height,
            event:events(id, name),
            guest:guests(id, name, phone),
            frame:frames(id, name)
          )
        `).single();if(n||!a)throw new Error(n?.message||`Error al actualizar el estado de impresión`);return this.mapPrintRow(a)})()).pipe(Jc(i=>{this._prints()&&this._prints.update(a=>(a||[]).map(n=>n.id===t?i:n))}))}completePrint(t){return this.updateStatus(t,`PRINTED`)}subscribeToPrints(t,e){let s=`realtime-prints-${e||`global`}-${Date.now()}`;return this._supabase.subscribeToChannel(s,`print_requests`,()=>{t()})}static ɵfac=function(e){return new(e||r)};static ɵprov=le({token:r,factory:r.ɵfac,providedIn:`root`})};export{g as t};