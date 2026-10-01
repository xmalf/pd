(() => {
  'use strict';
  const cfg=window.IURAN_CONFIG||{};
  const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl||'') && !cfg.supabaseUrl.includes('PROJECT_ID') && cfg.supabasePublishableKey && !cfg.supabasePublishableKey.includes('PASTE_');
  if(!configured||!window.supabase?.createClient)return;
  const dialog=document.getElementById('intro-video-dialog'),video=document.getElementById('intro-video');
  if(!dialog||!video)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  function close(){video.pause();dialog.close();}
  document.getElementById('intro-video-close').addEventListener('click',close);
  document.getElementById('intro-video-continue').addEventListener('click',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  dialog.addEventListener('close',()=>{video.pause();});
  video.addEventListener('error',()=>{if(dialog.open)close();});
  async function openIntro(){
    const {data,error}=await client.from('iuran_intro_video').select('storage_path').eq('id',1).maybeSingle();
    if(error||!data?.storage_path)return;
    video.src=client.storage.from('iuran-video').getPublicUrl(data.storage_path).data.publicUrl;
    dialog.showModal();
    try{await video.play();}catch(e){/* Browser may require the visitor to press Play. */}
  }
  void openIntro();
})();
