/* =========================================================
   FAMOSDA — script.js
   Semua interaksi halaman ada di sini, dikelompokkan per fitur.
   ========================================================= */

// ---------- 1. Menu mobile (buka/tutup) ----------
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');

menuToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.classList.toggle('open', isOpen);
  menuToggle.setAttribute('aria-expanded', isOpen);
});

// ---------- 2. Navigasi: highlight saat menu ditekan ----------
// Saat sebuah menu diklik, menu itu langsung diberi highlight ("active")
// tanpa menunggu proses scroll selesai, plus efek flash singkat (.pressed)
// sebagai umpan balik visual. Kelas .pressed didefinisikan di style.css.
const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    // highlight menu yang ditekan
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    // efek highlight sementara (flash), hilang otomatis setelah 350ms
    link.classList.add('pressed');
    setTimeout(() => link.classList.remove('pressed'), 350);

    // tutup menu mobile setelah salah satu link ditekan
    mainNav.classList.remove('open');
    menuToggle.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

// ---------- 3. Navigasi: highlight otomatis mengikuti scroll ----------
// Melengkapi highlight klik di atas — saat pengguna scroll manual (bukan klik menu),
// menu yang aktif tetap mengikuti section mana yang sedang terlihat di layar.
const sections = document.querySelectorAll('main section[id]');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
      });
    }
  });
}, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

sections.forEach(section => sectionObserver.observe(section));

// ---------- 4. Tombol Hero: modal sambutan kustom (bukan alert bawaan browser) ----------
// Modal ini menggantikan alert() bawaan supaya bisa menampilkan foto dan
// tidak menampilkan tulisan "localhost:... menyatakan" dari browser.
// Setelah modal ditutup lewat tombol "Oke", halaman baru scroll ke Student's.
const heroBtn = document.getElementById('heroBtn');
const welcomeModal = document.getElementById('welcomeModal');
const modalClose = document.getElementById('modalClose');
const modalOk = document.getElementById('modalOk');

function openWelcomeModal() {
  welcomeModal.classList.add('open');
  document.body.style.overflow = 'hidden'; // kunci scroll halaman selama modal terbuka
}
function closeWelcomeModal(scrollToStudents) {
  welcomeModal.classList.remove('open');
  document.body.style.overflow = '';
  if (scrollToStudents) {
    document.getElementById('students').scrollIntoView({ behavior: 'smooth' });
  }
}

heroBtn.addEventListener('click', (e) => {
  e.preventDefault(); // tampilkan modal dulu, jangan langsung lompat ke #students
  openWelcomeModal();
});
modalOk.addEventListener('click', () => closeWelcomeModal(true));
modalClose.addEventListener('click', () => closeWelcomeModal(false));
welcomeModal.addEventListener('click', (e) => {
  if (e.target === welcomeModal) closeWelcomeModal(false); // klik area gelap di luar box
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && welcomeModal.classList.contains('open')) {
    closeWelcomeModal(false);
  }
});

// ---------- 5. Navbar: dropdown Musik & Game ----------
const musicToggleBtn = document.getElementById('musicToggle');
const musicPanel = document.getElementById('musicPanel');
const gameToggleBtn = document.getElementById('gameToggle');
const gamePanel = document.getElementById('gamePanel');

function openDropdown(panel, btn) {
  panel.classList.add('open');
  btn.setAttribute('aria-expanded', 'true');
}
function closeDropdown(panel) {
  panel.classList.remove('open');
  const btn = panel.closest('.header-dropdown').querySelector('.icon-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-panel.open').forEach(closeDropdown);
}
function toggleDropdown(panel, btn) {
  const isOpen = panel.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) openDropdown(panel, btn);
}

musicToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleDropdown(musicPanel, musicToggleBtn);
});
gameToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleDropdown(gamePanel, gameToggleBtn);
});

// klik di dalam panel tidak boleh langsung menutup panel itu sendiri
document.querySelectorAll('.dropdown-panel').forEach(panel => {
  panel.addEventListener('click', (e) => e.stopPropagation());
});
// klik di luar panel manapun -> tutup semua dropdown
document.addEventListener('click', () => closeAllDropdowns());
// tombol Escape -> tutup semua dropdown
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllDropdowns();
});

// ---------- 6. Pemutar musik: 5 slot lagu ----------
// EDIT MUSIK: isi src="" pada tiap <audio> di dalam #musicPanel (index.html)
// dengan path file mp3 asli, contoh: src="musik/lagu1.mp3"
document.querySelectorAll('#musicPanel .song-item').forEach(item => {
  const playBtn = item.querySelector('.song-play');
  const audio = item.querySelector('audio');

  playBtn.addEventListener('click', () => {
    const isPlaying = !audio.paused;

    // pastikan cuma satu lagu yang main dalam satu waktu
    document.querySelectorAll('#musicPanel audio').forEach(a => {
      if (a !== audio) { a.pause(); a.currentTime = 0; }
    });
    document.querySelectorAll('#musicPanel .song-play').forEach(b => {
      if (b !== playBtn) { b.classList.remove('playing'); b.textContent = '▶'; }
    });

    if (isPlaying) {
      audio.pause();
      playBtn.classList.remove('playing');
      playBtn.textContent = '▶';
    } else {
      audio.play()
        .then(() => {
          playBtn.classList.add('playing');
          playBtn.textContent = '❚❚';
        })
        .catch(() => {
          console.warn('Belum ada file musik untuk slot ini. Isi atribut src pada <audio>.');
        });
    }
  });

  audio.addEventListener('ended', () => {
    playBtn.classList.remove('playing');
    playBtn.textContent = '▶';
  });
});

// ---------- 7. Menu game: 3 mode permainan ----------
document.querySelectorAll('.game-mode').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    const isFuture = link.dataset.future === 'true';
    if (!href || href === '#' || isFuture) {
      e.preventDefault();
      // Show a friendly, non-intrusive toast instead of alert
      const modeName = link.querySelector('span:last-child').textContent;
      _showGameToast(`"${modeName}" belum tersedia — segera hadir!`);
    }
    // If href is a real link, let default behaviour open it
  });
});

/** Temporary toast notification (replaces alert for game mode) */
function _showGameToast(message) {
  const existing = document.getElementById('_gameToast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = '_gameToast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '28px', left: '50%',
    transform: 'translateX(-50%)',
    background: '#1A1A2E', color: '#FFD700',
    border: '1px solid #FFD700',
    padding: '10px 22px', borderRadius: '10px',
    fontFamily: 'monospace', fontSize: '14px',
    zIndex: '9999', opacity: '0',
    transition: 'opacity 0.25s ease',
    pointerEvents: 'none',
  });
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 2800);
}

// ---------- 7b. Link Instagram (blok "About us") ----------
// EDIT INSTAGRAM: ganti href="#" pada .about-block--link (index.html)
// dengan link akun Instagram kelas asli, contoh: href="https://instagram.com/famosda_class"
const igLink = document.querySelector('.about-block--link');
if (igLink) {
  igLink.addEventListener('click', (e) => {
    const href = igLink.getAttribute('href');
    if (!href || href === '#') {
      e.preventDefault();
      alert('Link Instagram belum diisi. Tambahkan URL akun Instagram pada atribut href.');
    }
  });
}

// ---------- 8. Pencarian siswa (filter grid) ----------
const searchInput = document.getElementById('studentSearch');
const cards = document.querySelectorAll('#contentGrid .content-card');
const noResults = document.getElementById('noResults');

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;

  cards.forEach(card => {
    const name = (card.dataset.name || '').toLowerCase();
    const match = name.includes(query);
    card.style.display = match ? '' : 'none';
    if (match) visibleCount++;
  });

  noResults.classList.toggle('show', visibleCount === 0);
});

// ---------- 9. Log saat gambar di grid berhasil dimuat ----------
// EDIT FOTO: ganti atribut src="" pada tiap <img class="content-image">
// di dalam #contentGrid (lihat index.html) dengan path foto asli kamu,
// misalnya src="foto/siswa1.jpg". Begitu foto berhasil dimuat di browser,
// pesan berikut akan muncul di Console (klik kanan halaman -> Inspect -> tab Console).
const gridImages = document.querySelectorAll('#contentGrid .content-image');

gridImages.forEach(img => {
  img.addEventListener('load', () => {
    console.log(`Gambar berhasil dimuat: ${img.alt}`);
  });
});

// ---------- 10. Tahun otomatis di footer ----------
document.getElementById('year').textContent = new Date().getFullYear();

// ---------- 11. Moments: carousel foto & video (mode fokus di tengah) ----------
// EDIT FOTO & VIDEO: isi atribut src="" pada <img>/<source> di dalam #momentsTrack
// (lihat index.html) dengan path foto/video asli, contoh: src="foto/momen1.jpg".
//
// Cara kerja: hanya 1 item yang "aktif" (fokus, tajam, ukuran penuh) di tengah
// panggung pada satu waktu. Item di kiri/kanannya otomatis blur + redup (diatur
// lewat class .is-active di CSS). Setiap kali di-scroll/swipe atau tombol panah
// ditekan, script ini mendeteksi item mana yang paling dekat ke tengah panggung
// lalu menandainya aktif, dan mensinkronkan dot + status tombol panah.
const momentsViewport = document.getElementById('momentsViewport');
const momentsTrack = document.getElementById('momentsTrack');
const momentsPrev = document.getElementById('momentsPrev');
const momentsNext = document.getElementById('momentsNext');
const momentsDots = document.getElementById('momentsDots');

if (momentsViewport && momentsTrack && momentsPrev && momentsNext) {
  const momentItems = Array.from(momentsTrack.children);

  // Cari index item yang titik tengahnya paling dekat dengan titik tengah panggung,
  // lalu tandai item itu sebagai aktif (.is-active) dan sinkronkan dot yang sesuai.
  function refreshActiveItem() {
    const viewportRect = momentsViewport.getBoundingClientRect();
    const stageCenter = viewportRect.left + viewportRect.width / 2;

    let activeIndex = 0;
    let closestDistance = Infinity;
    momentItems.forEach((item, i) => {
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.left + itemRect.width / 2;
      const distance = Math.abs(itemCenter - stageCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = i;
      }
    });

    momentItems.forEach((item, i) => item.classList.toggle('is-active', i === activeIndex));

    const dots = momentsDots.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));

    momentsPrev.disabled = activeIndex <= 0;
    momentsNext.disabled = activeIndex >= momentItems.length - 1;

    return activeIndex;
  }

  // Geser 1 item ke kiri/kanan dari posisi aktif saat ini, lalu pusatkan otomatis.
  function goToIndex(index) {
    const clamped = Math.max(0, Math.min(momentItems.length - 1, index));
    momentItems[clamped].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  // Satu dot untuk satu item — klik dot langsung memusatkan item terkait.
  function buildDots() {
    momentsDots.innerHTML = '';
    momentItems.forEach((item, i) => {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Ke momen ${i + 1}`);
      dot.addEventListener('click', () => goToIndex(i));
      momentsDots.appendChild(dot);
    });
  }

  momentsPrev.addEventListener('click', () => goToIndex(refreshActiveItem() - 1));
  momentsNext.addEventListener('click', () => goToIndex(refreshActiveItem() + 1));

  // Swipe manual (mobile) atau scroll trackpad juga ikut memperbarui item aktif,
  // dot, dan status tombol panah — di-throttle lewat requestAnimationFrame.
  let momentsScrollTicking = false;
  momentsViewport.addEventListener('scroll', () => {
    if (momentsScrollTicking) return;
    momentsScrollTicking = true;
    requestAnimationFrame(() => {
      refreshActiveItem();
      momentsScrollTicking = false;
    });
  });

  // Saat layar di-resize/rotasi, lebar frame aktif (--active-width) ikut berubah —
  // item aktif dipusatkan ulang secara instan supaya posisinya tetap presisi.
  let momentsResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(momentsResizeTimer);
    momentsResizeTimer = setTimeout(() => {
      const activeIndex = refreshActiveItem();
      momentItems[activeIndex].scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    }, 200);
  });

  buildDots();
  refreshActiveItem();
}

// ---------- 12. Modal Detail Siswa (klik salah satu kartu di #contentGrid) ----------
// Cuma ADA 1 STRUKTUR MODAL di index.html (#studentModal). Setiap kali sebuah
// .content-card diklik, script ini membaca atribut data-*-nya
// (data-name, data-quote, data-img1, data-img2, data-img3) lalu mengisi ulang
// isi modal itu-itu saja secara dinamis — bukan bikin modal baru tiap kartu.
// EDIT DATA SISWA: isi atribut data-quote / data-img1 / data-img2 / data-img3
// pada tiap <div class="content-card" data-name="..."> di index.html (lihat
// komentar lengkap di atas #studentModal pada index.html).
const contentGrid = document.getElementById('contentGrid');
const studentModal = document.getElementById('studentModal');
const studentModalClose = document.getElementById('studentModalClose');
const studentImg1 = document.getElementById('studentImg1');
const studentImg2 = document.getElementById('studentImg2');
const studentImg3 = document.getElementById('studentImg3');
const studentQuote = document.getElementById('studentQuote');
const studentName = document.getElementById('studentName');

// Isi 1 slot foto galeri. Kalau data-imgN kosong, sembunyikan <img>-nya supaya
// yang terlihat cuma kotak placeholder ungu (bukan ikon gambar rusak bawaan browser).
function fillStudentImage(imgEl, src, altText) {
  imgEl.alt = altText;
  if (src) {
    imgEl.src = src;
    imgEl.style.display = '';
  } else {
    imgEl.removeAttribute('src');
    imgEl.style.display = 'none';
  }
}

function openStudentModal(card) {
  const name = card.dataset.name || 'Siswa';
  const quote = (card.dataset.quote || '').trim();

  fillStudentImage(studentImg1, card.dataset.img1 || '', `Foto profil ${name}`);
  fillStudentImage(studentImg2, card.dataset.img2 || '', `Momen ${name} 1`);
  fillStudentImage(studentImg3, card.dataset.img3 || '', `Momen ${name} 2`);

  studentQuote.textContent = quote ? `\u201c${quote}\u201d` : 'Belum ada kesan & pesan untuk siswa ini.';
  studentQuote.classList.toggle('is-empty', !quote);
  studentName.textContent = name;

  studentModal.classList.add('open');
  document.body.style.overflow = 'hidden'; // kunci scroll halaman selama modal terbuka
}

function closeStudentModal() {
  studentModal.classList.remove('open');
  document.body.style.overflow = '';
}

if (contentGrid && studentModal) {
  // Event delegation: 1 listener untuk seluruh grid, jadi tetap berfungsi
  // walau kartu ditambah/dikurangi di kemudian hari.
  contentGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.content-card');
    if (card) openStudentModal(card);
  });

  // Aksesibilitas: kartu punya tabindex="0" + role="button" (lihat index.html),
  // jadi bisa dibuka lewat keyboard dengan Enter atau Space juga.
  contentGrid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.content-card');
    if (!card) return;
    e.preventDefault(); // cegah halaman ikut scroll saat tombol Space ditekan
    openStudentModal(card);
  });

  studentModalClose.addEventListener('click', closeStudentModal);
  studentModal.addEventListener('click', (e) => {
    if (e.target === studentModal) closeStudentModal(); // klik area gelap di luar box
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && studentModal.classList.contains('open')) {
      closeStudentModal();
    }
  });
}
