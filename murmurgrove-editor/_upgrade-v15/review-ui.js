function renderBundleReview(){
 const pane=$('bundle-review');pane.replaceChildren();pane.hidden=state.type!=='exhibitions'||!state.pendingNodes.length;if(pane.hidden)return;
 pane.append(el('h3','',`New linked records · ${state.pendingNodes.length}`),el('p','micro-copy','新档案与这篇展览一起暂存。姓名可以先保留，简介选填。只审核你确认可公开的事实或明确标注的解释。'));
 const eligible=()=>state.pendingNodes.filter(n=>n.type==='people'&&!n.reviewed&&!n.body.trim()&&isBundleLinked(n));
 const reviewTools=el('div','v15-review-tools'),approveAll=el('button','action-link','Review all name-only participants / 批量审核仅姓名的参展者');approveAll.type='button';approveAll.disabled=!eligible().length;
 approveAll.onclick=()=>{const list=eligible();if(!list.length)return;if(!window.confirm(`Confirm that you have checked these ${list.length} participant names, their identity/type and participation against the source, and approve these name-only records for public use?\n\n${list.map(n=>n.name).join('\n')}\n\n确认已核对以上名单及参展关系，同意公开仅姓名的档案。此操作不会发布，也不会审核含简介的记录。`))return;for(const n of list)n.reviewed=true;setDirty();renderBundleReview();refreshV13();warn(`Reviewed ${list.length} name-only participants / 已审核 ${list.length} 个仅姓名的参展者。尚未发布。`);};reviewTools.append(approveAll);pane.append(reviewTools);const reviewList=el('div','v15-review-list');pane.append(reviewList);
 for(const n of state.pendingNodes){const row=el('section','bundle-node v15-review-row');row.append(el('strong','',n.name),el('small','micro-copy',`${n.type} / ${n.slug}`));
  const detail=el('details','v15-review-detail');detail.append(el('summary','','Edit details / 补充或编辑资料（选填）'));let approve;
  function invalidate(){n.reviewed=false;approve.checked=false;setDirty();approveAll.disabled=!eligible().length;}
  if(n.type==='people'){const lab=el('label','micro-copy','Person type / 类型');const select=el('select','bundle-input');for(const k of ['other','artist','collective','curator','writer']){const op=el('option','',k);op.value=k;select.append(op);}select.value=n.kind;select.onchange=()=>{n.kind=select.value;invalidate();};lab.append(select);detail.append(lab);}
  const lab=el('label','micro-copy',n.type==='concepts'?'Definition / your interpretation (optional)':'Verified description or source (optional)');const area=el('textarea','bundle-input');area.rows=3;area.value=n.body;area.oninput=()=>{n.body=area.value;invalidate();};lab.append(area);detail.append(lab);row.append(detail);
  const confirm=el('label','confirmation');approve=el('input');approve.type='checkbox';approve.checked=n.reviewed;approve.onchange=()=>{n.reviewed=approve.checked;setDirty();approveAll.disabled=!eligible().length;};confirm.append(approve,document.createTextNode(' 已核对此记录及关联，可公开 / Reviewed for public use.'));row.append(confirm);
  const remove=el('button','action-link','Remove candidate & links / 移除');remove.type='button';remove.onclick=()=>{if(window.confirm('Remove this staged candidate and its links? Existing archive files are unaffected.'))removeBundleNode(n);};row.append(remove);reviewList.append(row);
 }
 highlightBundleReview();
}
