# Regenerating this note's models

Everything in this directory except the prose and the two components comes out of `train.py`. Nothing
in it is hand-made and nothing should be edited in place: change the script and run it again.

```bash
uv sync
uv run python content/notes/2026-08-running-models-in-the-browser-with-onnx/train.py
```

That writes, into this directory:

| file                                                                         | what it is                                                                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `logistic-regression.onnx`, `svm-rbf.onnx`, `random-forest.onnx`, `mlp.onnx` | the four exported models, fetched and run by the browser                                       |
| `demo.json`                                                                  | the 150 training points, the plotting extent, and each model's label, input name and file size |
| `boundaries.png`                                                             | the same four boundaries drawn under the Python runtime; the note's thumbnail                  |

The Python dependencies are in the repository's `pyproject.toml`: `scikit-learn`, `skl2onnx`, `onnx`
and `onnxruntime`, alongside what the rest of `python/` already needed.

## Why the figure exists at all when the note draws live charts

`Boundaries.tsx` draws the four boundaries in the reader's browser from the four `.onnx` files, which
is the note's whole claim. `boundaries.png` is the same four boundaries computed here, under the
Python runtime, from the same files.

Keeping both is the only check there is. If the browser and Python disagree, one of the two is wrong,
and without the second answer there is no way to notice. It is also the note's index thumbnail, which
a live chart cannot be.

Both sides also assert their own agreement with scikit-learn: `train.py` records
`onnx_agrees_with_sklearn` in `demo.json`, which is the fraction of the 150 training points where the
exported graph predicts what the fitted estimator predicts. It is 1.0 for all four. If an export ever
starts rounding differently, that number moves before the picture does.

## The things that will catch you out

**`zipmap=False` is not optional.** `skl2onnx` defaults to wrapping a classifier's probability output
in a `ZipMap`, so the output type is `seq(map(int64, tensor(float)))`. Python handles that fine and
`onnxruntime-web` hands it to JavaScript as a sequence of maps, which is awkward to unpack and
allocates a map per row. With the option off, `probabilities` is a plain `[N, 2]` float tensor and
`Boundaries.tsx` can read column 1 straight out of it.

**The opset did not turn out to matter.** Every target opset from 7 to 24 produced a random forest
that loaded under `onnxruntime` 1.29, so `TARGET_OPSET = 15` is a pinned choice rather than a
worked-around problem. Pinned anyway, because an export that silently follows whatever the installed
converter defaults to is an export that changes under you.

**The SVM is not bit-reproducible across scikit-learn versions.** The other three files came back
byte-identical when this was re-run under a newer scikit-learn; `svm-rbf.onnx` did not, at the same
1,239 bytes and the same training accuracy. Do not treat a changed hash there as a bug.

**The sizes in the prose are real and will move.** The note quotes 124 kB, 2.7 kB and 379 bytes. They
come from this script, so re-run it before trusting them, and correct the prose if the numbers change.

## The browser side

`Boundaries.tsx` is the live chart. Two things about it are worth knowing before changing it.

The WebAssembly runtime is fetched, not bundled. `onnxruntime-web/wasm` resolves to a 73 kB loader
that wants its binary at a URL, and the import of `ort-wasm-simd-threaded.wasm?url` is what tells
Vite to emit that binary as a build asset. The other export inlines the binary as base64, which would
put roughly 18 MB into this note's chunk. The binary itself is about 13.5 MB and roughly 3.4 MB over
the wire once the host has gzipped it, cached after the first load.

Inference and painting are separate on purpose. The models run once when the component mounts;
switching between light and dark repaints the four surfaces from arrays that are already in memory
rather than running anything again.
