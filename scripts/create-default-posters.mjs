import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public', 'templates');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Tech Summit Keynote Speaker - Bright Modern High-Tech Style
const techSummitSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <defs>
    <linearGradient id="bgLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#eff6ff"/>
    </linearGradient>
    <linearGradient id="blueIndigo" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="50%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <linearGradient id="frameBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <pattern id="lightGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Clean Bright Background -->
  <rect width="1080" height="1350" fill="url(#bgLight)"/>
  <rect width="1080" height="1350" fill="url(#lightGrid)" opacity="0.6"/>

  <!-- Top Geometric Accents -->
  <circle cx="950" cy="120" r="300" fill="#dbeafe" opacity="0.4"/>
  <circle cx="100" cy="1100" r="350" fill="#e0e7ff" opacity="0.4"/>

  <!-- Top Badge -->
  <g transform="translate(190, 80)">
    <rect width="250" height="38" rx="19" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5"/>
    <circle cx="22" cy="19" r="6" fill="#2563eb"/>
    <text x="38" y="24" fill="#1e40af" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="2">GLOBAL TECH SUMMIT</text>
  </g>
  <text x="890" y="105" text-anchor="end" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" letter-spacing="2">OCTOBER 24-26, 2026</text>

  <!-- Main Headline -->
  <text x="190" y="180" fill="#0f172a" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" letter-spacing="-1">FUTURE TECH</text>
  <text x="190" y="230" fill="url(#blueIndigo)" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" letter-spacing="-0.5">KEYNOTE SPEAKER SPOTLIGHT</text>
  <text x="190" y="270" fill="#475569" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="500">Transforming Artificial Intelligence &amp; Autonomous Cloud Systems</text>

  <!-- Photo Area Placeholder Frame: x=190, y=320, width=700, height=640, rx=24 -->
  <g transform="translate(190, 320)">
    <rect width="700" height="640" rx="24" fill="#f8fafc" stroke="url(#frameBorder)" stroke-width="3"/>
    <!-- Subtle drop pattern -->
    <rect x="3" y="3" width="694" height="634" rx="21" fill="#f1f5f9" opacity="0.7"/>
    <!-- Placeholder hint icon -->
    <circle cx="350" cy="280" r="56" fill="#ffffff" stroke="#3b82f6" stroke-width="2" stroke-dasharray="6 4"/>
    <path d="M 330 295 L 345 275 L 358 290 L 372 268 L 388 295 Z" fill="#3b82f6" opacity="0.8"/>
    <circle cx="340" cy="265" r="5" fill="#3b82f6"/>
    <text x="350" y="375" text-anchor="middle" fill="#1e3a8a" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" letter-spacing="1">YOUR PHOTO APPEARS HERE</text>
    <text x="350" y="405" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="14">Dimensions: 700 × 640 px • Auto-cropped</text>
  </g>

  <!-- Speaker Details Card below Photo Area -->
  <g transform="translate(190, 990)">
    <rect width="700" height="150" rx="20" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
    <text x="40" y="55" fill="#0f172a" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="800">MAIN STAGE AUDITORIUM</text>
    <text x="40" y="90" fill="#2563eb" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600">SESSION: THE NEXT DECADE OF INTELLIGENT COMPUTE</text>
    <text x="40" y="122" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="15">HALL A • 10:30 AM PST • LIVE STREAMED GLOBALLY</text>

    <!-- Barcode & Badge -->
    <g transform="translate(560, 32)">
      <rect width="100" height="85" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
      <text x="50" y="32" text-anchor="middle" fill="#0f172a" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800">VIP PASS</text>
      <path d="M 15 45 H 85 M 15 52 H 70 M 15 59 H 85 M 15 66 H 60 M 15 73 H 85" stroke="#2563eb" stroke-width="2"/>
    </g>
  </g>

  <!-- Bottom Brand Footer -->
  <line x1="190" y1="1200" x2="890" y2="1200" stroke="#e2e8f0" stroke-width="1"/>
  <text x="190" y="1245" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="600">ORGANIZED BY GLOBAL TECH FOUNDATION</text>
  <text x="890" y="1245" text-anchor="end" fill="#2563eb" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700">WWW.TECHSUMMIT2026.IO</text>
</svg>`;

// 2. Employee of the Month Award - Bright Luxury Ivory & Gold Style
const employeeAwardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <defs>
    <linearGradient id="ivoryBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#fffdfa"/>
      <stop offset="100%" stop-color="#fbf7ee"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d4af37"/>
      <stop offset="50%" stop-color="#aa771c"/>
      <stop offset="100%" stop-color="#80540d"/>
    </linearGradient>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e5c066"/>
      <stop offset="100%" stop-color="#b8860b"/>
    </linearGradient>
  </defs>

  <!-- Warm Clean Ivory Background -->
  <rect width="1080" height="1350" fill="url(#ivoryBg)"/>

  <!-- Ornate Border Frame -->
  <rect x="50" y="50" width="980" height="1250" rx="16" fill="none" stroke="url(#gold)" stroke-width="3" stroke-opacity="0.7"/>
  <rect x="62" y="62" width="956" height="1226" rx="12" fill="none" stroke="url(#gold)" stroke-width="1" stroke-opacity="0.4"/>

  <!-- Corner Flourishes -->
  <g stroke="url(#gold)" stroke-width="2" fill="none">
    <path d="M 50 110 A 60 60 0 0 0 110 50"/>
    <path d="M 1030 110 A 60 60 0 0 1 970 50"/>
    <path d="M 50 1240 A 60 60 0 0 1 110 1300"/>
    <path d="M 1030 1240 A 60 60 0 0 0 970 1300"/>
  </g>

  <!-- Header Laurel Crown Icon & Star -->
  <g transform="translate(540, 130)">
    <circle cx="0" cy="0" r="32" fill="#fff9eb" stroke="url(#gold)" stroke-width="2"/>
    <path d="M 0 -15 L 4 -3 L 16 -3 L 7 5 L 10 17 L 0 10 L -10 17 L -7 5 L -16 -3 L -4 -3 Z" fill="url(#gold)"/>
  </g>

  <!-- Typography -->
  <text x="540" y="210" text-anchor="middle" fill="url(#gold)" font-family="Georgia, 'Times New Roman', serif" font-size="20" font-weight="700" letter-spacing="6">CERTIFICATE OF RECOGNITION</text>
  <text x="540" y="265" text-anchor="middle" fill="#1e293b" font-family="Georgia, 'Times New Roman', serif" font-size="46" font-weight="bold" letter-spacing="2">EMPLOYEE OF THE MONTH</text>

  <!-- Predefined Photo Area: x=240, y=300, width=600, height=600, rx=20 -->
  <g transform="translate(240, 300)">
    <rect width="600" height="600" rx="20" fill="#ffffff" stroke="url(#goldBorder)" stroke-width="4"/>
    <rect x="8" y="8" width="584" height="584" rx="16" fill="#fdfbf7"/>
    <!-- Placeholder Hint -->
    <circle cx="300" cy="270" r="50" fill="none" stroke="url(#gold)" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="300" y="360" text-anchor="middle" fill="url(#gold)" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" letter-spacing="1">INSERT HONOREE PHOTO</text>
    <text x="300" y="390" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="14">Dimensions: 600 × 600 px (1:1 Ratio)</text>
  </g>

  <!-- Award Description & Ribbon -->
  <g transform="translate(540, 960)">
    <text x="0" y="0" text-anchor="middle" fill="#334155" font-family="Georgia, 'Times New Roman', serif" font-size="24" font-style="italic">"For outstanding commitment, leadership, and exemplary dedication"</text>
    <line x1="-200" y1="30" x2="200" y2="30" stroke="url(#gold)" stroke-width="1.5" stroke-opacity="0.6"/>
    <text x="0" y="70" text-anchor="middle" fill="url(#gold)" font-family="Georgia, 'Times New Roman', serif" font-size="28" font-weight="bold">LEADERSHIP &amp; EXCELLENCE AWARD</text>
    <text x="0" y="105" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="16" letter-spacing="1">PRESENTED THIS QUARTER • GLOBAL OPERATIONS DIVISION</text>
  </g>

  <!-- Bottom Seal -->
  <g transform="translate(540, 1190)">
    <circle cx="0" cy="0" r="38" fill="#fff9eb"/>
    <circle cx="0" cy="0" r="34" fill="none" stroke="url(#gold)" stroke-width="2"/>
    <text x="0" y="6" text-anchor="middle" fill="url(#gold)" font-family="Georgia, serif" font-size="12" font-weight="bold">OFFICIAL SEAL</text>
  </g>
</svg>`;

// 3. Neon Beats Music Festival - Vibrant Bright Sunset Style
const musicFestivalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <defs>
    <linearGradient id="festivalLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff1f2"/>
      <stop offset="40%" stop-color="#fdf4ff"/>
      <stop offset="100%" stop-color="#f0f9ff"/>
    </linearGradient>
    <linearGradient id="magentaViolet" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e11d48"/>
      <stop offset="50%" stop-color="#9333ea"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>

  <rect width="1080" height="1350" fill="url(#festivalLight)"/>

  <!-- Ambient Light Orbs -->
  <ellipse cx="540" cy="180" rx="400" ry="120" fill="#fbcfe8" opacity="0.5"/>
  <ellipse cx="200" cy="700" rx="200" ry="300" fill="#c7d2fe" opacity="0.4"/>

  <!-- Festival Header -->
  <text x="540" y="100" text-anchor="middle" fill="#e11d48" font-family="'Arial Black', Impact, sans-serif" font-size="18" letter-spacing="8">SUMMER 2026 LIVE ON STAGE</text>
  <text x="540" y="175" text-anchor="middle" fill="#0f172a" font-family="'Arial Black', Impact, sans-serif" font-size="70" font-weight="900" letter-spacing="2">NEON BEATS</text>
  <text x="540" y="225" text-anchor="middle" fill="url(#magentaViolet)" font-family="'Arial Black', Impact, sans-serif" font-size="32" letter-spacing="4">WORLD MUSIC FESTIVAL</text>

  <!-- Photo Area: x=180, y=260, width=720, height=680, rx=20 -->
  <g transform="translate(180, 260)">
    <rect width="720" height="680" rx="20" fill="#ffffff" stroke="#e11d48" stroke-width="4"/>
    <rect x="4" y="4" width="712" height="672" rx="16" fill="#fff1f2" opacity="0.6"/>
    <!-- Vibrant border accent -->
    <rect x="12" y="12" width="696" height="656" rx="12" fill="none" stroke="#9333ea" stroke-width="2" stroke-dasharray="12 8" opacity="0.7"/>

    <circle cx="360" cy="300" r="55" fill="#ffffff" stroke="#e11d48" stroke-width="2"/>
    <polygon points="350,280 380,300 350,320" fill="#e11d48"/>
    <text x="360" y="395" text-anchor="middle" fill="#0f172a" font-family="'Arial Black', Impact, sans-serif" font-size="22" letter-spacing="2">HEADLINER ARTIST PHOTO</text>
    <text x="360" y="430" text-anchor="middle" fill="#7c3aed" font-family="system-ui, sans-serif" font-size="14" font-weight="600">Dimensions: 720 × 680 px • Auto-cropped</text>
  </g>

  <!-- Soundwave graphics -->
  <g transform="translate(180, 980)" fill="#e11d48" opacity="0.9">
    <rect x="0" y="20" width="8" height="40" rx="4"/>
    <rect x="20" y="10" width="8" height="60" rx="4" fill="#9333ea"/>
    <rect x="40" y="0" width="8" height="80" rx="4"/>
    <rect x="60" y="15" width="8" height="50" rx="4" fill="#2563eb"/>
    <rect x="80" y="25" width="8" height="30" rx="4"/>
  </g>

  <!-- Lineup Details Card -->
  <g transform="translate(300, 980)">
    <text x="0" y="28" fill="#0f172a" font-family="'Arial Black', Impact, sans-serif" font-size="34" letter-spacing="1">SPECIAL GUEST STAR</text>
    <text x="0" y="60" fill="#e11d48" font-family="system-ui, sans-serif" font-size="18" font-weight="700">EXCLUSIVE 90-MINUTE LIVE PERFORMANCE</text>
    <text x="0" y="88" fill="#64748b" font-family="system-ui, sans-serif" font-size="15">SATURDAY NIGHT • MAIN ELECTRONIC DOME • 11:00 PM</text>
  </g>

  <!-- Bottom Dates -->
  <rect x="180" y="1120" width="720" height="120" rx="16" fill="#ffffff" stroke="#fbcfe8" stroke-width="2"/>
  <text x="230" y="1170" fill="#0f172a" font-family="'Arial Black', Impact, sans-serif" font-size="22">JULY 17-19 • MIAMI, FL</text>
  <text x="230" y="1205" fill="#7c3aed" font-family="system-ui, sans-serif" font-size="14" font-weight="600">TICKETS &amp; VIP ACCESS AT NEONBEATSFEST.COM</text>
  <text x="850" y="1190" text-anchor="end" fill="#e11d48" font-family="'Arial Black', Impact, sans-serif" font-size="28">SOLD OUT</text>
</svg>`;

// 4. Champion Sports Spotlight - Bright Clean Athletics Style
const athleteSpotlightSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <defs>
    <linearGradient id="sportsLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#fff1f2"/>
    </linearGradient>
    <linearGradient id="redCrimson" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
  </defs>

  <rect width="1080" height="1350" fill="url(#sportsLight)"/>

  <!-- Aggressive Angular Graphics in Light Accents -->
  <polygon points="0,0 600,0 450,220 0,220" fill="#dc2626" opacity="0.08"/>
  <polygon points="1080,1100 500,1350 1080,1350" fill="#ea580c" opacity="0.1"/>

  <!-- Top Badges -->
  <g transform="translate(100, 80)">
    <rect width="140" height="34" rx="6" fill="#dc2626"/>
    <text x="70" y="23" text-anchor="middle" fill="#ffffff" font-family="Impact, sans-serif" font-size="16" letter-spacing="2">OFFICIAL</text>
  </g>
  <text x="980" y="105" text-anchor="end" fill="#475569" font-family="system-ui, sans-serif" font-size="16" font-weight="800" letter-spacing="3">SEASON 2026</text>

  <!-- Big Bold Title -->
  <text x="100" y="175" fill="#0f172a" font-family="Impact, sans-serif" font-size="76" letter-spacing="2">CHAMPION SPOTLIGHT</text>
  <text x="100" y="225" fill="url(#redCrimson)" font-family="Impact, sans-serif" font-size="34" letter-spacing="4">PLAYER OF THE TOURNAMENT</text>

  <!-- Photo Area: x=200, y=260, width=680, height=660, rx=16 -->
  <g transform="translate(200, 260)">
    <rect width="680" height="660" rx="16" fill="#ffffff" stroke="#dc2626" stroke-width="4"/>
    <rect x="4" y="4" width="672" height="652" rx="12" fill="#fff1f2" opacity="0.6"/>
    <!-- Sport Crosshair Badge -->
    <circle cx="340" cy="290" r="50" fill="#ffffff" stroke="#ea580c" stroke-width="2"/>
    <line x1="340" y1="225" x2="340" y2="355" stroke="#ea580c" stroke-width="2"/>
    <line x1="275" y1="290" x2="405" y2="290" stroke="#ea580c" stroke-width="2"/>
    <text x="340" y="380" text-anchor="middle" fill="#0f172a" font-family="Impact, sans-serif" font-size="24" letter-spacing="1">ATHLETE PHOTO GOES HERE</text>
    <text x="340" y="415" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="14">Dimensions: 680 × 660 px • Perfectly Centered</text>
  </g>

  <!-- Athlete Stat Bar -->
  <g transform="translate(200, 960)">
    <rect width="680" height="150" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
    <g transform="translate(50, 45)">
      <text x="0" y="0" fill="#dc2626" font-family="Impact, sans-serif" font-size="36">#01</text>
      <text x="0" y="30" fill="#64748b" font-family="system-ui, sans-serif" font-size="13" font-weight="700">LEAGUE RANK</text>
    </g>
    <line x1="190" y1="30" x2="190" y2="120" stroke="#e2e8f0" stroke-width="1"/>
    <g transform="translate(230, 45)">
      <text x="0" y="0" fill="#0f172a" font-family="Impact, sans-serif" font-size="36">MVP</text>
      <text x="0" y="30" fill="#64748b" font-family="system-ui, sans-serif" font-size="13" font-weight="700">HONORS</text>
    </g>
    <line x1="370" y1="30" x2="370" y2="120" stroke="#e2e8f0" stroke-width="1"/>
    <g transform="translate(410, 45)">
      <text x="0" y="0" fill="#ea580c" font-family="Impact, sans-serif" font-size="36">98.4%</text>
      <text x="0" y="30" fill="#64748b" font-family="system-ui, sans-serif" font-size="13" font-weight="700">WIN RATE</text>
    </g>
  </g>

  <!-- Footer -->
  <text x="540" y="1220" text-anchor="middle" fill="#0f172a" font-family="Impact, sans-serif" font-size="28" letter-spacing="3">UNSTOPPABLE DEDICATION • PEAK PERFORMANCE</text>
  <text x="540" y="1255" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="14">NATIONAL ATHLETICS FEDERATION • COMMEMORATIVE POSTER</text>
</svg>`;

// 5. Graduation Class of 2026 - Bright Royal & Gold Celebration
const graduationSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <defs>
    <linearGradient id="gradLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#eff6ff"/>
    </linearGradient>
    <linearGradient id="goldCap" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>

  <rect width="1080" height="1350" fill="url(#gradLight)"/>

  <!-- Golden Stars & Confetti dots -->
  <circle cx="120" cy="180" r="5" fill="#f59e0b" opacity="0.7"/>
  <circle cx="940" cy="160" r="6" fill="#3b82f6" opacity="0.6"/>
  <circle cx="160" cy="980" r="6" fill="#f59e0b" opacity="0.5"/>
  <circle cx="920" cy="1020" r="5" fill="#3b82f6" opacity="0.6"/>

  <!-- Graduation Cap Icon -->
  <g transform="translate(540, 110)">
    <polygon points="0,-20 40,-5 0,10 -40,-5" fill="url(#goldCap)"/>
    <path d="M -25,0 L -25,18 Q 0,30 25,18 L 25,0" fill="none" stroke="url(#goldCap)" stroke-width="2.5"/>
    <line x1="35" y1="-3" x2="45" y2="20" stroke="#d97706" stroke-width="2"/>
    <circle cx="45" cy="22" r="3" fill="#d97706"/>
  </g>

  <text x="540" y="190" text-anchor="middle" fill="#d97706" font-family="Georgia, serif" font-size="22" letter-spacing="6">CONGRATULATIONS</text>
  <text x="540" y="245" text-anchor="middle" fill="#0f172a" font-family="Georgia, serif" font-size="52" font-weight="bold">CLASS OF 2026</text>

  <!-- Photo Area: x=240, y=290, width=600, height=620, rx=24 -->
  <g transform="translate(240, 290)">
    <rect width="600" height="620" rx="24" fill="#ffffff" stroke="#2563eb" stroke-width="4"/>
    <rect x="4" y="4" width="592" height="612" rx="20" fill="#eff6ff" opacity="0.7"/>
    <circle cx="300" cy="270" r="55" fill="#ffffff" stroke="#d97706" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="300" y="360" text-anchor="middle" fill="#1e3a8a" font-family="Georgia, serif" font-size="22">GRADUATE PORTRAIT</text>
    <text x="300" y="395" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="14">Dimensions: 600 × 620 px • Auto-cropped</text>
  </g>

  <!-- Bottom Honors Card -->
  <g transform="translate(540, 970)">
    <text x="0" y="0" text-anchor="middle" fill="#1e293b" font-family="Georgia, serif" font-size="26" font-style="italic">"The future belongs to those who believe in the beauty of their dreams."</text>
    <text x="0" y="50" text-anchor="middle" fill="#d97706" font-family="Georgia, serif" font-size="24" font-weight="bold">DEGREE OF ACADEMIC EXCELLENCE</text>
    <text x="0" y="85" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="16">COMMENCEMENT CEREMONY • MAY 28, 2026</text>
  </g>

  <!-- Bottom Border -->
  <line x1="200" y1="1120" x2="880" y2="1120" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="540" y="1170" text-anchor="middle" fill="#2563eb" font-family="system-ui, sans-serif" font-size="15" font-weight="600">HONOR ROLL • SUMMA CUM LAUDE</text>
</svg>`;

// 6. Vintage Wanted Retro Poster - Cream Warm Parchment Style
const vintageWantedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <defs>
    <linearGradient id="parchment" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef9ee"/>
      <stop offset="50%" stop-color="#faebd7"/>
      <stop offset="100%" stop-color="#f3dfbf"/>
    </linearGradient>
  </defs>

  <rect width="1080" height="1350" fill="url(#parchment)"/>

  <!-- Vintage Woodcut Frame Border -->
  <rect x="50" y="50" width="980" height="1250" fill="none" stroke="#3e2723" stroke-width="12"/>
  <rect x="70" y="70" width="940" height="1210" fill="none" stroke="#3e2723" stroke-width="3"/>

  <!-- Stars -->
  <text x="180" y="170" fill="#3e2723" font-size="40">★</text>
  <text x="900" y="170" text-anchor="end" fill="#3e2723" font-size="40">★</text>

  <!-- WANTED Heading -->
  <text x="540" y="180" text-anchor="middle" fill="#3e2723" font-family="'Times New Roman', Georgia, serif" font-size="96" font-weight="900" letter-spacing="12">WANTED</text>
  <text x="540" y="240" text-anchor="middle" fill="#4e342e" font-family="'Times New Roman', Georgia, serif" font-size="28" font-weight="bold" letter-spacing="4">DEAD OR ALIVE</text>

  <!-- Photo Area: x=220, y=280, width=640, height=620, rx=8 -->
  <g transform="translate(220, 280)">
    <rect width="640" height="620" rx="8" fill="#ffffff" stroke="#3e2723" stroke-width="6"/>
    <rect x="10" y="10" width="620" height="600" rx="4" fill="#fef9ee" opacity="0.9"/>
    <circle cx="320" cy="270" r="55" fill="none" stroke="#4e342e" stroke-width="3" stroke-dasharray="8 6"/>
    <text x="320" y="360" text-anchor="middle" fill="#3e2723" font-family="'Times New Roman', serif" font-size="24" font-weight="bold">OUTLAW PHOTO HERE</text>
    <text x="320" y="395" text-anchor="middle" fill="#5d4037" font-family="system-ui, sans-serif" font-size="14">Dimensions: 640 × 620 px</text>
  </g>

  <!-- Reward Banner -->
  <g transform="translate(540, 960)">
    <text x="0" y="0" text-anchor="middle" fill="#3e2723" font-family="'Times New Roman', Georgia, serif" font-size="38" font-weight="bold" letter-spacing="2">FOR BEING EXTREMELY AWESOME</text>
    <line x1="-300" y1="20" x2="300" y2="20" stroke="#3e2723" stroke-width="3"/>
    <text x="0" y="80" text-anchor="middle" fill="#b71c1c" font-family="'Times New Roman', Georgia, serif" font-size="64" font-weight="900" letter-spacing="4">REWARD: $1,000,000</text>
    <text x="0" y="125" text-anchor="middle" fill="#4e342e" font-family="'Times New Roman', Georgia, serif" font-size="20" font-weight="bold" letter-spacing="2">PAYABLE IN GOLD BULLION BY THE SHERIFF'S OFFICE</text>
  </g>

  <text x="540" y="1220" text-anchor="middle" fill="#5d4037" font-family="'Times New Roman', serif" font-size="16" letter-spacing="1">COUNTY MARSHAL • POSTED OCTOBER 2026</text>
</svg>`;

fs.writeFileSync(path.join(outDir, 'tech-summit.svg'), techSummitSvg.trim());
fs.writeFileSync(path.join(outDir, 'employee-award.svg'), employeeAwardSvg.trim());
fs.writeFileSync(path.join(outDir, 'music-festival.svg'), musicFestivalSvg.trim());
fs.writeFileSync(path.join(outDir, 'athlete-spotlight.svg'), athleteSpotlightSvg.trim());
fs.writeFileSync(path.join(outDir, 'graduation.svg'), graduationSvg.trim());
fs.writeFileSync(path.join(outDir, 'vintage-wanted.svg'), vintageWantedSvg.trim());

console.log('Successfully regenerated 6 bright modern poster templates in public/templates!');
