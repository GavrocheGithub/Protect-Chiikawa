// Resource variables
let charImages = [];
let hpImages = []; 
let sounds = []; 
let bgImg, umbrellaImg, startImg, restartImg, nextImg; 

// Global state variables
const STATE_START = 0;
const STATE_PLAY = 1;
const STATE_FAIL = 2;
const STATE_WIN = 3;
const STATE_NEXT_LEVEL = 4; 
let gameState = STATE_START;

let currentLevel = 0; 
let lives = 3;        
const SURVIVE_TIME = 10000; 

let levelStartTime = 0; 
let lastHitTime = 0;    

// Scene and characters
let charX, charY;
let charW = 140; 
let charH = 150; 

// Umbrella width
let umbW = 250;  

let charSpeed = 3; 
let charDir = 1;   

// Drops and ripples
let drops = [];
let ripples = [];

function preload() {
  let handleError = function(err) { console.log("Missing File:", err); };

  bgImg = loadImage('materials/bg.jpeg', () => {}, handleError);
  startImg = loadImage('materials/start.png', () => {}, handleError);
  restartImg = loadImage('materials/restart.png', () => {}, handleError);
  nextImg = loadImage('materials/next.png', () => {}, handleError); 
  umbrellaImg = loadImage('materials/umbrella.png', () => {}, handleError);

  hpImages[0] = loadImage('materials/HP1.png', () => {}, handleError);
  hpImages[1] = loadImage('materials/HP2.png', () => {}, handleError);
  hpImages[2] = loadImage('materials/HP3.png', () => {}, handleError);

  sounds[0] = loadSound('materials/hachiware.mp3', () => {}, handleError);
  sounds[1] = loadSound('materials/chiikawa.mp3', () => {}, handleError);
  sounds[2] = loadSound('materials/usagi.mp3', () => {}, handleError);

  charImages[0] = {
    dry: loadImage('materials/1-1.png', () => {}, handleError),
    wet: loadImage('materials/1-2.png', () => {}, handleError)
  };
  charImages[1] = {
    dry: loadImage('materials/2-1.png', () => {}, handleError),
    wet: loadImage('materials/2-2.png', () => {}, handleError)
  };
  charImages[2] = {
    dry: loadImage('materials/3-1.png', () => {}, handleError),
    wet: loadImage('materials/3-2.png', () => {}, handleError)
  };
}

// Aspect ratio 4:3 calculation
function calculateCanvasSize() {
  let targetRatio = 4 / 3;
  let currentRatio = windowWidth / windowHeight;
  let w, h;

  if (currentRatio > targetRatio) {
    h = windowHeight;
    w = h * targetRatio;
  } else {
    w = windowWidth;
    h = w / targetRatio;
  }
  return { w: w, h: h };
}

function setup() {
  let size = calculateCanvasSize();
  createCanvas(size.w, size.h);
  charY = height - 150;
  
  for (let i = 0; i < 200; i++) {
    drops.push(new Drop());
  }
}

function windowResized() {
  let size = calculateCanvasSize();
  resizeCanvas(size.w, size.h);
  charY = height - 150; 
  if (charX > width - charW/2) {
    charX = width - charW/2;
  }
}

function draw() {
  if (bgImg && bgImg.width > 1) {
    imageMode(CENTER);
    image(bgImg, width/2, height/2, width, height);
  } else {
    background(240);
  }
  
  let currentUmbX = mouseX;
  let currentUmbY = (gameState === STATE_PLAY) ? constrain(mouseY, 0, height * 3 / 5) : mouseY;

  if (gameState === STATE_START) {
    cursor(); 
    drawStartScreen();
  } else if (gameState === STATE_PLAY) {
    noCursor(); 
    playGameLogic(currentUmbX, currentUmbY);
  } else if (gameState === STATE_NEXT_LEVEL) {
    cursor(); 
    drawNextLevelScreen(); 
  } else if (gameState === STATE_WIN) {
    cursor(); 
    drawWinScreen();
  } else if (gameState === STATE_FAIL) {
    cursor(); 
    drawCharacter(true, false); 
    
    for (let i = drops.length - 1; i >= 0; i--) {
      drops[i].fall(-1000, -1000); 
      drops[i].show();
    }
    
    drawFailScreen();
  }

  if (gameState === STATE_PLAY) {
    drawUmbrella(currentUmbX, currentUmbY);
  }
}

// ================== Core Game Logic ==================

function playGameLogic(umbX, umbY) {
  charX += charSpeed * charDir;
  if (charX < charW/2) charDir = 1;
  if (charX > width - charW/2) charDir = -1;
  if (random(1) < 0.015) charDir *= -1;

  let isInvincible = (millis() - lastHitTime) < 1000; 

  let isXCovered = (charX > umbX - umbW/2 + 20) && (charX < umbX + umbW/2 - 20);
  let isYCovered = (umbY < charY); 
  let isWet = !(isXCovered && isYCovered);
  
  if (isWet && !isInvincible) {
    lives--; 
    if (lives <= 0) {
      gameState = STATE_FAIL; 
    } else {
      lastHitTime = millis(); 
    }
  }

  let levelTimeElapsed = millis() - levelStartTime;
  let timeLeft = Math.max(0, (SURVIVE_TIME - levelTimeElapsed) / 1000);
  
  if (timeLeft <= 0) {
    if (currentLevel >= 2) {
      gameState = STATE_WIN; 
    } else {
      gameState = STATE_NEXT_LEVEL; 
    }
  }

  drawCharacter(isWet, isInvincible);
  
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].update();
    ripples[i].show();
    if (ripples[i].alpha <= 0) ripples.splice(i, 1);
  }

  for (let i = drops.length - 1; i >= 0; i--) {
    drops[i].fall(umbX, umbY);
    drops[i].show();
  }

  drawUI(timeLeft);
}

// ================== Level Control ==================

function startGame() {
  currentLevel = 0;
  resetLevel(true); 
  gameState = STATE_PLAY;
}

function levelUp() {
  currentLevel++;
  resetLevel(false); 
  gameState = STATE_PLAY;
}

function resetLevel(isNewGame) {
  lives = 3; 
  charX = width / 2; 
  
  levelStartTime = millis(); 
  lastHitTime = millis(); 
  
  charSpeed = 3; 

  for (let s of sounds) {
    if (s && s.isLoaded() && s.isPlaying()) s.stop();
  }
  if (sounds[currentLevel] && sounds[currentLevel].isLoaded()) {
    sounds[currentLevel].play();
  }
}

// ================== Mouse Interactions ==================

function mousePressed() {
  if (gameState === STATE_START) {
    if (dist(mouseX, mouseY, width/2, height/2) < 80) startGame();
  } 
  else if (gameState === STATE_FAIL) {
    let btnX = width - 100;
    let btnY = height - 100;
    if (dist(mouseX, mouseY, btnX, btnY) < 60) {
      gameState = STATE_START; 
    }
  }
  else if (gameState === STATE_WIN) {
    let btnX = width - 100;
    let btnY = height - 100;
    if (dist(mouseX, mouseY, btnX, btnY) < 60) {
      gameState = STATE_START; 
    }
  }
  else if (gameState === STATE_NEXT_LEVEL) {
    if (dist(mouseX, mouseY, width/2, height/2 + 50) < 80) {
      levelUp();
    }
  }
}

// ================== UI Drawing ==================

function drawStartScreen() {
  if (startImg && startImg.width > 1) {
    image(startImg, width/2, height/2, 160, 160);
  } else {
    fill(100, 200, 100);
    ellipse(width/2, height/2, 160, 160);
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("START", width/2, height/2);
  }
}

function drawFailScreen() {
  fill(255, 50, 50);
  textSize(80);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text("Failed", width/2, height/2);
  textStyle(NORMAL);

  let btnX = width - 100;
  let btnY = height - 100;
  if (restartImg && restartImg.width > 1) {
    image(restartImg, btnX, btnY, 100, 100);
  } else {
    fill(200, 100, 100);
    ellipse(btnX, btnY, 100, 100);
    fill(255);
    textSize(20);
    text("Restart", btnX, btnY);
  }
}

function drawNextLevelScreen() {
  fill(50, 200, 50);
  textSize(60);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text("Level Passed!", width/2, height/2 - 100);
  textStyle(NORMAL);

  let dynamicNextImg = hpImages[currentLevel + 1];

  if (dynamicNextImg && dynamicNextImg.width > 1) {
    image(dynamicNextImg, width/2, height/2 + 50, 160, 160);
  } else {
    fill(100, 100, 255);
    ellipse(width/2, height/2 + 50, 160, 160);
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("NEXT", width/2, height/2 + 50);
  }
}

function drawWinScreen() {
  fill(255, 215, 0); 
  textSize(80);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text("You Success!", width/2, height/2 - 50);
  textStyle(NORMAL);

  let startX = width / 2 - 120; 
  let imgY = height / 2 + 80;   
  let iconSize = 100;           

  for (let i = 0; i < 3; i++) {
    let hpImg = hpImages[i];
    let px = startX + i * 120; 

    if (hpImg && hpImg.width > 1) {
      imageMode(CENTER);
      image(hpImg, px, imgY, iconSize, iconSize);
    } else {
      fill(255, 150, 150);
      ellipse(px, imgY, iconSize, iconSize);
      fill(255);
      textSize(20);
      text("HP" + (i + 1), px, imgY);
    }
  }

  let btnX = width - 100;
  let btnY = height - 100;
  if (restartImg && restartImg.width > 1) {
    image(restartImg, btnX, btnY, 100, 100);
  } else {
    fill(200, 100, 100);
    ellipse(btnX, btnY, 100, 100);
    fill(255);
    textSize(20);
    text("Restart", btnX, btnY);
  }
}

function drawUI(timeLeft) {
  for (let i = 0; i < lives; i++) {
    let hpImg = hpImages[currentLevel];
    let iconX = 50 + i * 70;
    let iconY = 50;
    if (hpImg && hpImg.width > 1) {
      image(hpImg, iconX, iconY, 60, 60);
    } else {
      fill(255, 100, 100);
      ellipse(iconX, iconY, 50, 50);
      fill(255);
      textSize(16);
      text("HP", iconX, iconY);
    }
  }

  fill(50, 150, 255);
  textSize(40);
  textAlign(CENTER, CENTER);
  text(timeLeft.toFixed(1) + " s", width/2, 50);
}

// ================== Object Drawing ==================

function drawCharacter(isWet, isInvincible) {
  let currentImages = charImages[currentLevel];
  let imgToDraw = isWet ? currentImages.wet : currentImages.dry;
  
  imageMode(CENTER);
  
  if (isInvincible && frameCount % 20 < 10) {
    tint(255, 100); 
  } else {
    noTint(); 
  }

  if (imgToDraw && imgToDraw.width > 1) {
    image(imgToDraw, charX, charY, charW, charH);
  } else {
    fill(isWet ? color(100, 150, 255, 150) : color(255, 200, 100, 150));
    rectMode(CENTER);
    rect(charX, charY, charW, charH, 20);
  }
  
  noTint(); 
}

function drawUmbrella(x, y) {
  imageMode(CENTER);
  if (umbrellaImg && umbrellaImg.width > 1) {
    let aspect = umbrellaImg.height / umbrellaImg.width;
    image(umbrellaImg, x, y, umbW, umbW * aspect);
  } else {
    fill(255, 200); 
    stroke(200);
    ellipse(x, y, umbW, umbW); 
  }
}

class Drop {
  constructor() { this.reset(true); }
  reset(randomY = false) {
    this.x = random(width);
    this.y = randomY ? random(-800, 0) : random(-100, -50);
    this.z = random(0, 20); 
    this.len = map(this.z, 0, 20, 10, 20);
    this.yspeed = map(this.z, 0, 20, 5, 15);
  }
  fall(umbX, umbY) {
    this.y += this.yspeed;
    let topOfUmbrella = umbY - umbW/2;
    let bottomOfUmbrella = umbY + umbW/2;
    let leftOfUmbrella = umbX - umbW/2;
    let rightOfUmbrella = umbX + umbW/2;

    if (this.y > topOfUmbrella && this.y < bottomOfUmbrella) {
      if (this.x > leftOfUmbrella && this.x < rightOfUmbrella) this.reset(); 
    }

    let groundLevel = charY + charH / 2;
    if (this.y > groundLevel) {
      ripples.push(new Ripple(this.x, groundLevel));
      this.reset(); 
    }
  }
  show() {
    let thick = map(this.z, 0, 20, 1, 3);
    strokeWeight(thick);
    stroke(138, 180, 248, 150); 
    line(this.x, this.y, this.x, this.y + this.len);
  }
}

class Ripple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 1;      
    this.h = 0.3;    
    this.alpha = 200;
  }
  update() {
    this.w += 3;
    this.h += 1;
    this.alpha -= 10; 
  }
  show() {
    noFill();
    strokeWeight(1);
    stroke(138, 180, 248, this.alpha);
    ellipse(this.x, this.y, this.w, this.h);
  }
}