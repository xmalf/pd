(() => {
  'use strict';
  const TARGET = 250000;
  const cfg = window.IURAN_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const money = (n) => new Intl.NumberFormat('id-ID', {style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n || 0);
  const date = (v) => new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(v + 'T00:00:00Z'));
  const jakartaToday = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl || '') && !cfg.supabaseUrl.includes('PROJECT_ID') && cfg.supabasePublishableKey && !cfg.supabasePublishableKey.includes('PASTE_');
  const page = document.body.dataset.page;
  let client, members = [], payments = [], session = null;
  function message(text, type='error') { const el=$('alert'); el.textContent=text; el.className='alert '+type; el.hidden=false; el.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  function clearMessage() { $('alert').hidden=true; }
  function errorText(e) { if (e && e.code === '42501') return 'Akun ini belum didaftarkan sebagai pengurus. Periksa tabel iuran_admins.'; return e?.message || 'Terjadi kesalahan. Silakan coba lagi.'; }
  function byMember() { const totals = new Map(); for(const p of payments) totals.set(p.member_id,(totals.get(p.member_id)||0)+Number(p.amount)); return totals; }
  async function fetchAll(table, select, order) {
    const result=[];
    for(let start=0; ; start+=1000) {
      const {data,error}=await client.from(table).select(select).order(order,{ascending:table==='iuran_members'}).range(start,start+999);
      if(error) throw error;
      result.push(...data);
      if(data.length<1000) return result;
    }
  }
  async function load() {
    try {
      [members,payments]=await Promise.all([
        fetchAll('iuran_members','id,name','name'),
        fetchAll('iuran_payments','id,member_id,amount,paid_at,note,created_at','id')
      ]);
      payments.sort((a,b)=> b.paid_at.localeCompare(a.paid_at) || b.id-a.id);
      clearMessage();
      render();
    } catch(e) { message('Gagal memuat data: '+errorText(e)); }
  }
  function render() {
    const totals=byMember(), sum=payments.reduce((n,p)=>n+Number(p.amount),0);
    const paid=members.filter(m=>(totals.get(m.id)||0)>0).length;
    const reached=members.filter(m=>(totals.get(m.id)||0)>=TARGET).length;
    $('total-summary').textContent=money(sum);
    if(page==='input') {
      $('paid-summary').textContent=paid+' anggota sudah iuran';
      $('reached-summary').textContent=reached+' anggota';
      $('members-summary').textContent=members.length+' anggota';
      const sel=$('member'), previous=sel.value;
      sel.replaceChildren(new Option('Pilih anggota',''));
      for(const m of members) sel.add(new Option(m.name,String(m.id)));
      sel.value=members.some(m=>String(m.id)===previous)?previous:'';
      updateMemberHint();
      renderRecent();
    } else {
      $('paid-summary').textContent=paid+' / '+members.length;
      $('reached-summary').textContent=String(reached);
      $('unpaid-summary').textContent=String(members.length-paid);
      renderList();
    }
  }
  function updateMemberHint(){const id=Number($('member').value),el=$('member-paid');el.hidden=!id;if(id)el.textContent='Sudah dibayar: '+money(byMember().get(id)||0);}
  function renderRecent(){
    $('recent-count').textContent=payments.length+' pembayaran';
    const target=$('recent-list');target.replaceChildren();
    if(!payments.length){const p=document.createElement('p');p.className='empty';p.textContent='Belum ada pembayaran.';target.append(p);return;}
    for(const p of payments.slice(0,15)){
      const row=document.createElement('div');row.className='recent-item';
      const left=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('span');
      name.textContent=members.find(m=>m.id===p.member_id)?.name||'Anggota';
      detail.textContent=date(p.paid_at)+(p.note?' · '+p.note:'');left.append(name,detail);
      const right=document.createElement('div');right.className='recent-right';const value=document.createElement('b');value.textContent=money(p.amount);
      const del=document.createElement('button');del.type='button';del.textContent='Hapus';del.addEventListener('click',()=>removePayment(p.id));right.append(value,del);row.append(left,right);target.append(row);
    }
  }
  async function removePayment(id){
    if(!confirm('Hapus pembayaran ini? Total iuran anggota akan berubah.'))return;
    const {error}=await client.from('iuran_payments').delete().eq('id',id).select('id');
    if(error){message(errorText(error));return;}
    await load();message('Pembayaran dihapus.','success');
  }
  function renderList(){
    const q=$('search').value.trim().toLocaleLowerCase('id'),filter=$('filter').value,totals=byMember();
    const shown=members.filter(m=>{
      const total=totals.get(m.id)||0;
      return m.name.toLocaleLowerCase('id').includes(q) && (filter==='all'||filter==='unpaid'&&total===0||filter==='partial'&&total>0&&total<TARGET||filter==='reached'&&total>=TARGET);
    });
    $('count-label').textContent=shown.length+' anggota ditampilkan';
    const list=$('member-list');list.replaceChildren();
    if(!shown.length){const el=document.createElement('div');el.className='empty';el.textContent=members.length?'Tidak ada anggota sesuai pencarian.':'Belum ada anggota. Pengurus dapat menambahkannya di halaman Input Iuran.';list.append(el);return;}
    shown.forEach((m,i)=>{
      const total=totals.get(m.id)||0, history=payments.filter(p=>p.member_id===m.id);
      const row=document.createElement('div');row.className='member-row';
      const btn=document.createElement('button');btn.type='button';btn.className='row-main';btn.setAttribute('aria-expanded','false');
      const num=document.createElement('span');num.className='number';num.textContent=String(i+1);
      const name=document.createElement('span');name.className='member-name';name.textContent=m.name;
      const small=document.createElement('small');small.textContent=history.length+' pembayaran';name.append(small);
      const badge=document.createElement('span');badge.className='badge '+(total===0?'unpaid':total<TARGET?'partial':'complete');badge.textContent=total===0?'Belum iuran':total<TARGET?'Belum mencapai target':total>TARGET?'Melebihi target':'Target tercapai';
      const value=document.createElement('strong');value.textContent=money(total);
      const arrow=document.createElement('span');arrow.className='chevron';arrow.textContent='⌄';btn.append(num,name,badge,value,arrow);
      const detail=document.createElement('div');detail.className='history';detail.hidden=true;
      if(history.length){const heading=document.createElement('div');heading.className='history-label';heading.textContent='RIWAYAT PEMBAYARAN';detail.append(heading);
        for(const p of history){const item=document.createElement('div');item.className='history-item';const amount=document.createElement('strong');amount.textContent=money(p.amount);const description=document.createElement('span');description.textContent=date(p.paid_at)+(p.note?' · '+p.note:'');item.append(amount,description);detail.append(item);}
      }else{const empty=document.createElement('p');empty.textContent='Anggota ini belum memiliki pembayaran.';detail.append(empty);}
      if(total>0&&total!==TARGET){const rem=document.createElement('p');rem.className='remaining';rem.textContent=total<TARGET?'Sisa menuju target: '+money(TARGET-total):'Lebih dari target: '+money(total-TARGET);detail.append(rem);}
      btn.addEventListener('click',()=>{detail.hidden=!detail.hidden;btn.setAttribute('aria-expanded',String(!detail.hidden));arrow.textContent=detail.hidden?'⌄':'⌃';});row.append(btn,detail);list.append(row);
    });
  }
  async function handleLogin(event){event.preventDefault();clearMessage();const btn=event.submitter;btn.disabled=true;
    try{const {data,error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;
      const {data:admin,error:adminError}=await client.from('iuran_admins').select('id').eq('id',data.user.id).maybeSingle();if(adminError)throw adminError;
      if(!admin){await client.auth.signOut();throw new Error('Akun ini belum terdaftar sebagai pengurus.');}
      session=data.session;showAuth();await load();
    }catch(e){message(errorText(e));}finally{btn.disabled=false;}
  }
  function showAuth(){const signed=!!session;$('login-panel').hidden=signed;$('admin-area').hidden=!signed;if(signed)$('admin-email').textContent='Pengurus: '+session.user.email;}
  async function initAuth(){const {data}=await client.auth.getSession();session=data.session;
    if(session){const {data:admin,error}=await client.from('iuran_admins').select('id').eq('id',session.user.id).maybeSingle();if(error||!admin){await client.auth.signOut();session=null;}}
    showAuth();if(session)await load();
  }
  async function addMembers(event){event.preventDefault();clearMessage();const btn=$('save-members');btn.disabled=true;
    try{
      const raw=$('names').value.split(/[\n,;]+/).map(v=>v.trim().replace(/\s+/g,' ')).filter(Boolean);
      if(!raw.length||raw.length>200||raw.some(v=>v.length>100))throw new Error('Masukkan 1–200 nama, maksimal 100 karakter per nama.');
      const known=new Set(members.map(m=>m.name.toLocaleLowerCase('id')));
      const names=raw.filter(v=>{const key=v.toLocaleLowerCase('id');if(known.has(key))return false;known.add(key);return true;});
      if(names.length){const {error}=await client.from('iuran_members').insert(names.map(name=>({name})));if(error)throw error;}
      $('names').value='';await load();message(names.length+' anggota ditambahkan'+(raw.length-names.length?', '+(raw.length-names.length)+' nama sudah ada':'')+'.','success');
    }catch(e){message(errorText(e));}finally{btn.disabled=false;}
  }
  async function addPayment(event){event.preventDefault();clearMessage();const btn=$('save-payment');btn.disabled=true;
    try{
      const member_id=Number($('member').value),amount=Number($('amount').value),paid_at=$('paid-at').value,note=$('note').value.trim();
      if(!members.some(m=>m.id===member_id))throw new Error('Pilih anggota yang terdaftar.');
      if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000)throw new Error('Nominal harus antara Rp1 dan Rp1 miliar.');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(paid_at))throw new Error('Tanggal pembayaran tidak valid.');
      const {error}=await client.from('iuran_payments').insert({member_id,amount,paid_at,note:note||null});if(error)throw error;
      $('amount').value='';$('note').value='';await load();message('Pembayaran berhasil dicatat.','success');
    }catch(e){message(errorText(e));}finally{btn.disabled=false;}
  }
  if(!configured){$('setup').hidden=false;if(page==='rekap'){$('count-label').textContent='Belum dikonfigurasi';$('member-list').replaceChildren();}return;}
  if(!window.supabase?.createClient){message('Pustaka Supabase gagal dimuat. Periksa koneksi internet dan muat ulang.');return;}
  client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
  if(page==='input'){
    $('paid-at').value=jakartaToday();$('member').addEventListener('change',updateMemberHint);
    $('login-form').addEventListener('submit',handleLogin);$('payment-form').addEventListener('submit',addPayment);$('members-form').addEventListener('submit',addMembers);
    $('logout').addEventListener('click',async()=>{await client.auth.signOut();session=null;showAuth();clearMessage();});
    void initAuth();
  }else{$('search').addEventListener('input',renderList);$('filter').addEventListener('change',renderList);void load();}
})();
