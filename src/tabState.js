// src/tabState.js
// Neden ayrı dosya: visualGenerator.js "Prompt Üretici'den Al" butonunda switchTab
// çağırıyor; switchTab main.js'te olsaydı main.js -> visualGenerator.js -> main.js
// döngüsü oluşurdu. Bu yüzden sekme geçişi kendi başına bağımsız bir modül.

import { notifyTabChange } from './state.js';

const VIEWS = {
  gallery: 'galleryView',
  maker: 'makerView',
  visual: 'visualView',
  avatar: 'avatarView',
  profile: 'profileView'
};

export function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById(VIEWS.gallery).style.display = tab === 'gallery' ? 'flex' : 'none';
  document.getElementById(VIEWS.maker).style.display = tab === 'maker' ? 'block' : 'none';
  document.getElementById(VIEWS.visual).style.display = tab === 'visual' ? 'block' : 'none';
  document.getElementById(VIEWS.avatar).style.display = tab === 'avatar' ? 'block' : 'none';
  // profileView bir grid container (.profile-layout); 'block' verilirse
  // sidebar + main düz akışta üst üste diziliyordu.
  document.getElementById(VIEWS.profile).style.display = tab === 'profile' ? 'grid' : 'none';
  notifyTabChange(tab);
}