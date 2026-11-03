"""Free local Kokoro, one model load for many lines. Same engine, voices and speed as `hyperframes tts`, which reloads the model per line.
usage: python3 tools/kokoro_batch.py <plan.json>   (written by: node tools/make_takes.mjs plan)
Each wav appears whole, so a stopped run picks up where it left off."""
import json
import os
import sys

import kokoro_onnx
import soundfile as sf

home = os.path.expanduser("~/.cache/hyperframes/tts")
model_dir = os.path.join(home, "models")
voices_dir = os.path.join(home, "voices")
model_path = os.path.join(model_dir, sorted(f for f in os.listdir(model_dir) if f.endswith(".onnx"))[0])
voices_path = os.path.join(voices_dir, sorted(f for f in os.listdir(voices_dir) if f.endswith(".bin"))[0])

plan = json.load(open(sys.argv[1]))
model = kokoro_onnx.Kokoro(model_path, voices_path)
print("loaded", os.path.basename(model_path), len(plan), "lines", flush=True)

for i, item in enumerate(plan):
    if os.path.exists(item["out"]):
        continue
    samples, rate = model.create(item["text"], voice=item["voice"], speed=0.94, lang="en-us")
    tmp = item["out"] + ".part.wav"
    sf.write(tmp, samples, rate)
    os.replace(tmp, item["out"])
    print("took", i + 1, item["voice"], item["text"][:60], flush=True)
print("done", flush=True)
