(() => {
  'use strict';
  const cfg=window.IURAN_CONFIG||{},$=id=>document.getElementById(id);
  const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl||'') && !cfg.supabaseUrl.includes('PROJECT_ID') && cfg.supabasePublishableKey && !cfg.supabasePublishableKey.includes('PASTE_');
  function alert(text,error=true){const el=$('poll-alert');el.textContent=text;el.className='alert '+(error?'error':'success');el.hidden=false;}
  if(!configured||!window.supabase?.createClient){alert('Koneksi Supabase belum siap. Periksa assets/config.js.');$('poll-login-trigger').hidden=true;return;}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
  let session=null,status=null,members=[],contacts=[],codes=new Map(),page=1,pageSize=10;
  const optionLabel=choice=>choice==='A'?'Opsi A · Ello Nada · Rp250.000':'Opsi B · Palnet · Rp300.000';
  function voteLink(code){const url=new URL('persetujuan.html',location.href);url.hash=new URLSearchParams({code}).toString();return url.href;}
  async function copyText(value){if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return;}const input=document.createElement('textarea');input.value=value;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();const ok=document.execCommand('copy');input.remove();if(!ok)throw new Error('Gagal menyalin otomatis.');}
  async function fetchRows(table,columns,order){const result=[];for(let offset=0;;offset+=1000){const {data,error}=await client.from(table).select(columns).order(order).range(offset,offset+999);if(error)throw error;result.push(...data);if(data.length<1000)return result;}}
  function drawStatus(){
    if(!status)return;
    const a=Number(status.a_count||0),b=Number(status.b_count||0),total=a+b,all=Number(status.member_count||0),open=status.is_open;
    $('poll-state').textContent=open?'Voting terbuka':'Voting selesai';$('poll-state').classList.toggle('closed',!open);
    $('poll-turnout').textContent=`${total} dari ${all} anggota telah memilih`;
    $('vote-form').hidden=!open;
    const body=$('poll-result-body');body.replaceChildren();
    if(open){const p=document.createElement('p');p.textContent='Jumlah suara tiap opsi akan diumumkan setelah voting ditutup. Setiap anggota masih dapat memperbarui pilihannya selama voting terbuka.';body.append(p);}
    else{
      const p=document.createElement('p');p.className='poll-decision';p.textContent=`Keputusan bersama: ${optionLabel(status.final_choice)}. ${total} suara telah masuk.`;body.append(p);
      for(const [choice,count] of [['A',a],['B',b]]){
        const row=document.createElement('div');row.className='poll-result-row';
        const line=document.createElement('div');line.className='poll-result-line';const name=document.createElement('span');name.textContent=optionLabel(choice);const value=document.createElement('strong');value.textContent=`${count} suara · ${total?Math.round(count/total*100):0}%`;line.append(name,value);
        const bar=document.createElement('div');bar.className='poll-result-bar';const fill=document.createElement('span');fill.style.width=`${total?count/total*100:0}%`;bar.append(fill);row.append(line,bar);body.append(row);
      }
    }
    $('poll-admin-tally').textContent=`Suara saat ini: A ${a} · B ${b} · ${total}/${all} anggota`;
    $('poll-finalize').hidden=!open;$('poll-generate').disabled=!open;
  }
  async function refreshStatus(){const {data,error}=await client.rpc('iuran_poll_status');if(error){alert('Voting belum siap. Jalankan voting.sql di SQL Editor Supabase: '+error.message);return;}status=data;drawStatus();}
  async function resolveCode(){
    const code=$('vote-code').value.trim().toLowerCase(),label=$('voter-name');
    if(!/^[0-9a-f]{32}$/.test(code)){label.textContent='';return;}
    const {data,error}=await client.rpc('iuran_poll_identity',{p_code:code});
    if(error){label.textContent='Kode belum dapat diperiksa.';return;}
    label.textContent=data?`Undangan untuk ${data.name}${data.choice?' · Pilihan terakhir: '+optionLabel(data.choice):''}`:'Kode undangan tidak ditemukan.';
    if(data?.choice){const radio=document.querySelector(`input[name="choice"][value="${data.choice}"]`);if(radio)radio.checked=true;}
  }
  let codeTimer;$('vote-code').addEventListener('input',()=>{clearTimeout(codeTimer);codeTimer=setTimeout(()=>{void resolveCode();},350);});
  const hashCode=new URLSearchParams(location.hash.slice(1)).get('code');if(hashCode){$('vote-code').value=hashCode.trim().toLowerCase();void resolveCode();}
  $('vote-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=$('vote-submit');button.disabled=true;
    try{
      if(!status?.is_open)throw new Error('Voting sudah ditutup.');
      const choice=new FormData(event.currentTarget).get('choice');const code=$('vote-code').value.trim().toLowerCase();
      const {data,error}=await client.rpc('iuran_cast_vote',{p_code:code,p_choice:choice});if(error)throw error;
      $('vote-message').textContent=`Terima kasih, ${data.name}. Pilihan ${optionLabel(data.choice)} berhasil dicatat. Anda dapat mengubahnya selama voting masih terbuka.`;
      await refreshStatus();await resolveCode();
    }catch(e){$('vote-message').textContent='Pilihan belum tersimpan: '+(e.message||'Terjadi kesalahan.');}finally{button.disabled=false;}
  });
  function showAdmin(){const signed=!!session;$('poll-admin').hidden=!signed;$('poll-login-trigger').hidden=signed;if(signed)$('poll-admin-email').textContent='Pengurus: '+session.user.email;}
  function renderMembers(){
    const term=$('poll-member-search').value.trim().toLocaleLowerCase('id'),filtered=members.filter(m=>m.name.toLocaleLowerCase('id').includes(term));
    const max=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,max);
    const list=$('poll-member-list');list.replaceChildren();
    if(!filtered.length){const p=document.createElement('p');p.className='empty';p.textContent='Tidak ada anggota yang cocok.';list.append(p);}
    for(const member of filtered.slice((page-1)*pageSize,page*pageSize)){
      const row=document.createElement('div');row.className='poll-member-row';
      const info=document.createElement('div');const name=document.createElement('strong');name.textContent=member.name;const sub=document.createElement('small');const code=codes.get(member.id),phone=contacts.find(c=>c.member_id===member.id)?.phone;
      sub.textContent=code?(phone?'Tautan siap · nomor WA tersedia':'Tautan siap · nomor WA belum diisi'):'Tautan belum dibuat';info.append(name,sub);row.append(info);
      if(code){
        const actions=document.createElement('div');actions.className='poll-member-actions';const copy=document.createElement('button');copy.type='button';copy.textContent='Salin tautan';copy.addEventListener('click',async()=>{try{await copyText(voteLink(code));copy.textContent='Tersalin';setTimeout(()=>{copy.textContent='Salin tautan';},1800);}catch(e){alert(e.message);}});actions.append(copy);
        if(phone){const wa=document.createElement('a');wa.textContent='Buka WhatsApp';wa.target='_blank';wa.rel='noopener noreferrer';wa.href='https://wa.me/'+phone+'?text='+encodeURIComponent(`Assalamu'alaikum ${member.name}, silakan berikan pilihan untuk kegiatan Halal Bihalal 1448 H Putera Delima. Opsi A: Ello Nada, iuran Rp250.000. Opsi B: Palnet, iuran Rp300.000. Tautan pribadi Anda: ${voteLink(code)}\nMohon gunakan tautan ini untuk menyampaikan pilihan. Terima kasih.`);actions.append(wa);}
        row.append(actions);
      }list.append(row);
    }
    const nav=$('poll-pagination');nav.replaceChildren();
    const label=document.createElement('label');label.className='page-size-label';label.textContent='Tampilkan ';
    const picker=document.createElement('select');picker.setAttribute('aria-label','Undangan per halaman');for(const n of [10,20,50,100])picker.add(new Option(String(n),String(n)));picker.value=String(pageSize);picker.addEventListener('change',()=>{pageSize=Number(picker.value);page=1;renderMembers();});label.append(picker,document.createTextNode(' data'));
    const info=document.createElement('span');info.className='page-info';info.textContent=filtered.length?`${(page-1)*pageSize+1}–${Math.min(page*pageSize,filtered.length)} dari ${filtered.length}`:'0 anggota';
    const buttons=document.createElement('div');buttons.className='page-buttons';for(const [text,target] of [['‹',page-1],['›',page+1]]){const btn=document.createElement('button');btn.type='button';btn.textContent=text;btn.disabled=target<1||target>max;btn.addEventListener('click',()=>{page=target;renderMembers();});buttons.append(btn);}nav.append(label,info,buttons);
  }
  async function loadAdmin(){
    try{
      [members,contacts]=await Promise.all([fetchRows('iuran_members','id,name','name'),fetchRows('iuran_member_contacts','member_id,phone','member_id')]);
      const tokenRows=await fetchRows('iuran_vote_codes','member_id,code','member_id');codes=new Map(tokenRows.map(row=>[row.member_id,row.code]));renderMembers();
    }catch(e){alert('Gagal memuat undangan: '+(e.message||'Terjadi kesalahan.'));}
  }
  $('poll-member-search').addEventListener('input',()=>{page=1;renderMembers();});
  $('poll-generate').addEventListener('click',async()=>{
    const button=$('poll-generate');button.disabled=true;
    try{
      if(!status?.is_open)throw new Error('Voting sudah ditutup.');
      const missing=members.filter(member=>!codes.has(member.id));
      if(!missing.length){alert('Semua anggota sudah memiliki tautan undangan.',false);return;}
      for(let i=0;i<missing.length;i+=100){const batch=missing.slice(i,i+100).map(member=>({member_id:member.id,code:crypto.randomUUID().replace(/-/g,'')}));const {error}=await client.from('iuran_vote_codes').insert(batch);if(error)throw error;}
      await loadAdmin();alert(`${missing.length} tautan undangan berhasil dibuat.`,false);
    }catch(e){await loadAdmin();alert('Gagal menyiapkan tautan: '+(e.message||'Terjadi kesalahan.'));}finally{button.disabled=false;drawStatus();}
  });
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
      session=data.session;$('poll-login').close();$('poll-password').value='';showAdmin();await loadAdmin();await refreshStatus();
    }catch(e){$('poll-login-error').textContent=e.message||'Gagal masuk.';$('poll-login-error').hidden=false;}finally{button.disabled=false;}
  });
  $('poll-logout').addEventListener('click',async()=>{await client.auth.signOut();session=null;codes=new Map();members=[];contacts=[];showAdmin();});
  async function init(){await refreshStatus();const {data}=await client.auth.getSession();session=data.session;if(session){const {data:admin,error}=await client.from('iuran_admins').select('id').eq('id',session.user.id).maybeSingle();if(error||!admin){await client.auth.signOut();session=null;}}showAdmin();if(session)await loadAdmin();}
  void init();
})();
