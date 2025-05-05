// === DOM References ===
const webcam = document.getElementById("webcam");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const predictionLog = document.getElementById("predictionLog");

// === Model Variables ===
let model, maxPredictions;
const modelURL = "Models/";
let loopActive = false;

// === Load Teachable Machine Model ===
document.getElementById("loadModel").addEventListener("click", async () => {
  model = await tmImage.load(
    modelURL + "model.json",
    modelURL + "metadata.json"
  );
  maxPredictions = model.getTotalClasses();
  alert("✅ Model loaded!");
});

// === Start Webcam ===
document.getElementById("startCamera").addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  webcam.srcObject = stream;

  webcam.addEventListener("loadedmetadata", () => {
    overlay.width = webcam.videoWidth;
    overlay.height = webcam.videoHeight;
  });
});

// === Start Prediction Loop ===
document.getElementById("startTracking").addEventListener("click", () => {
  if (!model) return alert("❗ Load the model first.");
  loopActive = true;
  predict();
});

// === Main Prediction Function ===
async function predict() {
  while (loopActive) {
    const predictions = await model.predict(webcam);

    // Clear previous canvas drawings
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Find highest probability class
    const top = predictions.reduce((max, curr) =>
      curr.probability > max.probability ? curr : max
    );

    if (top.probability > 0.8) {
      drawLabel(top.className, top.probability);
      logPrediction(top.className, top.probability);
    }

    await new Promise(requestAnimationFrame); // Loop without blocking UI
  }
}

// === Draw Label on Canvas ===
function drawLabel(label, prob) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(10, 10, 240, 40);
  ctx.fillStyle = "#fff";
  ctx.font = "16px sans-serif";
  ctx.fillText(`${label} (${(prob * 100).toFixed(1)}%)`, 20, 35);
}

// === Update Prediction Log ===
function logPrediction(label, prob) {
  const li = document.createElement("li");
  li.textContent = `${label} – ${(prob * 100).toFixed(1)}%`;
  predictionLog.prepend(li);

  // Keep log to 10 items
  if (predictionLog.children.length > 10) {
    predictionLog.removeChild(predictionLog.lastChild);
  }
}
