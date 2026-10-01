(() => {
  'use strict';
  const cfg=window.IURAN_CONFIG||{},bucket='iuran-galeri';
  const $=id=>document.getElementById(id);
  const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl||'') && !cfg.supabaseUrl.includes('PROJECT_ID') && cfg.supabasePublishableKey && !cfg.supabasePublishableKey.includes('PASTE_');
  function notice(text,error=false){const el=$('gallery-message');el.textContent=text;el.className='alert '+(error?'error':'success');el.hidden=false;}
  if(!configured||!window.supabase?.createClient){notice('Koneksi Supabase belum siap. Periksa assets/config.js dan koneksi internet.',true);$('login-trigger').hidden=true;return;}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
  let session=null,rows=[];
  function showAuth(){const signed=!!session;$('gallery-guest').hidden=signed;$('gallery-admin').hidden=!signed;$('login-trigger').hidden=signed;if(signed)$('admin-email').textContent='Pengurus: '+session.user.email;}
  async function isAdmin(){const {data,error}=await client.from('iuran_admins').select('id').eq('id',session.user.id).maybeSingle();if(error)throw error;return !!data;}
  async function refresh(){
    if(!session)return;
    const {data,error}=await client.from('iuran_gallery').select('id,storage_path,caption,alt_text').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100);
    if(error){notice('Galeri belum siap. Jalankan supabase.sql terbaru di SQL Editor: '+error.message,true);return;}
    rows=data||[];$('gallery-count').textContent=rows.length+' foto';const list=$('gallery-manage');list.replaceChildren();
    if(!rows.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='Belum ada foto di Supabase. Unggah foto pertama di atas.';list.append(empty);return;}
    for(const row of rows){
      const item=document.createElement('article');item.className='gallery-manage-item';
      const img=document.createElement('img');img.src=client.storage.from(bucket).getPublicUrl(row.storage_path).data.publicUrl;img.alt=row.alt_text||row.caption;img.loading='lazy';
      const meta=document.createElement('div');meta.className='gallery-manage-meta';const caption=document.createElement('strong');caption.textContent=row.caption;const alt=document.createElement('small');alt.textContent='Alt: '+(row.alt_text||row.caption);meta.append(caption,alt);
      const button=document.createElement('button');button.type='button';button.textContent='Hapus';button.setAttribute('aria-label','Hapus foto '+row.caption);
      button.addEventListener('click',async()=>{
        if(!confirm('Hapus foto “'+row.caption+'” dari galeri?'))return;
        button.disabled=true;
        try{
          const {error:storageError}=await client.storage.from(bucket).remove([row.storage_path]);if(storageError)throw storageError;
          const {error:rowError}=await client.from('iuran_gallery').delete().eq('id',row.id);if(rowError)throw rowError;
          await refresh();notice('Foto berhasil dihapus.');
        }catch(e){notice('Gagal menghapus: '+(e.message||'Terjadi kesalahan.'),true);button.disabled=false;}
      });
      item.append(img,meta,button);list.append(item);
    }
  }
  async function start(){
    try{
      const {data}=await client.auth.getSession();session=data.session;
      if(session&&!await isAdmin()){await client.auth.signOut();session=null;notice('Akun ini belum terdaftar sebagai pengurus.',true);}
      showAuth();if(session){await refresh();await refreshIntro();}
    }catch(e){notice('Gagal memeriksa akun: '+(e.message||'Terjadi kesalahan.'),true);}
  }
  $('login-trigger').addEventListener('click',()=>{$('login-error').hidden=true;$('login-panel').showModal();$('email').focus();});
  $('close-login').addEventListener('click',()=>$('login-panel').close());
  $('login-panel').addEventListener('click',event=>{if(event.target===$('login-panel'))$('login-panel').close();});
  $('login-form').addEventListener('submit',async event=>{
    event.preventDefault();const btn=event.submitter;btn.disabled=true;$('login-error').hidden=true;
    try{
      const {data,error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;
      session=data.session;if(!await isAdmin()){await client.auth.signOut();session=null;throw new Error('Akun ini belum terdaftar sebagai pengurus.');}
      $('password').value='';$('login-panel').close();showAuth();await refresh();await refreshIntro();
    }catch(e){$('login-error').textContent=e.message||'Gagal masuk.';$('login-error').hidden=false;}finally{btn.disabled=false;}
  });
  $('logout').addEventListener('click',async()=>{await client.auth.signOut();session=null;rows=[];$('gallery-message').hidden=true;$('intro-current').replaceChildren();$('intro-status').textContent='';showAuth();});
  $('gallery-form').addEventListener('submit',async event=>{
    event.preventDefault();const btn=$('gallery-upload');btn.disabled=true;
    try{
      if(!session)throw new Error('Masuk sebagai pengurus dahulu.');
      const file=$('gallery-file').files[0],caption=$('gallery-caption').value.trim(),alt_text=$('gallery-alt').value.trim();
      if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size===0||file.size>5*1024*1024)throw new Error('Pilih foto JPG, PNG, atau WebP berukuran maksimal 5 MB.');
      if(!caption||caption.length>120||!alt_text||alt_text.length>160)throw new Error('Isi caption dan alt sesuai batas panjangnya.');
      const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type],path=`${crypto.randomUUID()}.${ext}`;
      notice('Mengunggah foto…');
      const {error:uploadError}=await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;
      const {error:rowError}=await client.from('iuran_gallery').insert({storage_path:path,caption,alt_text});
      if(rowError){await client.storage.from(bucket).remove([path]);throw rowError;}
      $('gallery-form').reset();await refresh();notice('Foto berhasil diunggah. Lihat slider di halaman utama.');
    }catch(e){notice('Gagal mengunggah: '+(e.message||'Terjadi kesalahan.'),true);}finally{btn.disabled=false;}
  });
  const videoBucket='iuran-video';
  let activeVideo=null;
  const videoStatus=text=>{$('intro-status').textContent=text;};
  async function refreshIntro(){
    const {data,error}=await client.from('iuran_intro_video').select('id,storage_path').eq('id',1).maybeSingle();
    if(error){videoStatus('Fitur video belum siap. Jalankan supabase.sql terbaru di SQL Editor.');return;}
    activeVideo=data;const container=$('intro-current');container.replaceChildren();
    if(!data){const empty=document.createElement('p');empty.textContent='Belum ada video pembuka. Rekap akan terbuka seperti biasa.';container.append(empty);return;}
    const preview=document.createElement('video');preview.controls=true;preview.preload='metadata';preview.playsInline=true;
    preview.src=client.storage.from(videoBucket).getPublicUrl(data.storage_path).data.publicUrl;
    const remove=document.createElement('button');remove.type='button';remove.className='button secondary';remove.textContent='Hapus video pembuka';
    remove.addEventListener('click',async()=>{
      if(!confirm('Hapus video pembuka dari halaman Rekap?'))return;
      remove.disabled=true;
      try{
        const {error:rowError}=await client.from('iuran_intro_video').delete().eq('id',1);if(rowError)throw rowError;
        const {error:storageError}=await client.storage.from(videoBucket).remove([data.storage_path]);
        await refreshIntro();videoStatus(storageError?'Video dinonaktifkan, tetapi berkas lama belum terhapus dari Storage.':'Video pembuka berhasil dihapus.');
      }catch(e){videoStatus('Gagal menghapus video: '+(e.message||'Terjadi kesalahan.'));remove.disabled=false;}
    });
    container.append(preview,remove);
  }
  $('intro-upload-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=$('intro-upload');button.disabled=true;
    try{
      if(!session)throw new Error('Masuk sebagai pengurus dahulu.');
      const file=$('intro-file').files[0];
      if(!file||!['video/mp4','video/webm'].includes(file.type)||file.size===0||file.size>50*1024*1024)throw new Error('Pilih video MP4 atau WebM berukuran maksimal 50 MB.');
      const ext=file.type==='video/mp4'?'mp4':'webm',path=`${crypto.randomUUID()}.${ext}`;
      videoStatus('Mengunggah video, mohon tunggu…');
      const {error:uploadError}=await client.storage.from(videoBucket).upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;
      const oldPath=activeVideo?.storage_path;
      const {error:rowError}=await client.from('iuran_intro_video').upsert({id:1,storage_path:path,updated_at:new Date().toISOString()},{onConflict:'id'});
      if(rowError){await client.storage.from(videoBucket).remove([path]);throw rowError;}
      $('intro-upload-form').reset();if(oldPath)await client.storage.from(videoBucket).remove([oldPath]);
      await refreshIntro();videoStatus('Video pembuka aktif. Coba buka halaman Rekap.');
    }catch(e){videoStatus('Gagal mengunggah video: '+(e.message||'Terjadi kesalahan.'));}finally{button.disabled=false;}
  });
  void start();
})();
