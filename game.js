const COLS = 10, ROWS = 20, SIZE = 30;
const COLORS = { I:'#39e7dc', J:'#557dff', L:'#ff9f43', O:'#ffd65a', S:'#54e383', T:'#b968ff', Z:'#ff4f79' };
const SHAPES = {
  I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], J:[[1,0,0],[1,1,1],[0,0,0]],
  L:[[0,0,1],[1,1,1],[0,0,0]], O:[[1,1],[1,1]], S:[[0,1,1],[1,1,0],[0,0,0]],
  T:[[0,1,0],[1,1,1],[0,0,0]], Z:[[1,1,0],[0,1,1],[0,0,0]]
};
const boardCanvas=document.querySelector('#board'), ctx=boardCanvas.getContext('2d');
const holdCtx=document.querySelector('#hold').getContext('2d'), nextCtx=document.querySelector('#next').getContext('2d');
let board, piece, queue, held, canHold, score, lines, level, running=false, paused=false, lastTime=0, dropCounter=0, soundOn=true;

function emptyBoard(){ return Array.from({length:ROWS},()=>Array(COLS).fill('')); }
function bag(){ return Object.keys(SHAPES).sort(()=>Math.random()-.5); }
function refill(){ while(queue.length<5) queue.push(...bag()); }
function makePiece(type=queue.shift()){ refill(); return {type, matrix:SHAPES[type].map(r=>[...r]), x:Math.floor((COLS-SHAPES[type][0].length)/2), y:-1}; }
function collision(test=piece){ return test.matrix.some((row,y)=>row.some((v,x)=>v&&(test.x+x<0||test.x+x>=COLS||test.y+y>=ROWS||(test.y+y>=0&&board[test.y+y][test.x+x])))); }
function tone(freq=300,duration=.04){ if(!soundOn) return; const ac=tone.ac||(tone.ac=new AudioContext()); const osc=ac.createOscillator(), gain=ac.createGain(); osc.connect(gain); gain.connect(ac.destination); osc.frequency.value=freq; osc.type='square'; gain.gain.setValueAtTime(.035,ac.currentTime); gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration); osc.start(); osc.stop(ac.currentTime+duration); }
function move(dx,dy){ if(!running||paused)return; const test={...piece,x:piece.x+dx,y:piece.y+dy}; if(!collision(test)){piece=test;if(dy)dropCounter=0;return true} if(dy){lock();} return false; }
function rotate(){ if(!running||paused)return; const matrix=piece.matrix[0].map((_,i)=>piece.matrix.map(row=>row[i]).reverse()); for(const kick of [0,-1,1,-2,2]){const test={...piece,matrix,x:piece.x+kick};if(!collision(test)){piece=test;tone(420);return;}} }
function hardDrop(){ if(!running||paused)return; let distance=0; while(move(0,1)){distance++;} score+=distance*2; updateStats(); tone(180,.07); }
function lock(){ piece.matrix.forEach((row,y)=>row.forEach((v,x)=>{if(v&&piece.y+y>=0)board[piece.y+y][piece.x+x]=piece.type;})); clearLines(); piece=makePiece(); canHold=true; if(collision())gameOver(); drawSide(); }
function clearLines(){ let cleared=0; for(let y=ROWS-1;y>=0;y--){if(board[y].every(Boolean)){board.splice(y,1);board.unshift(Array(COLS).fill(''));cleared++;y++;}} if(cleared){lines+=cleared;score+=[0,100,300,500,800][cleared]*level;level=Math.floor(lines/10)+1;tone(680,.13);updateStats();} }
function hold(){ if(!running||paused||!canHold)return; const old=held;held=piece.type;piece=old?makePiece(old):makePiece();canHold=false;tone(520);drawSide(); }
function gameOver(){running=false;document.querySelector('#overlayKicker').textContent='NICE TRY!';document.querySelector('#overlayTitle').textContent='GAME OVER';document.querySelector('#startButton').innerHTML='PLAY AGAIN <span>↗</span>';document.querySelector('#overlay').classList.remove('hidden');tone(90,.3);}
function start(){board=emptyBoard();queue=[];refill();held=null;piece=makePiece();canHold=true;score=lines=0;level=1;running=true;paused=false;lastTime=performance.now();updateStats();drawSide();document.querySelector('#overlay').classList.add('hidden');requestAnimationFrame(loop);tone(480,.08);}
function updateStats(){document.querySelector('#score').textContent=String(score).padStart(6,'0');document.querySelector('#level').textContent=String(level).padStart(2,'0');document.querySelector('#lines').textContent=String(lines).padStart(2,'0');}
function cell(c,x,y,size=SIZE){const color=COLORS[c];ctxCell(c,x,y,size,color);}
function ctxCell(c,x,y,size,color,context=ctx){context.fillStyle=color;context.shadowColor=color;context.shadowBlur=7;context.fillRect(x*size+1,y*size+1,size-2,size-2);context.shadowBlur=0;context.fillStyle='rgba(255,255,255,.22)';context.fillRect(x*size+3,y*size+3,size-6,2);context.strokeStyle='rgba(0,0,0,.18)';context.strokeRect(x*size+1.5,y*size+1.5,size-3,size-3);}
function draw(){ctx.clearRect(0,0,300,600);ctx.strokeStyle='rgba(111,128,198,.07)';for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*SIZE,0);ctx.lineTo(x*SIZE,600);ctx.stroke()}for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*SIZE);ctx.lineTo(300,y*SIZE);ctx.stroke()}board.forEach((r,y)=>r.forEach((v,x)=>v&&cell(v,x,y)));if(piece){let ghost={...piece};while(!collision({...ghost,y:ghost.y+1}))ghost.y++;ghost.matrix.forEach((r,y)=>r.forEach((v,x)=>{if(v&&ghost.y+y>=0){ctx.globalAlpha=.15;cell(piece.type,ghost.x+x,ghost.y+y);ctx.globalAlpha=1;}}));piece.matrix.forEach((r,y)=>r.forEach((v,x)=>v&&piece.y+y>=0&&cell(piece.type,piece.x+x,piece.y+y)));}}
function preview(context,type,slot=0){if(!type)return;const m=SHAPES[type],s=22,ox=(120-m[0].length*s)/2/s,oy=(slot*92+45-m.length*s/2)/s;m.forEach((r,y)=>r.forEach((v,x)=>v&&ctxCell(type,ox+x,oy+y,s,COLORS[type],context)));}
function drawSide(){holdCtx.clearRect(0,0,120,96);nextCtx.clearRect(0,0,120,300);preview(holdCtx,held);queue.slice(0,3).forEach((t,i)=>preview(nextCtx,t,i));}
function loop(time){if(!running)return;const delta=time-lastTime;lastTime=time;if(!paused){dropCounter+=delta;if(dropCounter>Math.max(100,800-(level-1)*65)){move(0,1);dropCounter=0;}draw();}requestAnimationFrame(loop);}
document.querySelector('#startButton').addEventListener('click',start);
document.querySelector('#soundButton').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.setAttribute('aria-pressed',soundOn);e.currentTarget.querySelector('.sound-label').textContent=soundOn?'SOUND ON':'SOUND OFF';e.currentTarget.querySelector('.sound-icon').textContent=soundOn?'♪':'×';});
const actions={left:()=>move(-1,0),right:()=>move(1,0),down:()=>move(0,1),rotate,drop:hardDrop,hold};
document.addEventListener('keydown',e=>{const map={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'rotate',' ':'drop',c:'hold',C:'hold'};if(map[e.key]){e.preventDefault();actions[map[e.key]]();}});
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('pointerdown',()=>actions[b.dataset.action]()));
board=emptyBoard();queue=[];refill();piece=makePiece();draw();drawSide();
