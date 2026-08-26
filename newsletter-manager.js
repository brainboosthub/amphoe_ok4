(() => {
  'use strict';
  const API='https://script.google.com/macros/s/AKfycbxvqWwNRKu5GpoVRyDZGdwXRy6ubEgPAg2-stv-G-arF4HRoqkAfP21oTl124ne6CvZ/exec';
  const state={items:[],query:'',page:1,perPage:5};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const validUrl=v=>{try{const u=new URL(v);return /^https?:$/.test(u.protocol)}catch(_){return false}};
  async function api(action,data={}){
    const token=sessionStorage.getItem('mysiteAdminToken')||'';
    const res=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({mode:'activityadmin',action,data,token})});
    const out=await res.json(); if(!out.success) throw new Error(out.message||'ดำเนินการไม่สำเร็จ'); return out.data;
  }
  async function load(){const data=await api('list');state.items=data.items||[];}
  function filtered(){return state.items.filter(x=>String(x.title||'').toLowerCase().includes(state.query.toLowerCase()))}
  function managerHtml(){
    const all=filtered(),pages=Math.max(1,Math.ceil(all.length/state.perPage));state.page=Math.min(state.page,pages);
    const rows=all.slice((state.page-1)*5,state.page*5).map(x=>`<tr><td>${esc(x.title)}</td><td><img class="newsletter-thumb" data-image="${esc(x.image)}" src="${esc(x.image)}" alt="${esc(x.title)}"></td><td>${x.url?`<a class="newsletter-link" href="${esc(x.url)}" target="_blank" rel="noopener">คลิกเพื่อดูรายละเอียด</a>`:'<span class="newsletter-empty-url">ไม่ได้ระบุ url รายละเอียด</span>'}</td><td>${esc(x.date)}</td><td><div class="newsletter-actions"><button class="newsletter-btn newsletter-edit" data-edit="${x.rowNumber}">แก้ไข</button><button class="newsletter-btn newsletter-delete" data-delete="${x.rowNumber}">ลบ</button></div></td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center">ไม่พบรายการ</td></tr>';
    const nav=Array.from({length:pages},(_,i)=>`<button data-page="${i+1}" class="${state.page===i+1?'active':''}">${i+1}</button>`).join('');
    return `<div class="newsletter-popup"><div class="newsletter-toolbar"><b class="newsletter-total">จำนวนรายการทั้งหมด ${all.length} รายการ</b><input id="newsletterSearch" class="newsletter-search" value="${esc(state.query)}" placeholder="ค้นหาเรื่อง"><button id="newsletterAdd" class="newsletter-btn newsletter-add">+เพิ่มรายการ</button></div><div class="newsletter-table-wrap"><table class="newsletter-table"><thead><tr><th>เรื่อง</th><th>ภาพปก</th><th>url รายละเอียด</th><th>วันที่</th><th>จัดการ</th></tr></thead><tbody>${rows}</tbody></table></div><div class="newsletter-pages">${nav}</div></div>`;
  }
  function bindManager(){
    const q=document.getElementById('newsletterSearch');q?.addEventListener('input',e=>{state.query=e.target.value;state.page=1;rerender()});
    document.getElementById('newsletterAdd')?.addEventListener('click',()=>openEditor());
    document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{state.page=+b.dataset.page;rerender()});
    document.querySelectorAll('[data-image]').forEach(img=>img.onclick=()=>Swal.fire({imageUrl:img.dataset.image,imageAlt:'ภาพปก',showConfirmButton:false,showCloseButton:true,width:'min(900px,95vw)',customClass:{image:'newsletter-image-large'}}));
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(state.items.find(x=>x.rowNumber===+b.dataset.edit)));
    document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>remove(+b.dataset.delete));
  }
  function rerender(){const box=document.querySelector('.swal2-html-container');if(box){box.innerHTML=managerHtml();bindManager()}}
  async function openManager(){
    Swal.fire({title:'กำลังโหลด...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
    try{await load();state.query='';state.page=1;await Swal.fire({title:'เพิ่ม/ลบ จดหมายข่าว',html:managerHtml(),width:'min(1250px,97vw)',showConfirmButton:false,showCloseButton:true,didOpen:bindManager})}catch(e){Swal.fire('เกิดข้อผิดพลาด',e.message,'error')}
  }
  async function compress(file){
    if(!file.type.startsWith('image/'))throw new Error('กรุณาเลือกไฟล์รูปภาพ');
    const data=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(file)});
    const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=data});
    let scale=Math.min(1,1280/Math.max(img.width,img.height)),quality=.74,result='';
    for(let n=0;n<5;n++){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);result=c.toDataURL('image/jpeg',quality);if(result.length<900000)break;scale*=.78;quality=Math.max(.52,quality-.06)}
    return {dataUrl:result,fileName:(file.name.replace(/\.[^.]+$/,'')||'newsletter')+'.jpg'};
  }
  async function openEditor(item){
    const editing=!!item;let upload=null;
    const html=`<div class="newsletter-form"><label>เรื่อง *<input id="nlTitle" value="${esc(item?.title||'')}"></label><label>URL รูปภาพ<input id="nlImageUrl" type="url" value="${esc(item?.image||'')}" placeholder="https://..."></label><label>หรืออัปโหลดรูปภาพ<input id="nlFile" type="file" accept="image/*"></label><span class="newsletter-hint">ระบบจะย่อรูปก่อนส่งและบันทึกลง Google Drive</span><img id="nlPreview" class="newsletter-preview" ${item?.image?`src="${esc(item.image)}"`:'hidden'}><label>url รายละเอียด (เว้นว่างได้)<input id="nlDetail" type="url" value="${esc(item?.url||'')}" placeholder="https://..."></label></div>`;
    const result=await Swal.fire({title:editing?'แก้ไขจดหมายข่าว':'เพิ่มจดหมายข่าว',html,showCancelButton:true,confirmButtonText:editing?'บันทึกการแก้ไข':'เพิ่มรายการ',cancelButtonText:'ยกเลิก',confirmButtonColor:'#16a34a',didOpen:()=>{document.getElementById('nlFile').onchange=async e=>{try{Swal.showLoading();upload=await compress(e.target.files[0]);const p=document.getElementById('nlPreview');p.src=upload.dataUrl;p.hidden=false;Swal.hideLoading()}catch(err){upload=null;Swal.showValidationMessage(err.message)}}},preConfirm:()=>{const title=document.getElementById('nlTitle').value.trim(),imageUrl=document.getElementById('nlImageUrl').value.trim(),url=document.getElementById('nlDetail').value.trim();if(!title)return Swal.showValidationMessage('กรุณากรอกเรื่อง');if(!upload&&!imageUrl)return Swal.showValidationMessage('กรุณาอัปโหลดรูปหรือใส่ URL รูปภาพ');if(imageUrl&&!validUrl(imageUrl))return Swal.showValidationMessage('URL รูปภาพไม่ถูกต้อง');if(url&&!validUrl(url))return Swal.showValidationMessage('url รายละเอียดไม่ถูกต้อง');return {rowNumber:item?.rowNumber||0,title,imageUrl,url,imageData:upload?.dataUrl||'',imageName:upload?.fileName||''}}});
    if(!result.isConfirmed)return openManager();
    Swal.fire({title:'กำลังบันทึก...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
    try{await api('save',result.value);document.dispatchEvent(new Event('activity-admin-updated'));await openManager()}catch(e){Swal.fire('บันทึกไม่สำเร็จ',e.message,'error')}
  }
  async function remove(rowNumber){const ok=await Swal.fire({title:'ยืนยันการลบ?',text:'รายการจะถูกลบออกจากชีต',icon:'warning',showCancelButton:true,confirmButtonText:'ลบ',cancelButtonText:'ยกเลิก',confirmButtonColor:'#dc2626'});if(!ok.isConfirmed)return;try{await api('delete',{rowNumber});document.dispatchEvent(new Event('activity-admin-updated'));await openManager()}catch(e){Swal.fire('ลบไม่สำเร็จ',e.message,'error')}}
  document.addEventListener('DOMContentLoaded',()=>document.getElementById('manageNewsletterButton')?.addEventListener('click',openManager));
})();
