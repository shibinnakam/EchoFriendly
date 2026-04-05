/* ============================================
   ECHOFRIENDLY — MAIN SCRIPT
   Animations, Loader, Scroll Effects
   ============================================ */

// ─── 1. PRELOADER ───────────────────────────────────────────────
const preloader    = document.getElementById('preloader');
const preloaderFill = document.getElementById('preloader-fill');
const preloaderText = document.getElementById('preloader-text');

const loadingMessages = [
    'Initialising global systems...',
    'Connecting to 15 regions...',
    'Mapping eco-data streams...',
    'Calibrating sustainability metrics...',
    'Welcome to EchoFriendly.'
];

let progress = 0;
let msgIndex = 0;

const progressInterval = setInterval(() => {
    // Speed up in stages for UX feel
    const increment = progress < 60 ? 2.5 : progress < 85 ? 1.5 : 0.8;
    progress = Math.min(progress + increment, 100);
    preloaderFill.style.width = progress + '%';

    // Swap message at milestones
    if (progress >= (msgIndex + 1) * 20 && msgIndex < loadingMessages.length - 1) {
        msgIndex++;
        preloaderText.style.opacity = '0';
        setTimeout(() => {
            preloaderText.textContent = loadingMessages[msgIndex];
            preloaderText.style.opacity = '1';
        }, 200);
    }

    if (progress >= 100) {
        clearInterval(progressInterval);
        // 400ms pause so user sees "Welcome"
        setTimeout(dismissPreloader, 400);
    }
}, 30);

function dismissPreloader() {
    preloader.classList.add('done');
    document.body.classList.add('page-loaded');
    // Allow scroll now
    document.body.style.overflow = '';
    // Trigger partners bar reveal (above fold sometimes)
    checkPartnersBar();
}

// Block scroll during load
document.body.style.overflow = 'hidden';

// Preloader text fade style
if (preloaderText) {
    preloaderText.style.transition = 'opacity 0.3s ease';
}

// ─── 2. FLOATING PARTICLES ─────────────────────────────────────
function createParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;

    const count = 25;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';

        // Random size 4–14px
        const size = Math.random() * 10 + 4;
        p.style.width  = size + 'px';
        p.style.height = size + 'px';

        // Random horizontal position
        p.style.left = Math.random() * 100 + '%';

        // Random duration 8–18s, random delay 0–10s
        const duration = Math.random() * 10 + 8;
        const delay    = Math.random() * 10;
        p.style.animationDuration = duration + 's';
        p.style.animationDelay   = delay + 's';

        // Vary opacity
        p.style.background = `rgba(255,255,255,${(Math.random() * 0.12 + 0.04).toFixed(2)})`;

        // Some particles are leaf-shaped
        if (Math.random() > 0.65) {
            p.style.borderRadius = '50% 0 50% 0';
            p.style.background = `rgba(184,212,200,${(Math.random() * 0.15 + 0.05).toFixed(2)})`;
        }

        container.appendChild(p);
    }
}
createParticles();

// ─── 3. NAVBAR SCROLL EFFECT ───────────────────────────────────
const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ─── 4. SCROLL REVEAL — SECTIONS ───────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

// Reveal cards, pillars, stats, form, contact info
document.querySelectorAll(
    '.pillar-card, .card, .stat-item, .contact-form-wrap, .contact-info'
).forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
});

// Reveal section headers
document.querySelectorAll('.section-header').forEach(el => {
    el.classList.add('reveal-header');
    revealObserver.observe(el);
});

// Reveal impact text block
document.querySelectorAll('.impact-text').forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
});

// ─── 5. PARTNERS BAR REVEAL ────────────────────────────────────
const partnersBar = document.querySelector('.partners-bar');

function checkPartnersBar() {
    if (!partnersBar) return;
    const rect = partnersBar.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
        partnersBar.classList.add('visible');
    }
}

const partnersObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
}, { threshold: 0.2 });

if (partnersBar) partnersObserver.observe(partnersBar);

// ─── 6. ANIMATED STAT COUNTERS ─────────────────────────────────
const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = +el.getAttribute('data-target');
        const suffix = el.getAttribute('data-suffix') || '';
        let count = 0;
        const duration = 1800; // ms
        const startTime = performance.now();

        const tick = (now) => {
            const elapsed = now - startTime;
            const pct = Math.min(elapsed / duration, 1);
            // Ease out quart
            const eased = 1 - Math.pow(1 - pct, 4);
            const current = Math.round(eased * target);
            el.innerText = current.toLocaleString() + suffix;
            if (pct < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
        statObserver.unobserve(el);
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number').forEach(el => statObserver.observe(el));

// ─── 7. BUTTON RIPPLE EFFECT ───────────────────────────────────
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width  = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
        this.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    });
});

// ─── 8. CONTACT FORM HANDLER ───────────────────────────────────
const form = document.getElementById('contact-form');
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('.btn-submit');
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Request Sent Successfully!';
        btn.style.background = '#4A7560';
        btn.style.transform = 'scale(1.02)';
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = 'Submit Consultation Request <i class="fa-solid fa-paper-plane"></i>';
            btn.style.background = '';
            btn.style.transform = '';
            btn.disabled = false;
            form.reset();
        }, 4000);
    });
}

// ─── 9. SMOOTH SCROLL ──────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            const headerH = header ? header.offsetHeight : 80;
            const top = target.getBoundingClientRect().top + window.pageYOffset - headerH;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    });
});

/* ============================================
   DP GENERATOR MODULE
   EchoFriendly Poster / Profile Picture Tool
   ============================================ */

(function () {
    'use strict';

    // ── Config ──────────────────────────────────────────────────
    const CANVAS_SIZE   = 800;       // internal canvas resolution
    const PHOTO_X       = 435;       // photo frame left edge (canvas coords)
    const PHOTO_Y       = 60;        // photo frame top edge
    const PHOTO_W       = 310;       // frame width
    const PHOTO_H       = 500;       // frame height
    const PHOTO_R       = 55;        // border-radius of photo frame (rounded rect)

    // brand palette
    const C_BG          = '#FAFAF8';
    const C_GREEN_DARK  = '#0F1F18';
    const C_GREEN_MID   = '#2D4F40';
    const C_GREEN_LIGHT = '#4A7560';
    const C_BEIGE       = '#E8D8C6';
    const C_BEIGE_2     = '#F5EDDF';
    const C_TEAL        = '#5FC9A0';
    const C_WHITE       = '#FFFFFF';

    // ── State ───────────────────────────────────────────────────
    let userImage   = null;   // HTMLImageElement
    let imgScale    = 1.0;    // zoom factor
    let imgOffsetX  = 0;      // drag offset x (canvas units)
    let imgOffsetY  = 0;      // drag offset y (canvas units)
    let isDragging  = false;
    let dragStartX  = 0;
    let dragStartY  = 0;
    let finalDataURL = null;

    // ── DOM refs ─────────────────────────────────────────────────
    let canvas, ctx;

    // ── Helpers ──────────────────────────────────────────────────

    /** Draw a rounded rectangle path */
    function roundedRect(cx, x, y, w, h, r) {
        cx.beginPath();
        cx.moveTo(x + r, y);
        cx.lineTo(x + w - r, y);
        cx.quadraticCurveTo(x + w, y, x + w, y + r);
        cx.lineTo(x + w, y + h - r);
        cx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        cx.lineTo(x + r, y + h);
        cx.quadraticCurveTo(x, y + h, x, y + h - r);
        cx.lineTo(x, y + r);
        cx.quadraticCurveTo(x, y, x + r, y);
        cx.closePath();
    }

    /** Draw a botanical-style leaf / vine decoration */
    function drawBotanicDecor(cx) {
        cx.save();
        cx.globalAlpha = 0.07;

        // Main large leaf cluster (top-left area)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const R = 110 + i * 8;
            cx.save();
            cx.translate(165, 210);
            cx.rotate(angle);
            cx.beginPath();
            cx.ellipse(0, -R * 0.55, 18, R * 0.55, 0, 0, Math.PI * 2);
            cx.fillStyle = C_GREEN_MID;
            cx.fill();
            cx.restore();
        }

        cx.globalAlpha = 0.045;
        // Small scattered leaves
        const leaves = [
            [40, 380, 0.4], [100, 430, 0.7], [200, 500, 0.2],
            [320, 560, 0.9], [60, 560, 0.5], [140, 60, 0.3]
        ];
        leaves.forEach(([lx, ly, rot]) => {
            cx.save();
            cx.translate(lx, ly);
            cx.rotate(rot);
            cx.beginPath();
            cx.ellipse(0, 0, 10, 25, 0, 0, Math.PI * 2);
            cx.fillStyle = C_GREEN_LIGHT;
            cx.fill();
            cx.restore();
        });
        cx.restore();
    }

    /** Draw the central circular accent lines (eco motif) */
    function drawCircularMotif(cx, x, y, maxR, color, alpha) {
        cx.save();
        cx.globalAlpha = alpha;
        cx.strokeStyle = color;
        for (let r = 20; r <= maxR; r += 18) {
            cx.beginPath();
            cx.arc(x, y, r, 0, Math.PI * 2);
            cx.lineWidth = 0.8;
            cx.stroke();
        }
        cx.restore();
    }

    /** Draw the poster template (background + decorative elements) */
    function drawTemplate() {
        const W = CANVAS_SIZE, H = CANVAS_SIZE;

        // ── Background
        ctx.fillStyle = C_BG;
        ctx.fillRect(0, 0, W, H);

        // ── Right panel teal gradient strip
        const grad = ctx.createLinearGradient(W * 0.5, 0, W, H);
        grad.addColorStop(0, '#E8F5EF');
        grad.addColorStop(1, '#C5E4D8');
        ctx.fillStyle = grad;
        ctx.fillRect(W * 0.52, 0, W * 0.48, H);

        // ── Subtle grid lines (left panel)
        ctx.save();
        ctx.strokeStyle = 'rgba(45,79,64,0.04)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx < W * 0.52; gx += 40) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
        }
        for (let gy = 0; gy < H; gy += 40) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W * 0.52, gy); ctx.stroke();
        }
        ctx.restore();

        // ── Botanical decorations
        drawBotanicDecor(ctx);

        // ── Circular accent (left panel centre-ish)
        drawCircularMotif(ctx, 200, 220, 160, C_GREEN_LIGHT, 0.06);

        // ── Top-left micro label
        ctx.save();
        ctx.font = `500 22px 'Space Grotesk', sans-serif`;
        ctx.fillStyle = C_GREEN_MID;
        ctx.globalAlpha = 0.55;
        ctx.fillText("I'm Supporting", 38, 58);
        ctx.restore();

        // ── "EchoFriendly" large brand text
        ctx.save();
        ctx.font = `700 62px 'Cormorant Garamond', Georgia, serif`;
        ctx.fillStyle = C_GREEN_DARK;
        ctx.fillText('Echo', 32, 130);
        ctx.font = `italic 700 62px 'Cormorant Garamond', Georgia, serif`;
        ctx.fillStyle = C_GREEN_LIGHT;
        ctx.fillText('Friendly', 32, 195);
        ctx.restore();

        // ── Divider line
        ctx.save();
        ctx.strokeStyle = C_GREEN_MID;
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(32, 215); ctx.lineTo(395, 215); ctx.stroke();
        ctx.restore();

        // ── Tagline
        ctx.save();
        ctx.font = `500 19px 'Space Grotesk', sans-serif`;
        ctx.fillStyle = C_GREEN_MID;
        ctx.globalAlpha = 0.7;
        ctx.fillText('GLOBAL SUSTAINABLE', 32, 252);
        ctx.fillText('INFRASTRUCTURE', 32, 278);
        ctx.restore();

        // ── Small eco icons row (bottom-left)
        const iconSymbols = ['◉', '◎', '⊕', '⊗'];
        ctx.save();
        ctx.font = `bold 24px monospace`;
        ctx.fillStyle = C_GREEN_MID;
        ctx.globalAlpha = 0.18;
        iconSymbols.forEach((s, i) => {
            ctx.fillText(s, 32 + i * 56, H - 130);
        });
        ctx.restore();

        // ── Bottom branding strip (left)
        ctx.save();
        ctx.font = `600 16px 'Space Grotesk', sans-serif`;
        ctx.fillStyle = C_GREEN_MID;
        ctx.globalAlpha = 0.6;
        ctx.fillText('Supporting our Ecosystem', 32, H - 88);
        ctx.font = `400 13px 'Inter', sans-serif`;
        ctx.globalAlpha = 0.45;
        ctx.fillText('echofriendly.com', 32, H - 62);
        ctx.restore();

        // ── Leaf icon (bottom-left)
        ctx.save();
        ctx.font = `500 20px 'Inter', sans-serif`;
        ctx.fillStyle = C_GREEN_LIGHT;
        ctx.globalAlpha = 0.55;
        ctx.fillText('🌿', 32, H - 38);
        ctx.restore();

        // ── Photo frame: teal border with gradient
        const borderGrad = ctx.createLinearGradient(PHOTO_X, PHOTO_Y, PHOTO_X + PHOTO_W, PHOTO_Y + PHOTO_H);
        borderGrad.addColorStop(0, C_TEAL);
        borderGrad.addColorStop(0.5, C_GREEN_MID);
        borderGrad.addColorStop(1, C_GREEN_LIGHT);

        ctx.save();
        roundedRect(ctx, PHOTO_X - 7, PHOTO_Y - 7, PHOTO_W + 14, PHOTO_H + 14, PHOTO_R + 5);
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.restore();

        // ── Photo frame fill (placeholder)
        ctx.save();
        roundedRect(ctx, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H, PHOTO_R);
        ctx.clip();

        if (userImage) {
            // Fit image with zoom & drag
            const natW = userImage.naturalWidth;
            const natH = userImage.naturalHeight;
            const frameAspect = PHOTO_W / PHOTO_H;
            const imgAspect = natW / natH;

            let drawW, drawH;
            if (imgAspect > frameAspect) {
                drawH = PHOTO_H * imgScale;
                drawW = drawH * imgAspect;
            } else {
                drawW = PHOTO_W * imgScale;
                drawH = drawW / imgAspect;
            }

            // Centre + offset
            const baseX = PHOTO_X + (PHOTO_W - drawW) / 2;
            const baseY = PHOTO_Y + (PHOTO_H - drawH) / 2;
            ctx.drawImage(userImage, baseX + imgOffsetX, baseY + imgOffsetY, drawW, drawH);
        } else {
            // Placeholder gradient
            const phGrad = ctx.createLinearGradient(PHOTO_X, PHOTO_Y, PHOTO_X, PHOTO_Y + PHOTO_H);
            phGrad.addColorStop(0, '#D4E1D1');
            phGrad.addColorStop(1, '#B8D4C8');
            ctx.fillStyle = phGrad;
            ctx.fillRect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);

            // Upload icon hint
            ctx.fillStyle = 'rgba(45,79,64,0.3)';
            ctx.font = `500 18px 'Space Grotesk', sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('Upload Your', PHOTO_X + PHOTO_W / 2, PHOTO_Y + PHOTO_H / 2 - 14);
            ctx.fillText('Photo', PHOTO_X + PHOTO_W / 2, PHOTO_Y + PHOTO_H / 2 + 16);
            ctx.textAlign = 'left';
        }
        ctx.restore();
    }

    /** Draw user name below the photo frame */
    function drawUserName(name) {
        if (!name) return;
        ctx.save();
        ctx.font = `bold 40px 'Space Grotesk', sans-serif`;
        ctx.fillStyle = C_GREEN_DARK;
        ctx.textAlign = 'center';
        const cx = PHOTO_X + PHOTO_W / 2;
        const cy = PHOTO_Y + PHOTO_H + 58;
        ctx.fillText(name.toUpperCase(), cx, cy);
        ctx.textAlign = 'left';
        ctx.restore();
    }

    /** Full render call */
    function renderCanvas() {
        if (!ctx) return;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        drawTemplate();
        const name = document.getElementById('dp-name')?.value?.trim() || '';
        drawUserName(name);
    }

    // ── Modal open/close ─────────────────────────────────────────
    window.openDPModal = function () {
        const overlay = document.getElementById('dp-modal-overlay');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        // init canvas on first open
        if (!canvas) {
            canvas = document.getElementById('dp-canvas');
            ctx    = canvas.getContext('2d');
            attachEvents();
        }
        renderCanvas();
    };

    window.closeDPModal = function () {
        document.getElementById('dp-modal-overlay').classList.remove('active');
        document.body.style.overflow = '';
    };

    window.closeDPModalOutside = function (e) {
        if (e.target.id === 'dp-modal-overlay') closeDPModal();
    };

    // ── File inputs ──────────────────────────────────────────────
    function attachFileInput(id) {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    userImage = img;
                    imgScale  = 1.2;   // slight default zoom
                    imgOffsetX = 0;
                    imgOffsetY = 0;
                    document.getElementById('dp-zoom-row').style.display = 'block';
                    document.getElementById('dp-drag-hint').style.display = 'flex';
                    document.getElementById('dp-zoom-slider').value = 120;
                    document.getElementById('dp-zoom-value').textContent = '120%';
                    updateSliderTrack(120);
                    renderCanvas();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
            input.value = ''; // reset so same file can be re-picked
        });
    }

    // ── Drag to adjust ──────────────────────────────────────────
    function canvasCoord(e) {
        const rect  = canvas.getBoundingClientRect();
        const scaleX = CANVAS_SIZE / rect.width;
        const scaleY = CANVAS_SIZE / rect.height;
        const src = e.touches ? e.touches[0] : e;
        return {
            x: (src.clientX - rect.left) * scaleX,
            y: (src.clientY - rect.top)  * scaleY
        };
    }

    function onDragStart(e) {
        if (!userImage) return;
        isDragging = true;
        const pos  = canvasCoord(e);
        dragStartX = pos.x - imgOffsetX;
        dragStartY = pos.y - imgOffsetY;
        e.preventDefault();
    }

    function onDragMove(e) {
        if (!isDragging || !userImage) return;
        const pos = canvasCoord(e);
        imgOffsetX = pos.x - dragStartX;
        imgOffsetY = pos.y - dragStartY;
        renderCanvas();
        e.preventDefault();
    }

    function onDragEnd() { isDragging = false; }

    // ── Zoom ────────────────────────────────────────────────────
    function updateSliderTrack(val) {
        const min  = 50, max = 300;
        const pct  = ((val - min) / (max - min)) * 100;
        const slider = document.getElementById('dp-zoom-slider');
        if (slider) slider.style.setProperty('--val', pct + '%');
    }

    window.adjustZoom = function (delta) {
        const slider = document.getElementById('dp-zoom-slider');
        if (!slider) return;
        let val = Math.min(300, Math.max(50, parseInt(slider.value) + delta));
        slider.value = val;
        document.getElementById('dp-zoom-value').textContent = val + '%';
        imgScale = val / 100;
        updateSliderTrack(val);
        renderCanvas();
    };

    // ── Generate ─────────────────────────────────────────────────
    window.generateDP = function () {
        renderCanvas();
        finalDataURL = canvas.toDataURL('image/png');

        const resultImg = document.getElementById('dp-result-img');
        resultImg.src = finalDataURL;

        document.getElementById('dp-step-setup').style.display = 'none';
        document.getElementById('dp-step-result').style.display = 'flex';
    };

    // ── Download ─────────────────────────────────────────────────
    window.downloadDP = function () {
        if (!finalDataURL) return;
        const a = document.createElement('a');
        const name = document.getElementById('dp-name')?.value?.trim() || 'EchoFriendly';
        a.download = `EchoFriendly_DP_${name.replace(/\s+/g,'_') || 'poster'}.png`;
        a.href = finalDataURL;
        a.click();

        // Optional: Trigger a small "Success" toast here if needed
    };

    /** Convert dataURL to File object for Sharing */
    function dataURLtoFile(dataurl, filename) {
        let arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]),
            n = bstr.length,
            u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    }

    /** Native Share via Web Share API */
    async function nativeShare(text, fileName) {
        if (!finalDataURL) return false;
        
        try {
            const file = dataURLtoFile(finalDataURL, fileName);
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'My EchoFriendly DP',
                    text: text,
                });
                return true;
            }
        } catch (err) {
            console.warn('Native share failed or cancelled:', err);
        }
        return false;
    }

    /** WhatsApp Sharing */
    window.shareWhatsApp = async function () {
        const text = document.getElementById('dp-caption-box')?.innerText || '';
        const name = document.getElementById('dp-name')?.value?.trim() || 'poster';
        const fileName = `EchoFriendly_DP_${name.replace(/\s+/g, '_')}.png`;

        const shared = await nativeShare(text, fileName);
        if (!shared) {
            const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        }
    };

    /** LinkedIn Sharing */
    window.shareLinkedIn = async function () {
        const text = document.getElementById('dp-caption-box')?.innerText || '';
        const name = document.getElementById('dp-name')?.value?.trim() || 'poster';
        const fileName = `EchoFriendly_DP_${name.replace(/\s+/g, '_')}.png`;
        const siteUrl = window.location.href;

        const shared = await nativeShare(text, fileName);
        if (!shared) {
            // LinkedIn fallback is URL based
            const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`;
            window.open(url, '_blank');
            // Inform user to paste caption manually if they are on Desktop
            alert("LinkedIn Desktop doesn't support direct image upload via link. Please download the image and paste the caption manually.");
        }
    };

    // ── Reset ────────────────────────────────────────────────────
    window.resetDP = function () {
        userImage   = null;
        imgScale    = 1;
        imgOffsetX  = 0;
        imgOffsetY  = 0;
        finalDataURL = null;

        document.getElementById('dp-name').value = '';
        document.getElementById('dp-zoom-row').style.display = 'none';
        document.getElementById('dp-drag-hint').style.display = 'none';
        document.getElementById('dp-zoom-slider').value = 100;
        document.getElementById('dp-zoom-value').textContent = '100%';
        updateSliderTrack(100);

        document.getElementById('dp-step-result').style.display = 'none';
        document.getElementById('dp-step-setup').style.display = 'flex';
        renderCanvas();
    };

    // ── Copy Caption ─────────────────────────────────────────────
    window.copyCaption = function () {
        const text = document.getElementById('dp-caption-box')?.textContent || '';
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('dp-copy-btn');
            btn.classList.add('copied');
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Caption';
            }, 2500);
        });
    };

    // ── Wire up all events ───────────────────────────────────────
    function attachEvents() {
        // File uploads
        attachFileInput('dp-file-input');
        attachFileInput('dp-camera-input');

        // Drag
        canvas.addEventListener('mousedown',  onDragStart);
        canvas.addEventListener('mousemove',  onDragMove);
        canvas.addEventListener('mouseup',    onDragEnd);
        canvas.addEventListener('mouseleave', onDragEnd);
        canvas.addEventListener('touchstart', onDragStart, { passive: false });
        canvas.addEventListener('touchmove',  onDragMove,  { passive: false });
        canvas.addEventListener('touchend',   onDragEnd);

        // Zoom slider
        const slider = document.getElementById('dp-zoom-slider');
        if (slider) {
            slider.addEventListener('input', () => {
                const val = parseInt(slider.value);
                imgScale = val / 100;
                document.getElementById('dp-zoom-value').textContent = val + '%';
                updateSliderTrack(val);
                renderCanvas();
            });
        }

        // Name realtime update
        const nameInput = document.getElementById('dp-name');
        if (nameInput) nameInput.addEventListener('input', renderCanvas);

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDPModal();
        });
    }

})(); // end DP module IIFE

