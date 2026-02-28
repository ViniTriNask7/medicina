// ==========================================================
// --- SISTEMA DE AUTENTICAÇÃO SIMPLES ---
// ==========================================================

const Auth = {
    USER_KEY: 'medicina_py_user',
    THEME_KEY: 'medicina_py_theme',
    
    isLoggedIn() {
        return localStorage.getItem(this.USER_KEY) !== null;
    },
    
    getUserName() {
        return localStorage.getItem(this.USER_KEY) || 'Usuário';
    },
    
    getUserInitials() {
        const name = this.getUserName();
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
        return name.substring(0,2).toUpperCase();
    },
    
    login(name, password) {
        const cleanName = name.trim();
        if(!cleanName) return { success:false, message:'Por favor, digite seu nome!' };
        localStorage.setItem(this.USER_KEY, cleanName);
        return { success:true };
    },
    
    logout() {
        localStorage.removeItem(this.USER_KEY);
        window.location.href = './';
    },
    
    updateUserInterface() {
        const userName = this.getUserName();
        const welcomeEl = document.getElementById('welcome-message');
        if(welcomeEl) welcomeEl.innerHTML = 'Olá, ' + userName + '! 👋';
        const profileName = document.getElementById('user-name-display');
        if(profileName) profileName.textContent = userName;
        const avatar = document.getElementById('user-avatar');
        if(avatar) avatar.textContent = this.getUserInitials();
    },
    
    protectPage() {
        if(!this.isLoggedIn()) { window.location.href='index.html'; return false; }
        return true;
    },
    
    setTheme(themeName) {
        document.body.classList.remove('theme-default','theme-white','theme-dark','theme-ucp');
        if(themeName!=='default') document.body.classList.add('theme-'+themeName);
        localStorage.setItem(this.THEME_KEY, themeName);
    }
};

// ==========================================================
// --- FUNÇÃO DE SAIR ---
// ==========================================================
function logout() {
    if(confirm('Tem certeza que deseja sair?')) Auth.logout();
}

// ==========================================================
// --- BANCO DE DADOS (CURRÍCULO) ---
// ==========================================================
const CURRICULO = {
    1:["Anatomía I","Histología I","Embriología","Biología","Historia de la Medicina","Lengua Castellana"],
    2:["Anatomía II","Histología II","Metodología","Bioestadística","Medicina Comunitaria","Psicología","Guaraní"],
    3:["Fisiología I","Bioquímica I","Biofísica","Inmunología","Genética","Microbiología I"],
    4:["Fisiología II","Microbiología II","Bioquímica II","Bioética","Nutrición","Epidemiología"],
    5:["Fisiopatología I","Farmacología I","Semiología Médica I","Anatomía Patológica I","Gestion en Salud"],
    6:["Fisiopatología II","Farmacología II","Semiología Médica II","Anatomía Patológica II","Primeros Auxilios","Imagenología"],
    7:["Oftalmología","Ortopedia","Toxicología","Dermatología","Neumología","Medicina Legal"],
    8:["Medicina Interna I","Gineco-Obstetricia I","Psiquiatría","Cirugía I"],
    9:["Medicina Interna II","Pediatría I","Cirugía II","Gineco-Obstetricia II","Urología"],
    10:["Pediatría II","Cirugía III","Medicina Interna III","Oncología","Rehabilitación"],
    11:["Medicina Interna","Pediatría","Cirurgia","Anfiteatro"],
    12:["Gineco-Obstetricia","Atención Primaria","Emergentología"]
};

const IMAGENS_SEMESTRES = {
    1:"https://images.unsplash.com/photo-1530210124550-912dc1381cb8?q=80&w=800",
    2:"https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=800",
    3:"https://images.unsplash.com/photo-1582719471384-894fbb16e074?q=80&w=800",
    4:"https://images.unsplash.com/photo-1530026405186-ed1f139313f8?q=80&w=800",
    5:"https://images.unsplash.com/photo-1559757175-0eb30cd8c063?q=80&w=800",
    6:"https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800",
    7:"https://images.unsplash.com/photo-1576671081837-49000212a370?q=80&w=800",
    8:"https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=800",
    9:"https://images.unsplash.com/photo-1551601651-2a8555f1a136?q=80&w=800",
    10:"https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?q=80&w=800",
    11:"https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800",
    12:"https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=800"
};

// ==========================================================
// --- ESTADO DO APP ---
// ==========================================================
let appData = JSON.parse(localStorage.getItem('med_v7')) || { time:0,lastDate:new Date().toLocaleDateString(),currentSem:1,currentSub:"" };
let mainTimerInterval=null, isMainTimerRunning=false, sessionSeconds=0, pomodoroInterval=null, pomodoroTime=25*60, isPomodoroRunning=false;

// ==========================================================
// --- INDEXED DB (Arquivos) ---
// ==========================================================
let db;
const request = indexedDB.open("MedicinaFilesDB",1);
request.onupgradeneeded = function(e){ db=e.target.result; db.createObjectStore("files",{keyPath:"id",autoIncrement:true}).createIndex("subject","subject",{unique:false}); };
request.onsuccess = function(e){ db=e.target.result; };

// ==========================================================
// --- INICIALIZAÇÃO ---
// ==========================================================
function init(){
    if(!Auth.protectPage()) return;
    
    if(appData.lastDate !== new Date().toLocaleDateString()){
        appData.time=0;
        appData.lastDate=new Date().toLocaleDateString();
        save();
    }
    
    const savedTheme = localStorage.getItem(Auth.THEME_KEY) || 'default';
    Auth.setTheme(savedTheme);
    Auth.updateUserInterface();
    
    renderHomeStats();
    renderSemestres();
    autoSaveNotes();
    updatePomoDisplay();
    initDropZone();
    MedCalendar.init();
}

// ==========================================================
// --- NAVEGAÇÃO E TEMAS ---
// ==========================================================
function setTheme(themeName){ Auth.setTheme(themeName); }
function switchView(viewName){
     const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar?.classList.remove('active');
    overlay?.classList.remove('active');
    document.querySelectorAll('.view-section').forEach(el=>el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el=>el.classList.remove('active'));
    const targetView=document.getElementById('view-'+viewName);
    if(targetView) targetView.classList.add('active');
    const btnMap={home:'btn-home',semestres:'btn-semestres',focus:'btn-semestres',calendario:'btn-calendario'};
    const btnId=btnMap[viewName]; if(btnId) document.getElementById(btnId).classList.add('active');
}

// ==========================================================
// --- TIMER PRINCIPAL ---
// ==========================================================
function toggleMainTimer(){
    const icon=document.querySelector('#main-timer-status-icon i');
    if(isMainTimerRunning){
        clearInterval(mainTimerInterval);
        icon.className='fa-solid fa-play';
        isMainTimerRunning=false;
    } else{
        icon.className='fa-solid fa-pause';
        isMainTimerRunning=true;
        mainTimerInterval=setInterval(()=>{
            sessionSeconds++; appData.time++;
            updateMainTimerDisplay();
            if(sessionSeconds%10===0) save();
        },1000);
    }
}

function updateMainTimerDisplay(){
    const h=Math.floor(sessionSeconds/3600), m=Math.floor((sessionSeconds%3600)/60), s=sessionSeconds%60;
    const display=document.getElementById('display-main-timer');
    if(display) display.innerText=h.toString().padStart(2,'0')+':'+m.toString().padStart(2,'0')+':'+s.toString().padStart(2,'0');
}

function stopAndGoHome(){
    clearInterval(mainTimerInterval); isMainTimerRunning=false; sessionSeconds=0;
    const icon=document.querySelector('#main-timer-status-icon i');
    if(icon) icon.className='fa-solid fa-play';
    updateMainTimerDisplay();
    save(); renderHomeStats(); switchView('home');
}

function renderHomeStats(){
    const h=Math.floor(appData.time/3600), m=Math.floor((appData.time%3600)/60);
    const statTime=document.getElementById('stat-time'), statSem=document.getElementById('stat-sem'), statSub=document.getElementById('stat-last-sub');
    if(statTime) statTime.innerText=h+'h '+m+'m';
    if(statSem) statSem.innerText=appData.currentSem+'º';
    if(statSub) statSub.innerText=appData.currentSub||'Nenhuma';
}

// ==========================================================
// --- POMODORO ---
// ==========================================================
function togglePomodoro(){
    const icon=document.getElementById('pomo-icon');
    if(isPomodoroRunning){
        clearInterval(pomodoroInterval); icon.className='fa-solid fa-play';
    } else{
        icon.className='fa-solid fa-pause';
        pomodoroInterval=setInterval(()=>{
            if(pomodoroTime>0){ pomodoroTime--; appData.time++; sessionSeconds++; updatePomoDisplay(); updateMainTimerDisplay(); renderHomeStats(); }
            else{ clearInterval(pomodoroInterval); alert("Pomodoro Finalizado!"); resetPomodoro(); }
        },1000);
    }
    isPomodoroRunning=!isPomodoroRunning;
}

function updatePomoDisplay(){
    const m=Math.floor(pomodoroTime/60), s=pomodoroTime%60;
    const pDisplay=document.getElementById('pomo-timer'); if(pDisplay) pDisplay.innerText=m+':'+s.toString().padStart(2,'0');
}

function resetPomodoro(){ clearInterval(pomodoroInterval); isPomodoroRunning=false; pomodoroTime=25*60; updatePomoDisplay(); const icon=document.getElementById('pomo-icon'); if(icon) icon.className='fa-solid fa-play'; }

// ==========================================================
// --- SEMESTRES E FOCO ---
// ==========================================================
function renderSemestres(){
    const container=document.getElementById('container-semestres'); if(!container) return;
    container.innerHTML='';
    for(let i=1;i<=12;i++){  // use 'let' para capturar o i correto
        const card=document.createElement('div');
        card.className='sem-card';
        card.style.backgroundImage='url("'+IMAGENS_SEMESTRES[i]+'")';
        card.onclick=()=>enterFocusMode(i);
        card.innerHTML='<div class="overlay"><h3>'+i+'º Semestre</h3><p>'+CURRICULO[i].length+' Matérias</p></div>';
        container.appendChild(card);
    }
}

function enterFocusMode(semNum){
    appData.currentSem=semNum; save();
    switchView('focus');
    const listContainer=document.getElementById('focus-subjects-list');
    listContainer.innerHTML='';
    CURRICULO[semNum].forEach(materia=>{
        const item=document.createElement('div');
        item.className='subject-item '+(appData.currentSub===materia?'active':'');
        item.innerHTML='<i class="fa-solid fa-book-medical"></i> '+materia;
        item.onclick=()=>loadSubjectInFocus(materia);
        listContainer.appendChild(item);
    });
    if(appData.currentSub && CURRICULO[semNum].includes(appData.currentSub)) loadSubjectInFocus(appData.currentSub);
    else loadSubjectInFocus(CURRICULO[semNum][0]);
}

function loadSubjectInFocus(materia){
    appData.currentSub=materia; save(); renderHomeStats();
    document.getElementById('focus-active-subject').innerText=materia;
    document.querySelectorAll('.subject-item').forEach(el=>el.classList.toggle('active', el.innerText.includes(materia)));
    document.getElementById('note-editor').value=localStorage.getItem('notes_'+materia)||"";
    const savedVideo=localStorage.getItem('video_'+materia);
    const vContainer=document.getElementById('video-container');
    if(savedVideo) vContainer.innerHTML='<iframe src="'+savedVideo+'" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>';
    else vContainer.innerHTML='<div class="video-placeholder"><i class="fa-brands fa-youtube"></i><p>Cole um link acima para carregar a vídeo aula desta matéria</p></div>';
    renderTasks(); renderFiles();
}

// ==========================================================
// --- VÍDEO YOUTUBE ---
// ==========================================================
function loadYouTubeVideo(){
    const input=document.getElementById('youtube-url'); if(!input) return;
    const url=input.value.trim(); if(!url) return;
    const videoId=extractVideoId(url);
    if(videoId){
        const embedUrl='https://www.youtube.com/embed/'+videoId;
        document.getElementById('video-container').innerHTML='<iframe src="'+embedUrl+'" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>';
        if(appData.currentSub) localStorage.setItem('video_'+appData.currentSub, embedUrl);
        input.value='';
    } else alert("Link do YouTube inválido!");
}

// 1. Extrai o ID do vídeo
function extractVideoId(url){
    const regExp=/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match=url.match(regExp);
    return match && match[2].length===11 ? match[2] : null;
}

// 2. Adiciona à lista
function addYouTubeVideo() {
    const input = document.getElementById('youtube-url');
    const videoId = extractVideoId(input.value.trim());

    if (videoId && appData.currentSub) {
        const key = 'videos_' + appData.currentSub;
        let videos = JSON.parse(localStorage.getItem(key)) || [];
        if (!videos.includes(videoId)) {
            videos.push(videoId);
            localStorage.setItem(key, JSON.stringify(videos));
            input.value = '';
            renderVideosList();
        }
    } else {
        alert("Link inválido ou matéria não selecionada!");
    }
}

// 3. Remove um vídeo específico
function removeVideo(id) {
    const key = 'videos_' + appData.currentSub;
    let videos = JSON.parse(localStorage.getItem(key)) || [];
    videos = videos.filter(v => v !== id);
    localStorage.setItem(key, JSON.stringify(videos));
    renderVideosList();
}

// 4. Mostra os vídeos na tela
function renderVideosList() {
    const grid = document.getElementById('video-grid');
    const placeholder = document.getElementById('video-placeholder-empty');
    const videos = JSON.parse(localStorage.getItem('videos_' + appData.currentSub)) || [];

    grid.innerHTML = '';
    placeholder.style.display = videos.length ? 'none' : 'block';

    videos.forEach(id => {
        grid.innerHTML += `
            <div style="position:relative; background:#000; border-radius:10px; overflow:hidden;">
                <button onclick="removeVideo('${id}')" style="position:absolute; right:5px; top:5px; z-index:10; background:red; color:white; border:none; border-radius:5px; cursor:pointer;">X</button>
                <div style="padding-bottom:56.25%; position:relative;">
                    <iframe src="https://www.youtube.com/embed/${id}" style="position:absolute; top:0; left:0; width:100%; height:100%;" allowfullscreen></iframe>
                </div>
            </div>`;
    });
}

// ==========================================================
// --- ANOTAÇÕES ---
// ==========================================================
function autoSaveNotes(){
    const area=document.getElementById('note-editor'); if(!area) return;
    area.addEventListener('input',()=>{ if(appData.currentSub) localStorage.setItem('notes_'+appData.currentSub, area.value); });
}

// ==========================================================
// --- TAREFAS ---
// ==========================================================
function addTask(){
    const input=document.getElementById('task-input'); if(!input.value.trim() || !appData.currentSub) return;
    const key='tasks_'+appData.currentSub;
    const tasks=JSON.parse(localStorage.getItem(key))||[];
    tasks.push({text:input.value,done:false});
    localStorage.setItem(key, JSON.stringify(tasks));
    input.value=''; renderTasks();
}

function renderTasks(){
    const list=document.getElementById('tasks-list'); if(!list) return;
    list.innerHTML='';
    const tasks=JSON.parse(localStorage.getItem('tasks_'+appData.currentSub))||[];
    tasks.forEach((task,index)=>{
        const item=document.createElement('div');
        item.className='task-item';
        item.innerHTML='<div class="task-check '+(task.done?'checked':'')+'" onclick="toggleTask('+index+')">'+(task.done?'<i class="fa-solid fa-check" style="font-size:0.7rem;color:#000"></i>':'')+'</div>'+
                       '<span class="task-text '+(task.done?'done':'')+'">'+task.text+'</span>'+
                       '<i class="fa-solid fa-trash task-delete" onclick="deleteTask('+index+')"></i>';
        list.appendChild(item);
    });
}

function toggleTask(index){
    const key='tasks_'+appData.currentSub;
    const tasks=JSON.parse(localStorage.getItem(key));
    tasks[index].done=!tasks[index].done;
    localStorage.setItem(key,JSON.stringify(tasks));
    renderTasks();
}

function deleteTask(index){
    const key='tasks_'+appData.currentSub;
    const tasks=JSON.parse(localStorage.getItem(key));
    tasks.splice(index,1);
    localStorage.setItem(key,JSON.stringify(tasks));
    renderTasks();
}

// ==========================================================
// --- ARQUIVOS (INDEXED DB) ---
// ==========================================================
function initDropZone(){
    const zone=document.getElementById('drop-zone'); const input=document.getElementById('file-input');
    if(!zone || !input) return;
    zone.onclick=()=>input.click();
    input.onchange=e=>handleFiles(e.target.files);
    zone.ondragover=e=>{ e.preventDefault(); zone.classList.add('dragover'); };
    zone.ondragleave=()=>zone.classList.remove('dragover');
    zone.ondrop=e=>{ e.preventDefault(); zone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); };
}

function handleFiles(files){
    if(!appData.currentSub) return alert("Selecione uma matéria primeiro!");
    Array.from(files).forEach(file=>{
        const transaction=db.transaction(["files"],"readwrite");
        transaction.objectStore("files").add({subject:appData.currentSub,name:file.name,size:file.size,type:file.type,data:file});
        transaction.oncomplete=()=>renderFiles();
    });
}

function renderFiles(){
    const list=document.getElementById('file-list'); if(!list||!db) return;
    list.innerHTML='';
    const transaction=db.transaction(["files"],"readonly");
    const index=transaction.objectStore("files").index("subject");
    index.openCursor(IDBKeyRange.only(appData.currentSub)).onsuccess=e=>{
        const cursor=e.target.result;
        if(cursor){
            const file=cursor.value;
            const item=document.createElement('div');
            item.className='file-item';
            item.innerHTML='<i class="fa-solid fa-file-pdf" style="font-size:1.5rem;color:var(--primary)"></i>'+
                           '<div class="file-info"><p>'+file.name+'</p><span>'+(file.size/(1024*1024)).toFixed(2)+' MB</span></div>'+
                           '<div class="file-actions"><button class="file-btn" onclick="downloadFile('+file.id+')"><i class="fa-solid fa-download"></i></button>'+
                           '<button class="file-btn delete" onclick="deleteFile('+file.id+')"><i class="fa-solid fa-trash"></i></button></div>';
            list.appendChild(item);
            cursor.continue();
        }
    };
}

function downloadFile(id){
    const transaction=db.transaction(["files"],"readonly");
    transaction.objectStore("files").get(id).onsuccess=e=>{
        const file=e.target.result;
        const url=URL.createObjectURL(file.data);
        const a=document.createElement('a'); a.href=url; a.download=file.name; a.click();
    };
}

function deleteFile(id){
    if(!confirm("Excluir este arquivo?")) return;
    const transaction=db.transaction(["files"],"readwrite");
    transaction.objectStore("files").delete(id);
    transaction.oncomplete=()=>renderFiles();
}

// ==========================================================
// --- NAVEGAÇÃO DE TABS ---
// ==========================================================
function switchTab(tabName){
    document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    const tab=document.getElementById('tab-'+tabName); if(tab) tab.classList.add('active');
    if(event) event.currentTarget.classList.add('active');
}

function resumeStudy(){ if(appData.currentSub) enterFocusMode(appData.currentSem); else switchView('semestres'); }
function save(){ localStorage.setItem('med_v7',JSON.stringify(appData)); }

// ==========================================================
// --- MED CALENDAR (AGENDA) ---
// ==========================================================
var MedCalendar = {
    storageKey:'med_agenda_v1',
    init(){
        this.popularSelectMaterias(); this.renderizarAgenda(); this.atualizarHome();
        const inputData=document.getElementById('cal-data'); if(inputData) inputData.value=new Date().toISOString().split('T')[0];
    },
    getEventos(){ return JSON.parse(localStorage.getItem(this.storageKey))||[]; },
    popularSelectMaterias(){
        const select=document.getElementById('cal-materia'); if(!select) return;
        let todasMaterias=[];
        Object.values(CURRICULO).forEach(lista=>todasMaterias=todasMaterias.concat(lista));
        const materiasUnicas=[...new Set(todasMaterias)].sort();
        select.innerHTML=materiasUnicas.map(m=>'<option value="'+m+'">'+m+'</option>').join('');
    },
    adicionarEvento(){
        const materia=document.getElementById('cal-materia').value;
        const data=document.getElementById('cal-data').value;
        const horas=document.getElementById('cal-horas').value;
        const tipo=document.getElementById('cal-tipo').value;
        if(!data || !horas){ alert("Preencha a data e a duração!"); return; }
        const novoEvento={id:Date.now(),materia,data,horas,tipo};
        const eventos=this.getEventos(); eventos.push(novoEvento);
        eventos.sort((a,b)=>new Date(a.data)-new Date(b.data));
        localStorage.setItem(this.storageKey,JSON.stringify(eventos));
        document.getElementById('form-agenda-box').style.display='none';
        this.renderizarAgenda(); this.atualizarHome();
    },
    removerEvento(id){
        const eventos=this.getEventos().filter(e=>e.id!==id);
        localStorage.setItem(this.storageKey,JSON.stringify(eventos));
        this.renderizarAgenda(); this.atualizarHome();
    },
    formatarDataBR(dataStr){
        const partes=dataStr.split('-'); return partes[2]+'/'+partes[1]+'/'+partes[0];
    },
    atualizarHome(){
        const hojeStr=new Date().toISOString().split('T')[0];
        const amanhaObj=new Date(); amanhaObj.setDate(amanhaObj.getDate()+1); const amanhaStr=amanhaObj.toISOString().split('T')[0];
        const eventos=this.getEventos();
        const hojeEventos=eventos.filter(e=>e.data===hojeStr);
        const amanhaEventos=eventos.filter(e=>e.data===amanhaStr);
        const divHoje=document.getElementById('aula-hoje');
        const divAmanha=document.getElementById('aula-amanha');
        if(divHoje){
            if(hojeEventos.length>0) divHoje.innerHTML=hojeEventos.map(e=>'<div style="margin-bottom:5px;border-left:3px solid var(--primary);padding-left:10px;"><b>'+e.materia+'</b><br><small>'+e.tipo+' • '+e.horas+'h</small></div>').join('');
            else divHoje.innerHTML='<span style="color: var(--text-muted); font-style: italic;">Nenhuma aula agendada para hoje.</span>';
        }
        if(divAmanha){
            if(amanhaEventos.length>0) divAmanha.innerHTML='<b>Amanhã:</b> '+amanhaEventos[0].materia+' ('+amanhaEventos[0].horas+'h)';
            else divAmanha.innerHTML='<b>Amanhã:</b> Livre';
        }
    },
    renderizarAgenda(){
        const container=document.getElementById('calendario-grid'); if(!container) return;
        const eventos=this.getEventos(); if(eventos.length===0){ container.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fa-solid fa-calendar-xmark" style="font-size:3rem;opacity:0.2;margin-bottom:15px;"></i><p>Sua agenda está vazia. Adicione aulas para começar!</p></div>'; return; }
        const grupos=eventos.reduce((acc,obj)=>{ const data=obj.data; if(!acc[data]) acc[data]=[]; acc[data].push(obj); return acc; },{});
        container.innerHTML=Object.keys(grupos).map(data=>'<div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden;"><div style="background:var(--bg-main);padding:10px 15px;border-bottom:1px solid var(--border);font-weight:bold;color:var(--primary);display:flex;align-items:center;gap:10px;"><i class="fa-regular fa-calendar-check"></i> '+this.formatarDataBR(data)+'</div><div style="padding:10px 15px;">'+grupos[data].map(e=>'<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.03);"><div><strong style="color:var(--text-main);">'+e.materia+'</strong><div style="font-size:0.8rem;color:var(--text-muted);">'+e.tipo+' • '+e.horas+' horas</div></div><button onclick="MedCalendar.removerEvento('+e.id+')" style="background:none;border:none;color:#ef4444;cursor:pointer;padding:5px;"><i class="fa-solid fa-trash-can"></i></button></div>').join('')+'</div></div>').join('');
    }
};

// ==========================================================
// --- INICIALIZAÇÃO AUTOMÁTICA ---
// ==========================================================
document.addEventListener('DOMContentLoaded',()=>{ init(); });
const avatarContainer = document.getElementById("avatar-container");
const imageUpload = document.getElementById("imageUpload");
const profileImage = document.getElementById("profileImage");

// Abrir seletor ao clicar na imagem
avatarContainer.addEventListener("click", () => {
    imageUpload.click();
});

// Quando escolher imagem
imageUpload.addEventListener("change", function () {
    const file = this.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function () {
            const imageData = reader.result;
            profileImage.src = imageData;

            // Salvar no navegador
            localStorage.setItem("profileImage", imageData);
        };

        reader.readAsDataURL(file);
    }
});

// Carregar imagem salva ao abrir página
window.addEventListener("load", () => {
    const savedImage = localStorage.getItem("profileImage");
    if (savedImage) {
        profileImage.src = savedImage;
    }
});
// Carregar imagem salva ao abrir página
window.addEventListener("load", () => {
    const savedImage = localStorage.getItem("profileImage");
    if (savedImage) {
        profileImage.src = savedImage;
    }
});
// ==========================================================
// --- SIDEBAR MOBILE ---
// ==========================================================
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar?.classList.toggle('active');
    
    // O overlay fecha junto
    if (overlay) {
        overlay.classList.toggle('active');
    }
}
// isso faz a ponte entre o HTML e o sistema de temas
window.setTheme = function(themeName) {
    Auth.setTheme(themeName);
};
    function setThemePreview(themeName) {
        // Remove todas as classes de tema existentes
        document.body.classList.remove('theme-default', 'theme-white', 'theme-dark', 'theme-ucp');
        
        // Adiciona a nova classe de tema (se não for 'default')
        if (themeName !== 'default') {
            document.body.classList.add('theme-' + themeName);
        }
        
        // Salva a escolha
        localStorage.setItem(THEME_KEY, themeName);
    }
    
