"""Using `dataclass` and `nn.Module` together, so hyperparameters declare themselves.

Run it:

    uv run python/demos/torch_dataclass.py

Everything printed by this file is quoted verbatim in
content/notes/pytorch-meets-dataclasses/index.mdx. If you change one, rerun and
update the other.
"""

from dataclasses import asdict, dataclass, field, fields, is_dataclass

import torch
from torch import nn

torch.manual_seed(0)


def hparams(model: nn.Module) -> dict:
    """The model's hyperparameters, without touching its weights."""
    assert is_dataclass(model) and isinstance(model, nn.Module)
    return asdict(model)


# `eq=False` keeps nn.Module's identity-based __hash__ and __eq__. Without it,
# the dataclass writes a __eq__ that compares fields, Python then sets
# __hash__ = None, and the module becomes unhashable — which breaks anything
# that puts modules in a set or a dict, including parts of torch itself.
@dataclass(eq=False)
class Classifier(nn.Module):
    n_input: int
    n_classes: int
    hidden: list[int] = field(default_factory=lambda: [64])

    def __post_init__(self):
        # nn.Module.__init__ has to run before any submodule is assigned, and a
        # dataclass gives us exactly one hook that is guaranteed to run after
        # the fields are set.
        super().__init__()

        sizes = [self.n_input, *self.hidden]
        layers: list[nn.Module] = []
        for a, b in zip(sizes[:-1], sizes[1:], strict=True):
            layers += [nn.Linear(a, b), nn.ReLU()]
        layers.append(nn.Linear(sizes[-1], self.n_classes))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)


@dataclass(eq=False)
class DropoutClassifier(Classifier):
    """Adds one hyperparameter. It does not restate the three it inherits."""

    p_dropout: float = 0.1

    def forward(self, x):
        return self.net(nn.functional.dropout(x, p=self.p_dropout, training=self.training))


def why_eq_false() -> None:
    """The three settings of the `eq` / `unsafe_hash` flags, and what each does.

    This is the part of the idea that is easy to get wrong, so it is checked
    rather than asserted.
    """

    @dataclass  # the default, eq=True
    class Default(nn.Module):
        n: int

        def __post_init__(self):
            super().__init__()
            self.lin = nn.Linear(self.n, 1)

    @dataclass(unsafe_hash=True)
    class Unsafe(nn.Module):
        n: int

        def __post_init__(self):
            super().__init__()
            self.lin = nn.Linear(self.n, 1)

    @dataclass(eq=False)
    class NoEq(nn.Module):
        n: int

        def __post_init__(self):
            super().__init__()
            self.lin = nn.Linear(self.n, 1)

    print(f"{(Default.__hash__ is None)=}")
    try:
        hash(Default(4))
    except TypeError as error:
        print(f"hash(Default(4)) -> TypeError: {error}")

    a, b = Unsafe(4), Unsafe(4)
    print(f"unsafe_hash: {(hash(a) == hash(b))=} {(a == b)=} {torch.equal(a.lin.weight, b.lin.weight)=} {len({a, b})=}")

    c, d = NoEq(4), NoEq(4)
    print(f"eq=False:    {(hash(c) == hash(d))=} {(c == d)=} {len({c, d})=}")


def main() -> None:
    x = torch.randn(4, 10)

    base = Classifier(n_input=10, n_classes=3)
    child = DropoutClassifier(n_input=10, n_classes=3, hidden=[32, 32], p_dropout=0.5)

    print(f"{base!r}"[:78], "...")
    print()

    print(f"{hparams(base)=}")
    print(f"{hparams(child)=}")
    print()

    print(f"{sum(p.numel() for p in base.parameters())=}")
    print(f"{sum(p.numel() for p in child.parameters())=}")
    print(f"{base(x).shape=}")
    print(f"{child(x).shape=}")
    print()

    # The declared fields are the constructor signature, so a config dict and a
    # model are the same thing in two shapes.
    config = hparams(child)
    rebuilt = DropoutClassifier(**config)
    print(f"{hparams(rebuilt) == config=}")
    print(f"{[f.name for f in fields(child)]=}")
    print()

    # Round-tripping through a state dict is unaffected: the fields rebuild the
    # architecture, the state dict fills in the weights.
    clone = DropoutClassifier(**hparams(child))
    clone.load_state_dict(child.state_dict())
    print(f"{torch.equal(child.eval()(x), clone.eval()(x))=}")

    # Hashability, which is what `eq=False` is protecting.
    print(f"{len({base, child})=}")
    print()

    why_eq_false()


if __name__ == "__main__":
    main()
