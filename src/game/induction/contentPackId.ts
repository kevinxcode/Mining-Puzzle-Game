/**
 * Site Induction — built-in content pack in Bahasa Indonesia.
 * Mirrors the English pack exactly (ids, numbers, correct answers, defect/critical
 * flags, practice levels); only the text differs. A test keeps the two in sync.
 * Materi pelatihan umum, bukan prosedur site tertentu — selalu ikuti aturan site Anda.
 */

import { CONTENT_PACK_FORMAT, DEFAULT_CONTENT_PACK, type ContentPack } from './contentPack';
import type { PrestartScenario } from './prestart';
import type { GlossaryTerm, InductionModule } from './types';

const MODULES_ID: InductionModule[] = [
  {
    id: 'haul-cycle',
    number: 1,
    title: 'Siklus Hauling',
    summary: 'Muat, angkut, buang, kembali — siklus yang memindahkan setiap ton material.',
    icon: 'cycle',
    practiceLevelId: '1',
    practiceNote: 'Jalankan satu truk melalui satu siklus penuh dan amati setiap tahapnya.',
    cards: [
      {
        id: 'cycle-stages',
        title: 'Empat tahap, satu siklus',
        body: 'Setiap truk mengulang siklus yang sama: DIMUAT oleh excavator, MENGANGKUT material di jalan hauling, MEMBUANG muatan di titik buang (dumping point), lalu KEMBALI kosong untuk muatan berikutnya.',
        art: 'diagram-cycle',
        keyPoint: 'Muat → Angkut → Buang → Kembali.',
      },
      {
        id: 'cycle-time',
        title: 'Cycle time (waktu siklus)',
        body: 'Cycle time adalah lamanya satu siklus penuh. Siklus yang lebih singkat berarti ritase lebih banyak per shift. Antrean, jalan memutar, dan jalan yang lambat membuat siklus lebih panjang.',
        art: 'icon-timer',
        keyPoint: 'Ritase per shift lebih banyak = tonase yang dipindahkan lebih besar.',
      },
      {
        id: 'cycle-payload',
        title: 'Payload (muatan)',
        body: 'Payload adalah berat muatan yang dibawa truk dalam satu ritase. Produksi = payload × ritase. Targetnya: truk terisi penuh dengan benar pada siklus yang singkat.',
        art: 'icon-payload',
      },
    ],
    questions: [
      {
        id: 'hc-q1',
        prompt: 'Manakah urutan siklus hauling yang benar?',
        options: [
          { id: 'a', text: 'Angkut → Muat → Kembali → Buang', correct: false },
          { id: 'b', text: 'Muat → Angkut → Buang → Kembali', correct: true },
          { id: 'c', text: 'Buang → Muat → Angkut → Kembali', correct: false },
        ],
        explanation: 'Truk dimuat di front, mengangkut ke titik buang, membuang muatan, lalu kembali kosong.',
      },
      {
        id: 'hc-q2',
        prompt: 'Cycle time adalah…',
        options: [
          { id: 'a', text: 'Waktu untuk memuat satu bucket', correct: false },
          { id: 'b', text: 'Lamanya satu shift penuh', correct: false },
          { id: 'c', text: 'Waktu untuk satu siklus lengkap muat-angkut-buang-kembali', correct: true },
        ],
        explanation: 'Cycle time mencakup seluruh siklus, termasuk waktu menunggu di sepanjang jalan.',
      },
      {
        id: 'hc-q3',
        prompt: 'Perubahan mana yang memindahkan lebih banyak tonase dalam shift yang sama?',
        options: [
          { id: 'a', text: 'Memperpendek cycle time', correct: true },
          { id: 'b', text: 'Menambah jalan memutar yang lebih panjang', correct: false },
          { id: 'c', text: 'Mengirim truk dengan muatan setengah', correct: false },
        ],
        explanation: 'Produksi = payload × ritase. Siklus yang lebih singkat menghasilkan ritase lebih banyak.',
      },
    ],
  },
  {
    id: 'bucket-passes',
    number: 2,
    title: 'Pass Bucket & Pencocokan Truk',
    summary: 'Sesuaikan ukuran truk dengan excavator agar setiap muatan penuh dan cepat.',
    icon: 'bucket',
    practiceLevelId: '6',
    practiceNote: 'Dua truk berbeda ukuran berbagi satu excavator — bandingkan proses pemuatannya.',
    cards: [
      {
        id: 'passes-what',
        title: 'Apa itu pass bucket?',
        body: 'Setiap kali excavator menumpahkan satu bucket ke truk dihitung satu pass. Truk memerlukan beberapa pass hingga penuh. Pass yang lebih sedikit dan lebih penuh membuat pemuatan lebih cepat.',
        art: 'diagram-passes',
        keyPoint: 'Jumlah pass = payload truk ÷ kapasitas bucket.',
      },
      {
        id: 'passes-match',
        title: 'Cocokkan truk dengan alat muat',
        body: 'Pencocokan yang baik mengisi truk dalam jumlah pass bulat (misalnya 4). Pencocokan yang buruk menyisakan pass terakhir yang setengah kosong, atau truk terlalu kecil sehingga excavator harus menunggu truk berikutnya.',
        art: 'icon-match',
      },
      {
        id: 'passes-overload',
        title: 'Jangan pernah overload',
        body: 'Memuat melebihi payload yang diizinkan membebani ban, rem, dan jalan, serta dapat menyebabkan material tumpah. Hentikan pemuatan pada batas payload, meskipun vessel masih muat.',
        art: 'icon-warning',
        keyPoint: 'Penuh itu baik. Overload itu tidak aman.',
      },
    ],
    questions: [
      {
        id: 'bp-q1',
        prompt: 'Sebuah truk berkapasitas 60 t dan bucket memuat 15 t. Berapa pass untuk mengisinya?',
        options: [
          { id: 'a', text: '3 pass', correct: false },
          { id: 'b', text: '4 pass', correct: true },
          { id: 'c', text: '6 pass', correct: false },
        ],
        explanation: '60 ÷ 15 = 4 pass penuh — truk yang cocok dengan alat muatnya.',
      },
      {
        id: 'bp-q2',
        prompt: 'Vessel masih memiliki ruang, tetapi truk sudah mencapai batas payload. Apa yang harus dilakukan?',
        options: [
          { id: 'a', text: 'Tambahkan satu pass lagi untuk memanfaatkan ruang', correct: false },
          { id: 'b', text: 'Hentikan pemuatan dan berangkatkan truk', correct: true },
        ],
        explanation: 'Batas payload adalah batas maksimal. Overload menimbulkan risiko keselamatan dan kerusakan alat.',
      },
    ],
  },
  {
    id: 'queueing',
    number: 3,
    title: 'Antrean & Waktu Idle',
    summary: 'Truk yang menunggu membuang waktu dan BBM. Sebarkan armada agar tetap bergerak.',
    icon: 'queue',
    practiceLevelId: '13',
    practiceNote: 'Dua excavator, dua truk — bagi agar tidak ada yang mengantre.',
    cards: [
      {
        id: 'queue-what',
        title: 'Antrean terbentuk di alat muat',
        body: 'Excavator hanya dapat memuat satu truk dalam satu waktu. Jika truk datang lebih cepat daripada kemampuan memuatnya, truk lain harus menunggu dalam antrean.',
        art: 'diagram-queue',
      },
      {
        id: 'queue-cost',
        title: 'Waktu idle adalah waktu yang hilang',
        body: 'Truk yang mengantre tetap membakar BBM tetapi tidak memindahkan material. Utilisasi — persentase waktu alat benar-benar bekerja — menurun.',
        art: 'icon-idle',
        keyPoint: 'Pantau waktu antrean. Antrean tinggi = terlalu banyak truk pada satu alat muat.',
      },
      {
        id: 'queue-balance',
        title: 'Seimbangkan armada',
        body: 'Jika satu alat muat memiliki antrean sementara alat muat lain menunggu truk, pindahkan satu truk. Rencana terbaik membuat excavator dan truk sama-sama tetap sibuk.',
        art: 'icon-balance',
      },
    ],
    questions: [
      {
        id: 'q-q1',
        prompt: 'Tiga truk mengantre di Excavator A, sementara Excavator B tidak memiliki truk. Apa langkah terbaik?',
        options: [
          { id: 'a', text: 'Pindahkan satu truk ke Excavator B', correct: true },
          { id: 'b', text: 'Tambahkan truk lagi ke Excavator A', correct: false },
          { id: 'c', text: 'Biarkan saja — antrean itu wajar', correct: false },
        ],
        explanation: 'Memindahkan truk ke alat muat yang idle mengurangi waktu antrean dan menaikkan produksi.',
      },
      {
        id: 'q-q2',
        prompt: 'Truk yang menunggu dalam antrean dengan mesin menyala adalah…',
        options: [
          { id: 'a', text: 'Waktu produktif', correct: false },
          { id: 'b', text: 'Waktu idle yang membakar BBM', correct: true },
        ],
        explanation: 'Menunggu tidak memindahkan material, tetapi tetap menghabiskan BBM.',
      },
      {
        id: 'q-q3',
        prompt: 'Utilisasi berarti…',
        options: [
          { id: 'a', text: 'Seberapa cepat truk dapat melaju', correct: false },
          { id: 'b', text: 'Seberapa banyak BBM yang dapat ditampung truk', correct: false },
          { id: 'c', text: 'Persentase waktu alat benar-benar bekerja', correct: true },
        ],
        explanation: 'Utilisasi yang lebih tinggi berarti lebih sedikit menunggu dan lebih banyak pekerjaan selesai.',
      },
    ],
  },
  {
    id: 'routes',
    number: 4,
    title: 'Pemilihan Rute & Lalu Lintas',
    summary: 'Jalan terpendek belum tentu tercepat. Rencanakan dengan memperhitungkan lalu lintas.',
    icon: 'route',
    practiceLevelId: '11',
    practiceNote: 'Coba setiap rute dan bandingkan waktu tempuhnya.',
    cards: [
      {
        id: 'routes-choice',
        title: 'Pendek vs. cepat',
        body: 'Jalan pendek dengan ramp curam, berlumpur, atau lalu lintas padat bisa lebih lambat daripada jalan yang lebih jauh tetapi lancar. Pilih rute dengan total waktu tempuh terbaik.',
        art: 'diagram-routes',
        keyPoint: 'Nilai rute dari waktu tempuh, bukan jarak.',
      },
      {
        id: 'routes-traffic',
        title: 'Persimpangan dan lalu lintas',
        body: 'Di persimpangan jalan hauling, truk wajib memperlambat laju dan memberi jalan. Terlalu banyak truk di satu jalan menimbulkan kemacetan. Menyebarkan lalu lintas membuat semua unit tetap bergerak.',
        art: 'icon-traffic',
      },
    ],
    questions: [
      {
        id: 'r-q1',
        prompt: 'Rute A lebih pendek tetapi berlumpur dan padat. Rute B lebih jauh tetapi lancar. Mana yang biasanya lebih baik?',
        options: [
          { id: 'a', text: 'Selalu Rute A — karena lebih pendek', correct: false },
          { id: 'b', text: 'Rute dengan total waktu tempuh lebih singkat, sering kali B', correct: true },
        ],
        explanation: 'Lumpur dan lalu lintas memperlambat truk. Total waktu tempuh adalah yang terpenting.',
      },
      {
        id: 'r-q2',
        prompt: 'Apa penyebab kemacetan di jalan hauling?',
        options: [
          { id: 'a', text: 'Terlalu banyak truk memakai satu jalan atau persimpangan', correct: true },
          { id: 'b', text: 'Truk yang bermuatan penuh', correct: false },
          { id: 'c', text: 'Menggunakan lebih dari satu rute', correct: false },
        ],
        explanation: 'Jalan yang padat dan persimpangan yang sibuk memaksa truk menunggu.',
      },
    ],
  },
  {
    id: 'fuel',
    number: 5,
    title: 'Perencanaan BBM',
    summary: 'Isi BBM sesuai rencana, bukan saat tangki habis di tengah ramp.',
    icon: 'fuel',
    practiceLevelId: '21',
    practiceNote: 'Pantau level BBM dan kirim truk ke tempat pengisian BBM sebelum hampir habis.',
    cards: [
      {
        id: 'fuel-burn',
        title: 'Setiap ritase membakar BBM',
        body: 'Truk bermuatan, ramp menanjak, dan idle yang lama paling banyak menghabiskan BBM. Truk yang kehabisan BBM berhenti di tempat dan menghalangi jalan.',
        art: 'diagram-fuel',
      },
      {
        id: 'fuel-plan',
        title: 'Rencanakan pengisian BBM',
        body: 'Kirim truk untuk mengisi BBM saat kosong muatan dan dekat tempat pengisian, serta atur bergiliran agar seluruh armada tidak berhenti bersamaan.',
        art: 'icon-plan',
        keyPoint: 'Isi BBM lebih awal, saat kosong muatan, dan satu per satu.',
      },
    ],
    questions: [
      {
        id: 'f-q1',
        prompt: 'Kapan waktu terbaik mengirim truk untuk mengisi BBM?',
        options: [
          { id: 'a', text: 'Saat kosong muatan, BBM rendah, dan dekat tempat pengisian', correct: true },
          { id: 'b', text: 'Hanya setelah tangki benar-benar kosong', correct: false },
          { id: 'c', text: 'Kirim semua truk pada waktu yang sama', correct: false },
        ],
        explanation: 'Pengisian BBM yang terencana dan bergiliran menjaga produksi tetap berjalan.',
      },
      {
        id: 'f-q2',
        prompt: 'Manakah yang PALING banyak menggunakan BBM?',
        options: [
          { id: 'a', text: 'Truk kosong di jalan datar', correct: false },
          { id: 'b', text: 'Truk bermuatan yang menanjak di ramp', correct: true },
        ],
        explanation: 'Berat muatan dan kemiringan jalan sama-sama meningkatkan konsumsi BBM.',
      },
    ],
  },
  {
    id: 'safety',
    number: 6,
    title: 'Dasar-Dasar K3 Site',
    summary: 'Hak jalan, kecepatan, jalan sempit, unit rusak, dan pemeriksaan P2H.',
    icon: 'safety',
    practiceLevelId: '33',
    practiceNote: 'Sebuah truk akan mengalami kerusakan — tetap tenang dan alihkan rute truk lainnya.',
    cards: [
      {
        id: 'safety-row',
        title: 'Truk bermuatan memiliki hak jalan',
        body: 'Dump truck bermuatan sangat berat dan memerlukan jarak pengereman yang panjang. Kendaraan ringan (LV) dan truk kosong wajib memberi jalan kepada truk bermuatan, terutama di ramp.',
        art: 'diagram-right-of-way',
        keyPoint: 'Jika ragu, beri jalan kepada truk bermuatan.',
      },
      {
        id: 'safety-speed',
        title: 'Batas kecepatan dan jalan sempit',
        body: 'Patuhi rambu batas kecepatan — batas tersebut ditetapkan berdasarkan kemiringan, jarak pandang, dan kondisi jalan. Di ruas satu arah atau satu lajur, ikuti rambu dan tunggu hingga jalan kosong sebelum masuk.',
        art: 'icon-speed',
      },
      {
        id: 'safety-breakdown',
        title: 'Unit rusak: berhenti, amankan, laporkan',
        body: 'Jika truk rusak, berhentilah di tempat yang aman, pasang rem parkir, nyalakan lampu hazard, dan laporkan melalui radio. Operator lain memperlambat laju dan mengikuti instruksi untuk melintas atau mengalihkan rute.',
        art: 'icon-breakdown',
        keyPoint: 'Jangan pernah memaksa melewati truk rusak tanpa izin.',
      },
      {
        id: 'safety-prestart',
        title: 'Pemeriksaan P2H',
        body: 'Sebelum setiap shift, periksa unit dengan berjalan mengelilinginya: ban, lampu, klakson, rem, spion, kebocoran, dan level cairan. Laporkan setiap kerusakan sebelum mengoperasikan unit.',
        art: 'icon-checklist',
      },
    ],
    questions: [
      {
        id: 's-q1',
        prompt: 'Dump truck bermuatan dan kendaraan ringan (LV) bertemu di ramp. Siapa yang memberi jalan?',
        options: [
          { id: 'a', text: 'Dump truck bermuatan', correct: false },
          { id: 'b', text: 'Kendaraan ringan (LV)', correct: true },
        ],
        explanation: 'Truk bermuatan memiliki hak jalan — truk tersebut tidak dapat berhenti dengan cepat.',
      },
      {
        id: 's-q2',
        prompt: 'Truk Anda rusak di jalan hauling. Apa yang pertama kali Anda lakukan?',
        options: [
          { id: 'a', text: 'Berhenti dengan aman, amankan truk, nyalakan lampu hazard, dan laporkan melalui radio', correct: true },
          { id: 'b', text: 'Berjalan kaki ke workshop untuk meminta bantuan', correct: false },
          { id: 'c', text: 'Tetap berjalan pelan menuju titik buang', correct: false },
        ],
        explanation: 'Berhenti, amankan, dan laporkan agar lalu lintas lain dapat diatur dengan aman.',
      },
      {
        id: 's-q3',
        prompt: 'Kapan pemeriksaan P2H harus dilakukan?',
        options: [
          { id: 'a', text: 'Seminggu sekali', correct: false },
          { id: 'b', text: 'Hanya jika terdengar ada yang tidak beres', correct: false },
          { id: 'c', text: 'Sebelum mengoperasikan unit, di awal setiap shift', correct: true },
        ],
        explanation: 'Pemeriksaan P2H menemukan kerusakan sebelum menjadi insiden.',
      },
    ],
  },
];

const GLOSSARY_ID: GlossaryTerm[] = [
  { term: 'Pass bucket', definition: 'Satu kali curahan material yang dijatuhkan excavator ke dalam truk. Truk biasanya terisi dalam beberapa pass.' },
  { term: 'Cycle time (waktu siklus)', definition: 'Total waktu untuk satu ritase penuh: muat, angkut, buang, dan kembali ke titik muat.' },
  { term: 'Titik buang (dumping point)', definition: 'Tempat truk membuang muatan, seperti crusher, stockpile, atau disposal.' },
  { term: 'Jalan hauling', definition: 'Jalan yang dibangun untuk truk berat mengangkut material antara pit dan titik buang.' },
  { term: 'Truk bermuatan', definition: 'Truk yang membawa material. Truk ini berat dan sulit berhenti, sehingga memiliki hak jalan.' },
  { term: 'Bijih (ore)', definition: 'Batuan atau material yang mengandung sesuatu yang bernilai dan dikirim untuk diolah.' },
  { term: 'Overburden (OB)', definition: 'Batuan dan tanah penutup di atas bijih yang harus dikupas terlebih dahulu dan dibawa ke disposal.' },
  { term: 'Payload (muatan)', definition: 'Berat material yang dibawa truk dalam satu ritase, diukur dalam ton.' },
  { term: 'P2H (Pemeriksaan dan Perawatan Harian)', definition: 'Pemeriksaan keliling unit sebelum shift: ban, lampu, rem, kebocoran, cairan, dan alarm.' },
  { term: 'Laju produksi', definition: 'Jumlah material yang dipindahkan dalam satu satuan waktu, biasanya ton per jam.' },
  { term: 'Waktu antrean', definition: 'Waktu yang dihabiskan truk untuk menunggu giliran dimuat atau membuang muatan.' },
  { term: 'Waktu idle', definition: 'Waktu ketika mesin menyala tetapi tidak melakukan pekerjaan produktif, misalnya menunggu tanpa ada yang dimuat.' },
  { term: 'Pengisian BBM (refuelling)', definition: 'Berhenti di tempat pengisian BBM untuk menambah bahan bakar. Pengisian terencana mencegah truk kehabisan BBM di jalan.' },
  { term: 'Hak jalan (right of way)', definition: 'Aturan tentang siapa yang jalan lebih dulu. Di jalan hauling, truk bermuatan dan kendaraan darurat biasanya didahulukan.' },
  { term: 'Spotting', definition: 'Memosisikan truk di tempat yang tepat di samping excavator agar dapat dimuat dengan aman dan cepat.' },
  { term: 'Pencocokan truk (truck matching)', definition: 'Memasangkan truk dengan excavator agar muatan penuh tercapai dalam jumlah pass bulat.' },
  { term: 'Utilisasi', definition: 'Persentase waktu alat bekerja, bukan menunggu. Semakin tinggi semakin baik.' },
  { term: 'Windrow (tanggul pengaman)', definition: 'Tanggul (tumpukan material) di sepanjang tepi jalan hauling yang membantu mencegah kendaraan keluar jalur.' },
];

const MIRRORS = 'Spion dan kamera menjangkau titik buta yang luas di sekitar dump truck.';
const LIGHTS = 'Lampu rotari dan lampu-lampu membuat Anda terlihat oleh operator lain, terutama pada malam hari dan saat berdebu.';
const SEATBELT = 'Sabuk pengaman menjaga Anda tetap berada di dalam struktur pelindung kabin jika truk terguling.';
const EXTINGUISHER = 'APAR di kabin adalah pertahanan pertama Anda terhadap kebakaran.';
const HORN_SHORT = 'Klakson memberi tanda maksud Anda sebelum menyalakan mesin dan bergerak.';

const PRESTART_ID: PrestartScenario[] = [
  {
    id: 'truck-a',
    title: 'DT-07 · Shift siang',
    brief: 'Dump truck standar terparkir di barisan siap operasi. Periksa unit sebelum shift Anda dimulai.',
    items: [
      { id: 'tyres', area: 'walkaround', label: 'Ban & velg', observation: 'Tapak ban rata, tidak ada sobekan, semua mur roda dan indikatornya sejajar.', defect: false, explanation: 'Periksa setiap roda dari sobekan, benjolan, tekanan kurang, serta mur roda yang kendur atau hilang.' },
      { id: 'leaks', area: 'walkaround', label: 'Kebocoran cairan', observation: 'Tanah di bawah truk kering. Tidak ada tetesan oli atau coolant.', defect: false, explanation: 'Cairan baru di bawah truk menandakan kebocoran hidraulik, oli, atau coolant — temukan sumbernya sebelum menyalakan mesin.' },
      { id: 'lights', area: 'walkaround', label: 'Lampu & lampu rotari', observation: 'Lampu depan, lampu belakang, dan lampu rotari kuning berfungsi.', defect: false, explanation: LIGHTS },
      { id: 'mirrors', area: 'walkaround', label: 'Spion & kamera', observation: 'Spion bersih dan disetel dengan benar, layar kamera jelas.', defect: false, explanation: MIRRORS },
      { id: 'horn', area: 'cab', label: 'Klakson', observation: 'Klakson berbunyi keras dan jelas.', defect: false, explanation: 'Klakson memberi tanda maksud Anda: satu kali sebelum menyalakan mesin, dua kali sebelum maju, tiga kali sebelum mundur.' },
      { id: 'brakes', area: 'cab', label: 'Uji rem service & rem parkir', observation: 'Truk tertahan oleh rem parkir saat uji gas penuh; rem service terasa mantap.', defect: false, explanation: 'Uji rem wajib lulus sebelum setiap shift. Jangan pernah mengoperasikan unit yang gagal uji rem.' },
      { id: 'seatbelt', area: 'cab', label: 'Sabuk pengaman', observation: 'Gesper terkunci dan tali tidak berserabut.', defect: false, explanation: SEATBELT },
      { id: 'extinguisher', area: 'safety', label: 'APAR', observation: 'Jarum indikator di area hijau, pin dan segel pengaman terpasang.', defect: false, explanation: EXTINGUISHER },
    ],
  },
  {
    id: 'truck-b',
    title: 'DT-12 · Shift malam',
    brief: 'Operator sebelumnya melaporkan “ada bunyi di bagian belakang”. Periksa sebelum menerima unit.',
    items: [
      { id: 'tyres', area: 'walkaround', label: 'Ban & velg', observation: 'Sobekan dalam pada dinding samping ban luar belakang kiri, benang ban terlihat.', defect: true, critical: true, explanation: 'Sobekan dinding samping dengan benang ban terlihat dapat meledak saat bermuatan. Lakukan tag out dan hubungi tim ban.' },
      { id: 'leaks', area: 'walkaround', label: 'Kebocoran cairan', observation: 'Bercak kecil oli hidraulik di bawah silinder hoist.', defect: true, explanation: 'Laporkan kebocoran kecil agar maintenance dapat memperbaikinya sebelum bertambah parah.' },
      { id: 'lights', area: 'walkaround', label: 'Lampu & lampu rotari', observation: 'Semua lampu dan lampu rotari berfungsi.', defect: false, explanation: LIGHTS },
      { id: 'mirrors', area: 'walkaround', label: 'Spion & kamera', observation: 'Spion sudah disetel; layar kamera jelas.', defect: false, explanation: MIRRORS },
      { id: 'reverse-alarm', area: 'walkaround', label: 'Alarm mundur', observation: 'Alarm berbunyi saat gigi mundur dipilih.', defect: false, explanation: 'Alarm mundur memperingatkan orang dan kendaraan di belakang truk.' },
      { id: 'horn', area: 'cab', label: 'Klakson', observation: 'Klakson berfungsi.', defect: false, explanation: HORN_SHORT },
      { id: 'seatbelt', area: 'cab', label: 'Sabuk pengaman', observation: 'Terkunci dengan benar.', defect: false, explanation: SEATBELT },
      { id: 'extinguisher', area: 'safety', label: 'APAR', observation: 'Jarum indikator di area hijau, segel utuh.', defect: false, explanation: EXTINGUISHER },
    ],
  },
  {
    id: 'truck-c',
    title: 'DT-03 · Setelah maintenance',
    brief: 'Truk baru kembali dari workshop. Lakukan P2H secara lengkap.',
    items: [
      { id: 'tyres', area: 'walkaround', label: 'Ban & velg', observation: 'Ban dalam kondisi baik, indikator mur roda sejajar.', defect: false, explanation: 'Periksa setiap roda dari sobekan, benjolan, tekanan kurang, dan mur roda yang kendur.' },
      { id: 'lights', area: 'walkaround', label: 'Lampu & lampu rotari', observation: 'Mika lampu belakang kanan retak, tetapi lampu masih menyala.', defect: true, explanation: 'Laporkan kerusakan kosmetik agar diperbaiki; lampu yang masih berfungsi dengan mika retak tidak menghentikan shift.' },
      { id: 'reverse-alarm', area: 'walkaround', label: 'Alarm mundur', observation: 'Tidak ada bunyi saat gigi mundur dipilih.', defect: true, critical: true, explanation: 'Alarm mundur yang tidak berbunyi membahayakan orang di belakang truk. Jangan dioperasikan sampai diperbaiki.' },
      { id: 'mirrors', area: 'walkaround', label: 'Spion & kamera', observation: 'Spion bersih dan sudah disetel.', defect: false, explanation: MIRRORS },
      { id: 'brakes', area: 'cab', label: 'Uji rem service & rem parkir', observation: 'Uji rem lulus.', defect: false, explanation: 'Uji rem wajib lulus sebelum setiap shift.' },
      { id: 'horn', area: 'cab', label: 'Klakson', observation: 'Klakson berfungsi.', defect: false, explanation: HORN_SHORT },
      { id: 'seatbelt', area: 'cab', label: 'Sabuk pengaman', observation: 'Tali berserabut di sepanjang satu sisi.', defect: true, critical: true, explanation: 'Sabuk pengaman yang rusak dapat gagal saat truk terguling. Truk tidak boleh dioperasikan sampai sabuk diganti.' },
      { id: 'extinguisher', area: 'safety', label: 'APAR', observation: 'Braket kosong — APAR hilang setelah maintenance.', defect: true, critical: true, explanation: 'Jangan pernah mengoperasikan unit tanpa APAR yang terisi di dalam kabin.' },
    ],
  },
];

/** Built-in pack in Bahasa Indonesia; same version as the English pack so certificates stay valid across languages. */
export const DEFAULT_CONTENT_PACK_ID: ContentPack = {
  format: CONTENT_PACK_FORMAT,
  name: 'Induksi Mining Puzzle Game',
  version: DEFAULT_CONTENT_PACK.version,
  modules: MODULES_ID,
  glossary: GLOSSARY_ID,
  prestart: PRESTART_ID,
};
