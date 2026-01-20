<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Workout Timer OS - V1.2.7</title>
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#1DB954">
    <style>
        body { margin: 0; background: #000; color: white; font-family: sans-serif; overflow: hidden; height: 100vh; width: 100vw; }
        #music-zone { height: 15vh; border-bottom: 2px solid #333; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        #song-display { font-size: 1.5vw; text-align: center; margin-bottom: 8px; }
        #spotify-status { font-size: 0.8vw; color: #1DB954; text-transform: uppercase; font-weight: bold; }
        .progress-stack { position: absolute; bottom: 0; left: 0; width: 100%; display: flex; flex-direction: column; }
        #song-progress-container { width: 100%; height: 3px; background: #222; }
        #song-progress-bar { height: 100%; background: #1DB954; width: 0%; transition: width 0.5s linear; }
        #workout-progress-container { width: 100%; height: 6px; background: #111; }
        #workout-progress-bar { height: 100%; background: #fff; width: 0%; transition: width 0.5s ease; }
        #workout-zone { height: 85vh; display: flex; flex-direction: row; align-items: center; justify-content: space-evenly; }
        .superset-box { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; }
        #timer-container { width: 25vw; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 1px solid #333; border-right: 1px solid #333; height: 60%; }
        #timer { font-size: 8vw; font-weight: bold; line-height: 1; }
        .activity-label { font-size: 1.2vw; color: #1DB954; letter-spacing: 2px; margin-bottom: 5px; }
        .set-label { font-size: 2vw; margin-top: 10px; font-weight: bold; }
        .exercise-name { font-size: 3.5vw; font-weight: bold; margin: 10px 0; line-height: 1.1; }
        .exercise-stats { font-size: 2.5vw; color: #aaa; }
        #selection-overlay { position: fixed; inset: 0; background: black; display: flex; flex-direction: column; gap: 20px; align-items: center; justify-content: center; z-index: 10; }
        .routine-btn { padding: 40px; font-size: 2rem; background: #222; border: 2px solid white; color: white; border-radius: 15px; cursor: pointer; width: 300px; }
        #version-tag { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); color: #1DB954; font-size: 18px; font-weight: bold; padding: 5px 15px; border-radius: 20px; border: 1px solid #1DB954; }
    </style>
</head>
<body>
    <div id="selection-overlay">
        <div id="version-tag">STABLE V1.2.7</div>
        <button class="routine-btn" onclick="startRoutine('upper')">Upper Body</button>
        <button class="routine-btn" onclick="startRoutine('lower')">Lower Body</button>
    </div>
    <div id="music-zone">
        <div id="song-display"><div id="track-name">Spotify Standby</div><div id="spotify-status">Waiting for Connection</div></div>
        <div class="progress-stack">
            <div id="song-progress-container"><div id="song-progress-bar"></div></div>
            <div id="workout-progress-container"><div id="workout-progress-bar"></div></div>
        </div>
    </div>
    <div id="workout-zone" onclick="handleWorkoutTap(event)">
        <div class="superset-box" id="box-a"><div class="activity-label">EXERCISE A</div><div class="exercise-name" id="name-a">--</div><div class="exercise-stats" id="stats-a">--</div></div>
        <div id="timer-container"><div class="activity-label" id="timer-label">READY</div><div id="timer">00:00</div><div class="set-label" id="set-number">SET 1</div></div>
        <div class="superset-box" id="box-b"><div class="activity-label">EXERCISE B</div><div class="exercise-name" id="name-b">--</div><div class="exercise-stats" id="stats-b">--</div></div>
    </div>

    <script>
        const VERSION = "1.2.7";
        let workoutData = [], currentIndex = 0, isRunning = false;
        let seconds = 0, activeRestGoal = 0, wakeLock = null;
        let audioCtx, startTime = 0, countdownScheduled = false;

        function initAudio() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
            if (audioCtx.state === 'suspended') audioCtx.resume();
        }

        function playBuzzer(isFinal, isGhost, duration, time) {
            const peaks = isFinal ? [438, 874, 1743, 2663, 3490, 5328] : [220, 438, 874, 1743, 2662];
            const master = audioCtx.createGain();
            master.gain.setValueAtTime(0.2, time);
            master.connect(audioCtx.destination);
            peaks.forEach((f, i) => {
                const osc = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                osc.frequency.setValueAtTime(f, time);
                let vol = isGhost ? 0.05 : 0.6;
                g.gain.setValueAtTime(vol, time);
                g.gain.exponentialRampToValueAtTime(0.001, time + (isGhost ? duration : 0.4));
                osc.connect(g); g.connect(master);
                osc.start(time); osc.stop(time + duration + 0.1);
            });
        }

        async function startRoutine(type) {
            initAudio();
            try {
                const response = await fetch(`https://docs.google.com/spreadsheets/d/e/2PACX-1vQmrKfGKM6t61M-jDPlPcClxpoewbXNUWoaKoPzdEGdLEFdlvvCM-y456r46CYkh1YXEV-KvmEuWP7o/pub?gid=0&single=true&output=csv&cb=${Date.now()}`);
                const rows = (await response.text()).split(/\r?\n/).map(r => r.split(','));
                workoutData = rows.slice(1).filter(r => r[0]?.toLowerCase() === type);
                document.getElementById('selection-overlay').style.display = 'none';
                displayExercise();
                requestAnimationFrame(heartbeat);
            } catch (e) { alert(e); }
        }

        function heartbeat() {
            if (isRunning) {
                const elapsed = Math.floor(audioCtx.currentTime - startTime);
                if (elapsed !== seconds) {
                    seconds = elapsed;
                    updateUI();
                    checkAudioTrigger();
                }
            }
            requestAnimationFrame(heartbeat);
        }

        function checkAudioTrigger() {
            if (activeRestGoal > 0 && !countdownScheduled && (activeRestGoal - seconds <= 4)) {
                countdownScheduled = true;
                const triggerTime = startTime + (activeRestGoal - 3);
                playBuzzer(false, true, 3.5, triggerTime); // Ghost
                playBuzzer(false, false, 0.5, triggerTime); // 3
                playBuzzer(false, false, 0.5, triggerTime + 1); // 2
                playBuzzer(false, false, 0.5, triggerTime + 2); // 1
                playBuzzer(true, false, 1.0, triggerTime + 3); // GO
            }
        }

        function handleWorkoutTap(e) {
            initAudio();
            const isLeft = e.clientX < window.innerWidth / 2;
            if (isRunning) {
                if (isLeft) { isRunning = false; document.getElementById('timer-label').innerText = "PAUSED"; }
                else { if(currentIndex < workoutData.length-1) { currentIndex++; seconds = 0; startTime = audioCtx.currentTime; countdownScheduled = false; displayExercise(); } }
            } else {
                if (isLeft && currentIndex > 0) { currentIndex--; displayExercise(); seconds = 0; }
                else { isRunning = true; startTime = audioCtx.currentTime - seconds; }
            }
        }

        function displayExercise() {
            const d = workoutData[currentIndex];
            document.getElementById('set-number').innerText = "SET " + d[1];
            document.getElementById('name-a').innerText = d[2].toUpperCase();
            document.getElementById('stats-a').innerText = `${d[3]} x ${d[4]}`;
            activeRestGoal = currentIndex > 0 ? parseInt(workoutData[currentIndex-1][8]) : 0;
            if (d[5]) { document.getElementById('name-b').innerText = d[5].toUpperCase(); document.getElementById('stats-b').innerText = `${d[6]} x ${d[7]}`; document.getElementById('box-b').style.opacity = "1"; }
            else { document.getElementById('name-b').innerText = "SINGLE SET"; document.getElementById('box-b').style.opacity = "0.3"; }
            updateUI();
        }

        function updateUI() {
            const m = Math.floor(seconds/60), s = seconds%60;
            document.getElementById('timer').innerText = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
            const isRest = activeRestGoal > 0 && seconds < activeRestGoal;
            document.getElementById('timer').style.color = isRest ? '#3498db' : '#1DB954';
            document.getElementById('timer-label').innerText = isRest ? "RESTING" : "LIFTING";
            document.getElementById('timer-label').style.color = isRest ? '#3498db' : '#1DB954';
            document.getElementById('workout-progress-bar').style.width = (currentIndex/(workoutData.length-1)*100) + "%";
        }
    </script>
</body>
</html>
