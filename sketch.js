let handpose;
let video;
let predictions = [];
let questions = [];
let questionTable;
let currentQ = 0;
let score = 0;
let feedback = "";
let lastActionTime = 0;
const cooldown = 2000; // 判定冷卻時間 (毫秒)

function preload() {
  // 載入 CSV 題目檔
  questionTable = loadTable('questions.csv', 'csv', 'header');
}

function setup() {
  // 改為全螢幕
  createCanvas(windowWidth, windowHeight);
  
  // 將 CSV 轉換為陣列格式
  for (let i = 0; i < questionTable.getRowCount(); i++) {
    let row = questionTable.getRow(i);
    questions.push({
      q: row.get('question'),
      opts: [row.get('option1'), row.get('option2'), row.get('option3')],
      ans: parseInt(row.get('answer')) - 1 // 將 1,2,3 轉為 0,1,2 索引
    });
  }

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

// 處理視窗大小改變
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // 1. 繪製鏡像影像
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  // 2. 貓貓風格 UI 背景 (奶油色系)
  // 繪製上方的題目區域
  fill(255, 253, 208, 200); // 奶油白半透明
  noStroke();
  rect(50, 20, width - 100, 80, 25);
  
  // 畫貓耳朵 (在題目框上方)
  fill(230, 186, 149); // 暖橘貓色
  triangle(70, 20, 100, 20, 85, -10); // 左耳
  triangle(width - 70, 20, width - 100, 20, width - 85, -10); // 右耳

  let qData = questions[currentQ];
  fill(93, 64, 55); // 深咖啡色文字
  textSize(windowWidth * 0.02);
  textAlign(LEFT, CENTER);
  text(`題目: ${qData.q}`, 30, 50);

  textAlign(RIGHT, CENTER);
  fill(216, 67, 21); // 橘紅色得分
  text(`得分: ${score}`, width - 80, 60);

  // 3. 顯示三個選項
  // 奶油貓配色: 淺橘、米黃、深奶油
  let optColors = ['#FFCC80', '#FFE082', '#FFF59D'];
  let btnWidth = width * 0.28;
  textAlign(CENTER, CENTER);
  qData.opts.forEach((opt, i) => {
    let xPos = width * (0.05 + i * 0.31);
    stroke(93, 64, 55, 100); // 咖啡色邊框
    strokeWeight(2);
    fill(optColors[i]);
    rect(xPos, height - 100, btnWidth, 70, 20);
    
    // 顯示選項文字
    noStroke();
    fill(93, 64, 55); 
    textSize(windowWidth * 0.018);
    text(`${opt}`, xPos + btnWidth / 2, height - 65);
    
    // 在按鈕下方畫一個小肉墊裝飾
    drawPaw(xPos + 30, height - 110, 15);
  });

  // 4. 手勢偵測邏輯
  if (predictions.length > 0) {
    let keypoints = predictions[0].keypoints;
    let count = getFingerCount(keypoints);

    // 顯示目前偵測到的數字
    fill(255, 138, 101); // 可愛粉橘色
    textSize(80);
    text(`妳出了: ${count}`, width / 2, 180);
    drawPaw(width / 2, 250, 40); // 顯示區中央畫個大肉墊

    let now = millis();
    if (count >= 1 && count <= 3 && (now - lastActionTime > cooldown)) {
      if (count - 1 === qData.ans) {
        feedback = "喵！答對了 🐾";
        score += 10;
      } else {
        feedback = "嗚...答錯了 😿";
      }
      lastActionTime = now;
      currentQ = (currentQ + 1) % questions.length;
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

// 畫貓肉墊的輔助函數
function drawPaw(x, y, size) {
  push();
  fill(255, 182, 193); // 粉嫩肉墊色
  noStroke();
  // 主肉墊
  ellipse(x, y, size * 1.2, size);
  // 四個小腳趾
  ellipse(x - size * 0.5, y - size * 0.4, size * 0.4);
  ellipse(x - size * 0.2, y - size * 0.6, size * 0.4);
  ellipse(x + size * 0.2, y - size * 0.6, size * 0.4);
  ellipse(x + size * 0.5, y - size * 0.4, size * 0.4);
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
