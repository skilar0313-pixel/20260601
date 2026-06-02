let handpose;
let video;
let predictions = [];
let questions = [];
let questionTable;
let currentQ = 0;
let score = 0;
let questionsAnswered = 0;
let gameState = "PLAYING"; // PLAYING, FINISHED
let feedback = "";
let lastActionTime = 0;
const cooldown = 2000; // 判定冷卻時間 (毫秒)
const TOTAL_QUESTIONS = 10;

// 奶油像素配色
const C_BG = [255, 253, 208]; // 奶油底色
const C_TEXT = [93, 64, 55];  // 深咖文字
const C_ACCENT = [255, 138, 101]; // 粉橘強調
const C_BTN = [[255, 204, 128], [255, 224, 130], [255, 245, 157]]; // 三個選項顏色

function preload() {
  // 載入 CSV 題目檔
  questionTable = loadTable('questions.csv', 'csv', 'header');
}

function setup() {
  // 改為全螢幕
  createCanvas(windowWidth, windowHeight);
  
  // 將 CSV 轉換為陣列格式並打亂順序
  let allData = [];
  for (let i = 0; i < questionTable.getRowCount(); i++) {
    let r = questionTable.getRow(i);
    allData.push({
      q: r.get('question'),
      opts: [r.get('option1'), r.get('option2'), r.get('option3')],
      ans: parseInt(r.get('answer')) - 1
    });
  }
  // 隨機挑選 10 題
  allData.sort(() => Math.random() - 0.5);
  questions = allData.slice(0, TOTAL_QUESTIONS);

  // 設定攝影機
  video = createCapture(VIDEO);
  video.size(640, 480); // 固定攝影機解析度以求穩定

  // 初始化 ml5 handPose 模型
  handpose = ml5.handPose(video, () => {
    console.log("模型準備就緒！");
    // 開始持續偵測手部
    handpose.detectStart(video, results => {
      predictions = results;
    });
  });

  video.hide(); // 隱藏原生影像，我們用 draw() 來畫
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // 1. 基礎影像
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  if (gameState === "PLAYING") {
    drawGame();
  } else {
    drawEndScreen();
  }
}

function drawGame() {
  // 2. 像素貓風格 UI
  // 題目框
  fill(C_BG[0], C_BG[1], C_BG[2], 220);
  stroke(C_TEXT);
  strokeWeight(4);
  rect(width * 0.1, 30, width * 0.8, 100);
  
  // 繪製像素貓耳裝飾
  drawPixelEar(width * 0.1, 30, 1);
  drawPixelEar(width * 0.9, 30, -1);

  let qData = questions[currentQ];
  noStroke();
  fill(C_TEXT);
  textSize(windowWidth * 0.02);
  textAlign(CENTER, CENTER);
  text(`第 ${questionsAnswered + 1} / ${TOTAL_QUESTIONS} 題: ${qData.q}`, width/2, 80);

  // 積分表
  fill(C_ACCENT);
  rect(width/2 - 60, 130, 120, 40);
  fill(255);
  textSize(24);
  text(`得分: ${score}`, width/2, 150);

  // 3. 顯示三個選項
  let btnWidth = width * 0.28;
  qData.opts.forEach((opt, i) => {
    let xPos = width * (0.05 + i * 0.31);
    stroke(C_TEXT);
    strokeWeight(4);
    fill(C_BTN[i]);
    rect(xPos, height - 120, btnWidth, 80);
    
    noStroke();
    fill(C_TEXT); 
    textSize(windowWidth * 0.015);
    text(`選項 ${i+1}`, xPos + btnWidth / 2, height - 100);
    textSize(windowWidth * 0.018);
    text(opt, xPos + btnWidth / 2, height - 70);
    
    // 按鈕下方像素肉墊
    drawPixelPaw(xPos + btnWidth/2, height - 30, 4);
  });

  // 4. 手勢偵測邏輯
  if (predictions.length > 0) {
    let keypoints = predictions[0].keypoints;
    let count = getFingerCount(keypoints);

    // 顯示目前偵測到的數字
    fill(C_ACCENT);
    textSize(80);
    text(count, width / 2, height/2 - 50);
    drawPixelCat(width/2, height/2 + 50, 8);

    let now = millis();
    if (count >= 1 && count <= 3 && (now - lastActionTime > cooldown)) {
      if (count - 1 === qData.ans) {
        feedback = "答對了！喵！";
        score += 10;
      } else {
        feedback = "答錯了...嗚";
      }
      lastActionTime = now;
      questionsAnswered++;
      if (questionsAnswered >= TOTAL_QUESTIONS) {
        gameState = "FINISHED";
      } else {
        currentQ = (currentQ + 1) % questions.length;
      }
    }
  }

  // 5. 顯示回饋文字
  if (millis() - lastActionTime < 1500) {
    fill(255, 255, 255, 220);
    rect(width/2 - 150, height/2 - 50, 300, 100, 20);
    fill(93, 64, 55);
    textSize(60);
    text(feedback, width / 2, height / 2);
  }
}

function drawEndScreen() {
  fill(C_BG[0], C_BG[1], C_BG[2], 230);
  rect(width * 0.2, height * 0.2, width * 0.6, height * 0.6, 10);
  
  fill(C_TEXT);
  textAlign(CENTER, CENTER);
  textSize(60);
  text("挑戰結束！", width/2, height/2 - 100);
  textSize(40);
  text(`總分: ${score}`, width/2, height/2);
  
  // 結束畫面像素貓貓動畫
  let bounce = sin(frameCount * 0.1) * 20;
  drawPixelCat(width/2, height/2 + 120 + bounce, 12);
  
  textSize(20);
  text("比出手勢 5 重新開始", width/2, height/2 + 220);
  
  if (predictions.length > 0) {
    if (getFingerCount(predictions[0].keypoints) === 5) {
      score = 0;
      questionsAnswered = 0;
      currentQ = 0;
      gameState = "PLAYING";
    }
  }
}

function drawPixelEar(x, y, dir) {
  push();
  translate(x, y);
  scale(dir, 1);
  fill(C_TEXT);
  rect(0, -20, 20, 20); // 簡單像素耳
  pop();
}

function drawPixelPaw(x, y, s) {
  push();
  translate(x, y);
  noStroke();
  fill(255, 182, 193); // 肉墊粉
  rect(-s*2, -s, s*4, s*3);
  rect(-s*3, -s*3, s, s);
  rect(-s, -s*4, s, s);
  rect(s, -s*4, s, s);
  rect(s*3, -s*3, s, s);
  pop();
}

function drawPixelCat(x, y, s) {
  const grid = [
    [0,1,0,0,0,1,0],
    [1,1,1,1,1,1,1],
    [1,0,1,1,1,0,1],
    [1,1,1,1,1,1,1],
    [0,1,1,0,1,1,0],
    [0,0,1,1,1,0,0]
  ];
  push();
  translate(x - (3.5*s), y - (3*s));
  noStroke();
  fill(C_TEXT);
  for(let i=0; i<grid.length; i++) {
    for(let j=0; j<grid[i].length; j++) {
      if(grid[i][j]) rect(j*s, i*s, s, s);
    }
  }
  pop();
}
function getFingerCount(lm) {
  let count = 0;
  // 判斷食指、中指、無名指、小指是否伸直 (注意最新版座標存取方式為 .x 與 .y)
  if (lm[8].y < lm[6].y) count++;
  if (lm[12].y < lm[10].y) count++;
  if (lm[16].y < lm[14].y) count++;
  if (lm[20].y < lm[18].y) count++;
  
  // 大拇指判定 (簡易距離判定)
  if (dist(lm[4].x, lm[4].y, lm[17].x, lm[17].y) > dist(lm[3].x, lm[3].y, lm[17].x, lm[17].y)) {
    count++;
  }
  return count;
}
