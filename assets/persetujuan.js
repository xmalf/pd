(() => {
  'use strict';
  const cfg=window.IURAN_CONFIG||{},$=id=>document.getElementById(id);
  const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl||'') && !cfg.supabaseUrl.includes('PROJECT_ID') && cfg.supabasePublishableKey && !cfg.supabasePublishableKey.includes('PASTE_');
  function alert(text,error=true){const el=$('poll-alert');el.textContent=text;el.className='alert '+(error?'error':'success');el.hidden=false;}
  if(!configured||!window.supabase?.createClient){alert('Koneksi Supabase belum siap. Periksa assets/config.js.');$('poll-login-trigger').hidden=true;return;}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
  let session=null,status=null,activeCode=null;
  const optionLabel=choice=>choice==='A'?'Opsi A · Ello Nada · Rp250.000':'Opsi B · Palnet · Rp300.000';
  async function copyText(value){if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return;}const input=document.createElement('textarea');input.value=value;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();const ok=document.execCommand('copy');input.remove();if(!ok)throw new Error('Gagal menyalin otomatis.');}
  async function fetchRows(table,columns,order){const result=[];for(let offset=0;;offset+=1000){const {data,error}=await client.from(table).select(columns).order(order).range(offset,offset+999);if(error)throw error;result.push(...data);if(data.length<1000)return result;}}
  function drawStatus(){
    if(!status)return;
    const a=Number(status.a_count||0),b=Number(status.b_count||0),total=a+b,all=Number(status.member_count||0),open=status.is_open;
    $('poll-state').textContent=open?'Voting terbuka':'Voting selesai';$('poll-state').classList.toggle('closed',!open);
    $('poll-turnout').textContent=`${total} dari ${all} anggota telah memilih`;
    $('claim-form').hidden=!open;
    if(!open)$('vote-form').hidden=true;
    const body=$('poll-result-body');body.replaceChildren();
    if(open){const p=document.createElement('p');p.textContent='Jumlah suara tiap opsi akan diumumkan setelah voting ditutup. Setiap anggota hanya dapat mengirim satu suara.';body.append(p);}
    else{
      const p=document.createElement('p');p.className='poll-decision';p.textContent=`Keputusan bersama: ${optionLabel(status.final_choice)}. ${total} suara telah masuk.`;body.append(p);
      for(const [choice,count] of [['A',a],['B',b]]){
        const row=document.createElement('div');row.className='poll-result-row';
        const line=document.createElement('div');line.className='poll-result-line';const name=document.createElement('span');name.textContent=optionLabel(choice);const value=document.createElement('strong');value.textContent=`${count} suara · ${total?Math.round(count/total*100):0}%`;line.append(name,value);
        const bar=document.createElement('div');bar.className='poll-result-bar';const fill=document.createElement('span');fill.style.width=`${total?count/total*100:0}%`;bar.append(fill);row.append(line,bar);body.append(row);
      }
    }
    $('poll-admin-tally').textContent=`Suara saat ini: A ${a} · B ${b} · ${total}/${all} anggota`;
    $('poll-finalize').hidden=!open;
  }
  async function refreshStatus(){const {data,error}=await client.rpc('iuran_poll_status');if(error){alert('Voting belum siap. Jalankan voting.sql di SQL Editor Supabase: '+error.message);return;}status=data;drawStatus();}
  async function loadMembers(){let data;try{data=await fetchRows('iuran_members','id,name','name');}catch(error){alert('Daftar anggota belum dapat dimuat: '+error.message);return;}const select=$('claim-member');for(const member of data||[])select.add(new Option(member.name,String(member.id)));}
  $('claim-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=$('claim-submit');button.disabled=true;$('claim-message').textContent='Mencocokkan data anggota…';
    try{
      if(!status?.is_open)throw new Error('Voting sudah ditutup.');
      const {data,error}=await client.rpc('iuran_claim_vote_code',{p_member_id:Number($('claim-member').value),p_phone:$('claim-phone').value.trim()});if(error)throw error;
      if(data.already_voted){activeCode=null;$('vote-form').hidden=true;$('claim-message').textContent=`${data.name} sudah mengirim suara. Setiap anggota hanya dapat memilih sekali.`;return;}
      activeCode=data.code;$('voter-name').textContent=`Memilih sebagai ${data.name}`;$('vote-form').hidden=false;$('claim-message').textContent='Data cocok. Silakan tentukan pilihan Anda.';
    }catch(e){activeCode=null;$('vote-form').hidden=true;$('claim-message').textContent=e.message||'Data tidak cocok. Periksa nama dan nomor WhatsApp terdaftar.';}finally{button.disabled=false;}
  });
  $('claim-member').addEventListener('change',()=>{activeCode=null;$('vote-form').hidden=true;$('claim-message').textContent='';});
  $('claim-phone').addEventListener('input',()=>{activeCode=null;$('vote-form').hidden=true;$('claim-message').textContent='';});
  $('vote-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=$('vote-submit');button.disabled=true;
    try{
      if(!status?.is_open)throw new Error('Voting sudah ditutup.');
      if(!activeCode)throw new Error('Cocokkan data anggota terlebih dahulu.');
      const choice=new FormData(event.currentTarget).get('choice');
      const {data,error}=await client.rpc('iuran_cast_vote',{p_code:activeCode,p_choice:choice});if(error)throw error;
      activeCode=null;$('vote-form').hidden=true;$('claim-message').textContent='';$('vote-message').textContent=`Terima kasih, ${data.name}. Pilihan ${optionLabel(data.choice)} berhasil dicatat. Anda hanya dapat memilih sekali.`;
      await refreshStatus();
    }catch(e){$('vote-message').textContent='Pilihan belum tersimpan: '+(e.message||'Terjadi kesalahan.');}finally{button.disabled=false;}
  });
  function showAdmin(){const signed=!!session;$('poll-admin').hidden=!signed;$('poll-login-trigger').hidden=signed;if(signed)$('poll-admin-email').textContent='Pengurus: '+session.user.email;}
  $('poll-copy-group').addEventListener('click',async()=>{const button=$('poll-copy-group');try{const link=new URL('persetujuan.html',location.href).href;await copyText(`Assalamu'alaikum keluarga Putera Delima. Silakan pilih rencana kegiatan Halal Bihalal 1448 H melalui ${link}\nPilih nama dan isi nomor WhatsApp yang terdaftar. Satu anggota hanya dapat mengirim satu suara. Terima kasih.`);button.textContent='Pesan grup tersalin';setTimeout(()=>{button.textContent='Salin pesan untuk grup';},2000);}catch(e){alert(e.message);}});
  $('poll-finalize').addEventListener('click',async()=>{
    const a=Number(status?.a_count||0),b=Number(status?.b_count||0);
    if(a===b){alert('Hasil masih imbang atau belum ada suara. Voting belum dapat ditutup.');return;}
    const winner=a>b?'A':'B';
    if(!confirm(`Tutup voting dan tetapkan ${optionLabel(winner)}? Jumlah suara A ${a}, B ${b}. Setelah ditutup, anggota tidak dapat mengubah suara.`))return;
    const button=$('poll-finalize');button.disabled=true;
    try{const {error}=await client.rpc('iuran_finalize_poll');if(error)throw error;await refreshStatus();alert('Voting ditutup. Hasil akhir telah ditetapkan.',false);}catch(e){alert('Gagal menetapkan hasil: '+(e.message||'Terjadi kesalahan.'));}finally{button.disabled=false;}
  });
  $('poll-login-trigger').addEventListener('click',()=>{$('poll-login-error').hidden=true;$('poll-login').showModal();});
  $('poll-login-close').addEventListener('click',()=>$('poll-login').close());
  $('poll-login').addEventListener('click',event=>{if(event.target===$('poll-login'))$('poll-login').close();});
  $('poll-login-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=event.submitter;button.disabled=true;$('poll-login-error').hidden=true;
    try{
      const {data,error}=await client.auth.signInWithPassword({email:$('poll-email').value.trim(),password:$('poll-password').value});if(error)throw error;
      const {data:admin,error:adminError}=await client.from('iuran_admins').select('id').eq('id',data.user.id).maybeSingle();if(adminError)throw adminError;
      if(!admin){await client.auth.signOut();throw new Error('Akun ini belum terdaftar sebagai pengurus.');}
      session=data.session;$('poll-login').close();$('poll-password').value='';showAdmin();await refreshStatus();
    }catch(e){$('poll-login-error').textContent=e.message||'Gagal masuk.';$('poll-login-error').hidden=false;}finally{button.disabled=false;}
  });
  $('poll-logout').addEventListener('click',async()=>{await client.auth.signOut();session=null;showAdmin();});
  async function init(){await refreshStatus();const {data}=await client.auth.getSession();session=data.session;if(session){const {data:admin,error}=await client.from('iuran_admins').select('id').eq('id',session.user.id).maybeSingle();if(error||!admin){await client.auth.signOut();session=null;}}showAdmin();await loadMembers();}
  void init();
})();
