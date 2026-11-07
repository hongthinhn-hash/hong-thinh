/* ===================================================
   HỒNG THỊNH - TÔI YÊU CUỘC SỐNG
   Interactive JavaScript
   =================================================== */

// --- 1. THEME SWITCHER (DARK / LIGHT MODE) ---
const themeToggleBtn = document.getElementById('theme-toggle');
const themeToggleMobileBtn = document.getElementById('theme-toggle-mobile');
const htmlEl = document.documentElement;

function initTheme() {
    const savedTheme = localStorage.getItem('hongthinh-theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        htmlEl.classList.add('dark');
        updateThemeIcons(true);
    } else {
        htmlEl.classList.remove('dark');
        updateThemeIcons(false);
    }
}

function updateThemeIcons(isDark) {
    const moonIcons = document.querySelectorAll('.theme-icon-moon');
    const sunIcons = document.querySelectorAll('.theme-icon-sun');
    moonIcons.forEach(icon => icon.classList.toggle('hidden', isDark));
    sunIcons.forEach(icon => icon.classList.toggle('hidden', !isDark));
}

function toggleTheme() {
    const isDark = htmlEl.classList.toggle('dark');
    localStorage.setItem('hongthinh-theme', isDark ? 'dark' : 'light');
    updateThemeIcons(isDark);
}

if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
if (themeToggleMobileBtn) themeToggleMobileBtn.addEventListener('click', toggleTheme);
initTheme();

// --- 2. MOBILE MENU TOGGLE ---
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        const isExpanded = mobileMenu.classList.toggle('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
    });

    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });
}

// --- 3. SCROLL PROGRESS & BACK TO TOP ---
const backToTopBtn = document.getElementById('back-to-top');
const scrollProgressBar = document.getElementById('scroll-progress');

window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;

    if (scrollProgressBar) {
        scrollProgressBar.style.width = scrolled + '%';
    }

    if (backToTopBtn) {
        if (winScroll > 350) {
            backToTopBtn.classList.remove('opacity-0', 'pointer-events-none');
            backToTopBtn.classList.add('opacity-100');
        } else {
            backToTopBtn.classList.add('opacity-0', 'pointer-events-none');
            backToTopBtn.classList.remove('opacity-100');
        }
    }
});

if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// --- 4. INSPIRING LIFE QUOTE GENERATOR ---
const lifeQuotes = [
    {
        quote: "Mỗi sáng mai thức dậy là một cơ hội mới để bạn sống rực rỡ, yêu thương nhiều hơn và mỉm cười với thế giới.",
        author: "Hồng Thịnh — Tôi Yêu Cuộc Sống"
    },
    {
        quote: "Hạnh phúc không nằm ở đích đến xa xôi, mà hiện diện trong từng khoảnh khắc bình dị ta đang hít thở.",
        author: "Triết lý sống"
    },
    {
        quote: "Hãy sống như một đóa hoa hướng dương: Luôn hướng về ánh sáng, kiên cường vượt qua bão giông và tỏa hương thơm dịu mát.",
        author: "Cảm hứng mỗi ngày"
    },
    {
        quote: "Khi bạn trao đi nụ cười và sự tử tế chân thành, cả thế giới sẽ mở rộng vòng tay đón nhận bạn.",
        author: "Hồng Thịnh"
    },
    {
        quote: "Tâm an vạn sự an. Giữ một tấm lòng rộng mở, biết ơn những gì đang có, bình yên sẽ tự tìm về.",
        author: "Tâm niệm an yên"
    },
    {
        quote: "Cuộc sống ngắn ngủi lắm, hãy dành thời gian cho những người bạn yêu thương và những điều khiến tâm hồn bạn tỏa sáng.",
        author: "Lời nhắn yêu thương"
    },
    {
        quote: "Đừng đợi đến khi mọi thứ hoàn hảo mới bắt đầu yêu cuộc sống. Hãy yêu cuộc sống để thấy mọi thứ trở nên kỳ diệu.",
        author: "Hồng Thịnh"
    }
];

const quoteTextEl = document.getElementById('random-quote-text');
const quoteAuthorEl = document.getElementById('random-quote-author');
const newQuoteBtn = document.getElementById('btn-new-quote');

let lastQuoteIndex = -1;

function displayRandomQuote() {
    let nextIndex;
    do {
        nextIndex = Math.floor(Math.random() * lifeQuotes.length);
    } while (nextIndex === lastQuoteIndex && lifeQuotes.length > 1);

    lastQuoteIndex = nextIndex;
    const item = lifeQuotes[nextIndex];

    if (quoteTextEl && quoteAuthorEl) {
        quoteTextEl.style.opacity = '0';
        quoteAuthorEl.style.opacity = '0';
        setTimeout(() => {
            quoteTextEl.textContent = `"${item.quote}"`;
            quoteAuthorEl.textContent = `— ${item.author}`;
            quoteTextEl.style.opacity = '1';
            quoteAuthorEl.style.opacity = '1';
        }, 200);
    }

    // Launch celebratory confetti if library is available
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.75 },
            colors: ['#0d9488', '#f43f5e', '#f59e0b', '#06b6d4']
        });
    }
}

if (newQuoteBtn) {
    newQuoteBtn.addEventListener('click', displayRandomQuote);
}

// --- 5. HEART CLICKER / LOVE REACTION ---
const heartReactionBtn = document.getElementById('heart-reaction-btn');
const heartCounterEl = document.getElementById('heart-counter');

let heartCount = parseInt(localStorage.getItem('hongthinh-hearts') || '168', 10);
if (heartCounterEl) heartCounterEl.textContent = heartCount.toLocaleString('vi-VN');

if (heartReactionBtn) {
    heartReactionBtn.addEventListener('click', (e) => {
        heartCount++;
        localStorage.setItem('hongthinh-hearts', heartCount);
        if (heartCounterEl) heartCounterEl.textContent = heartCount.toLocaleString('vi-VN');

        // Create floating heart effect
        createFloatingHeart(e.clientX, e.clientY);

        // Confetti mini burst
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 25,
                spread: 45,
                origin: { 
                    x: e.clientX / window.innerWidth, 
                    y: e.clientY / window.innerHeight 
                },
                colors: ['#f43f5e', '#fb7185', '#fda4af']
            });
        }
    });
}

function createFloatingHeart(x, y) {
    const heart = document.createElement('div');
    heart.className = 'fixed pointer-events-none select-none z-50 text-2xl transition-all duration-1000';
    heart.innerHTML = '❤️';
    heart.style.left = `${x - 12}px`;
    heart.style.top = `${y - 12}px`;
    heart.style.transform = 'scale(0.8)';
    heart.style.opacity = '1';
    document.body.appendChild(heart);

    requestAnimationFrame(() => {
        heart.style.transform = `translate(${(Math.random() - 0.5) * 60}px, -90px) scale(1.4)`;
        heart.style.opacity = '0';
    });

    setTimeout(() => {
        heart.remove();
    }, 1000);
}

// --- 6. INTERACTIVE WISHBOARD (SỔ LƯU BÚT) ---
const wishForm = document.getElementById('wish-form');
const wishInput = document.getElementById('wish-input');
const wishAuthor = document.getElementById('wish-author');
const wishListContainer = document.getElementById('wish-list');

const initialWishes = [
    {
        name: "Minh Anh",
        content: "Chúc anh Thịnh luôn tràn đầy năng lượng tích cực, nụ cười luôn rạng rỡ trên môi! Website rất đẹp!",
        date: "Hôm nay",
        tag: "🌸 Tươi vui"
    },
    {
        name: "Thu Trang",
        content: "Ngắm ảnh áo dài của anh Thịnh rất duyên và phong độ. Luôn theo dõi và ủng hộ tinh thần yêu đời của anh!",
        date: "Gần đây",
        tag: "✨ Yêu đời"
    },
    {
        name: "Hoàng Long",
        content: "Triết lý sống thật sâu sắc và truyền cảm hứng. Chúc anh luôn hạnh phúc và gặt hái nhiều thành công!",
        date: "Hôm qua",
        tag: "🔥 Đầy nhiệt huyết"
    }
];

function getSavedWishes() {
    const saved = localStorage.getItem('hongthinh-wishes');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            return initialWishes;
        }
    }
    return initialWishes;
}

function renderWishes() {
    if (!wishListContainer) return;
    const wishes = getSavedWishes();
    wishListContainer.innerHTML = '';

    wishes.forEach((w) => {
        const card = document.createElement('div');
        card.className = 'p-5 rounded-2xl glass-panel shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between';
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span class="w-8 h-8 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-sm">
                            ${w.name.charAt(0).toUpperCase()}
                        </span>
                        ${escapeHtml(w.name)}
                    </span>
                    <span class="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 font-medium">
                        ${escapeHtml(w.tag || '💖 Yêu thương')}
                    </span>
                </div>
                <p class="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
                    "${escapeHtml(w.content)}"
                </p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                <span>${escapeHtml(w.date || 'Vừa xong')}</span>
                <span class="text-rose-500"><i class="fa-solid fa-heart"></i></span>
            </div>
        `;
        wishListContainer.appendChild(card);
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}

if (wishForm) {
    wishForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const content = wishInput.value.trim();
        const name = wishAuthor.value.trim() || 'Một người bạn yêu đời';

        if (!content) return;

        const newWish = {
            name: name,
            content: content,
            date: 'Vừa xong',
            tag: '🌟 Lời chúc mới'
        };

        const wishes = getSavedWishes();
        wishes.unshift(newWish);
        if (wishes.length > 20) wishes.pop(); // Keep recent 20
        localStorage.setItem('hongthinh-wishes', JSON.stringify(wishes));

        wishInput.value = '';
        wishAuthor.value = '';
        renderWishes();

        showToast('Cảm ơn lời chúc ngọt ngào của bạn dành cho Hồng Thịnh! 💖');

        if (typeof confetti === 'function') {
            confetti({
                particleCount: 60,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    });
}

renderWishes();

// --- 7. LIGHTBOX MODAL ---
const lightboxModal = document.getElementById('lightbox-modal');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxCloseBtn = document.getElementById('lightbox-close');

function openLightbox(src, caption) {
    if (!lightboxModal || !lightboxImg) return;
    lightboxImg.src = src;
    if (lightboxCaption) lightboxCaption.textContent = caption || 'Khoảnh khắc của Hồng Thịnh';
    lightboxModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('active');
    document.body.style.overflow = '';
}

if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) closeLightbox();
    });
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});

// Attach lightbox to all zoomable images
document.querySelectorAll('.lightbox-trigger').forEach(el => {
    el.addEventListener('click', () => {
        const src = el.getAttribute('data-full-img') || el.src;
        const caption = el.getAttribute('data-caption') || el.alt;
        openLightbox(src, caption);
    });
});

// --- 8. CONTACT FORM SUBMISSION ---
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('contact-name')?.value || '';
        const phone = document.getElementById('contact-phone')?.value || '';
        const msg = document.getElementById('contact-message')?.value || '';

        // Form feedback
        showToast(`Cảm ơn bạn ${name}! Thông điệp của bạn đã được ghi nhận. Hồng Thịnh sẽ phản hồi sớm nhất qua Zalo/SĐT.`);

        // Offer instant redirect to Zalo
        setTimeout(() => {
            const zaloChoice = confirm("Bạn có muốn mở ngay Zalo (0344126866) để trò chuyện trực tiếp cùng Hồng Thịnh không?");
            if (zaloChoice) {
                window.open('https://zalo.me/0344126866', '_blank');
            }
        }, 1200);

        contactForm.reset();
    });
}

// --- 9. TOAST NOTIFICATION UTILITY ---
function showToast(message) {
    const existing = document.getElementById('app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-full bg-slate-900/95 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium shadow-2xl flex items-center gap-3 backdrop-blur border border-teal-500/40 transition-all duration-300';
    toast.innerHTML = `
        <span class="text-teal-400 dark:text-teal-600 text-lg"><i class="fa-solid fa-circle-check"></i></span>
        <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 20px)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// --- 10. AMBIENT RELAXING SOUND (SYNTHESIZED WEB AUDIO API) ---
// Plays a soothing, dreamy pentatonic chord sequence when toggled. Zero external audio file needed!
let audioCtx = null;
let isAudioPlaying = false;
let audioTimer = null;

const audioToggleBtn = document.getElementById('ambient-sound-toggle');
const pentatonicNotes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]; // C D E G A C D E (Peaceful & Uplifting)

function playGentleBell(freq) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 2.8);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 3);
}

function startAmbientSound() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    isAudioPlaying = true;
    if (audioToggleBtn) {
        audioToggleBtn.classList.add('playing');
        audioToggleBtn.setAttribute('title', 'Tắt giai điệu thư giãn');
    }

    // Play a note immediately, then on calm intervals
    playGentleBell(pentatonicNotes[0]);
    setTimeout(() => playGentleBell(pentatonicNotes[2]), 400);
    setTimeout(() => playGentleBell(pentatonicNotes[4]), 800);

    audioTimer = setInterval(() => {
        if (!isAudioPlaying) return;
        const randomNote = pentatonicNotes[Math.floor(Math.random() * pentatonicNotes.length)];
        playGentleBell(randomNote);
    }, 2400);

    showToast('Đang phát giai điệu thư giãn tích cực 🎶');
}

function stopAmbientSound() {
    isAudioPlaying = false;
    clearInterval(audioTimer);
    if (audioToggleBtn) {
        audioToggleBtn.classList.remove('playing');
        audioToggleBtn.setAttribute('title', 'Bật giai điệu thư giãn');
    }
}

if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
        if (isAudioPlaying) {
            stopAmbientSound();
        } else {
            startAmbientSound();
        }
    });
}
