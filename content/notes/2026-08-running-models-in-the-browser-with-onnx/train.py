"""Fit four scikit-learn classifiers on two moons, export them to ONNX, and draw the
decision boundaries by running the exported files through onnxruntime.

The note this sits beside draws the same four boundaries in the reader's browser, from
these same `.onnx` files, under `onnxruntime-web`. Running them here through the Python
runtime first is what makes that checkable: if the browser drew something else, one of
the two is wrong. `boundaries.png` is the Python answer and is also the note's thumbnail.

`demo.json` carries everything the browser needs that is not in the model files: the 150
points the four classifiers were fitted on, the extent to draw them in, and the file
sizes, so the sizes quoted in the note come from the same run that wrote the files.

    uv run python content/notes/2026-08-running-models-in-the-browser-with-onnx/train.py
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import onnxruntime as ort
import seaborn as sns
from skl2onnx import to_onnx
from sklearn.datasets import make_moons
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC

HERE = Path(__file__).parent
SEED = 0
TARGET_OPSET = 15
GRID = 300

X, y = make_moons(n_samples=150, noise=0.2, random_state=SEED)
X = X.astype(np.float32)

MODELS = {
    "logistic-regression": ("Logistic regression", LogisticRegression()),
    "svm-rbf": ("SVM, RBF kernel", SVC(kernel="rbf", gamma="scale", probability=True, random_state=SEED)),
    "random-forest": ("Random forest", RandomForestClassifier(n_estimators=100, random_state=SEED)),
    "mlp": (
        "MLP, two hidden layers of 16",
        MLPClassifier(hidden_layer_sizes=(16, 16), solver="lbfgs", max_iter=4000, random_state=SEED),
    ),
}

# The grid the boundary is drawn from. onnxruntime scores it in one call here and the
# browser scores the same grid one page load at a time.
pad = 0.5
extent = (X[:, 0].min() - pad, X[:, 0].max() + pad, X[:, 1].min() - pad, X[:, 1].max() + pad)
xx, yy = np.meshgrid(
    np.linspace(extent[0], extent[1], GRID),
    np.linspace(extent[2], extent[3], GRID),
)
grid = np.c_[xx.ravel(), yy.ravel()].astype(np.float32)

report = {}
surfaces = {}

for slug, (label, model) in MODELS.items():
    model.fit(X, y)

    # zipmap=False makes the probability output a plain [N, 2] tensor. The default emits a
    # sequence of maps, which onnxruntime-web hands back as something awkward in JS.
    onx = to_onnx(model, X[:1], target_opset=TARGET_OPSET, options={id(model): {"zipmap": False}})
    path = HERE / f"{slug}.onnx"
    path.write_bytes(onx.SerializeToString())

    sess = ort.InferenceSession(path.read_bytes(), providers=["CPUExecutionProvider"])
    input_name = sess.get_inputs()[0].name
    output_names = [o.name for o in sess.get_outputs()]

    onnx_labels = sess.run(None, {input_name: X})[0]
    agreement = float((np.asarray(onnx_labels).ravel() == model.predict(X)).mean())

    proba = sess.run(None, {input_name: grid})[1]
    surfaces[slug] = np.asarray(proba)[:, 1].reshape(xx.shape)

    report[slug] = {
        "label": label,
        "bytes": path.stat().st_size,
        "train_accuracy": float(model.score(X, y)),
        "onnx_agrees_with_sklearn": agreement,
        "input": input_name,
        "outputs": output_names,
        "opset": TARGET_OPSET,
    }

smallest = min(r["bytes"] for r in report.values())
for r in report.values():
    r["times_smallest"] = round(r["bytes"] / smallest, 1)

# One file for the browser rather than three, because the component wants all of it at
# once and a note directory with a JSON per fact is a note directory nobody can read.
(HERE / "demo.json").write_text(
    json.dumps(
        {
            "extent": [round(float(v), 6) for v in extent],
            "points": [[round(float(a), 6), round(float(b), 6)] for a, b in X],
            "labels": [int(v) for v in y],
            "models": report,
        },
        indent=2,
    )
    + "\n"
)
print(json.dumps(report, indent=2))


def size_label(n_bytes):
    return f"{n_bytes:,} B" if n_bytes < 10_000 else f"{n_bytes / 1024:,.0f} kB"


sns.set_theme(style="darkgrid", context="notebook")

imshow_extent = (xx.min(), xx.max(), yy.min(), yy.max())
fig, axes = plt.subplots(2, 2, figsize=(9.0, 8.2), sharex=True, sharey=True)
for ax, (slug, (label, _)) in zip(axes.ravel(), MODELS.items(), strict=True):
    # imshow rather than contourf: the forest's surface is piecewise constant, and contouring
    # it draws artefacts along every level boundary instead of the blocks that are really there.
    ax.imshow(
        surfaces[slug],
        extent=imshow_extent,
        origin="lower",
        cmap="RdBu_r",
        vmin=0,
        vmax=1,
        alpha=0.62,
        interpolation="nearest",
        aspect="auto",
        zorder=0,
    )
    ax.grid(True, color="white", alpha=0.35, linewidth=0.8, zorder=1)
    ax.set_axisbelow(False)
    ax.contour(xx, yy, surfaces[slug], levels=[0.5], colors="k", linewidths=1.2, zorder=2)
    ax.scatter(X[y == 0, 0], X[y == 0, 1], s=52, c="#08306b", edgecolors="white", linewidths=1.0, zorder=3)
    ax.scatter(X[y == 1, 0], X[y == 1, 1], s=52, c="#7f0000", edgecolors="white", linewidths=1.0, zorder=3)
    ax.set_title(f"{label}   {size_label(report[slug]['bytes'])}", fontsize=11)
    ax.set_xlim(imshow_extent[0], imshow_extent[1])
    ax.set_ylim(imshow_extent[2], imshow_extent[3])

fig.tight_layout()
fig.savefig(HERE / "boundaries.png", dpi=160)
print(f"wrote {HERE / 'boundaries.png'}")
