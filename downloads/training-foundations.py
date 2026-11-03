"""Six standard-library numerical lessons; no network, models, torch or GPU use.

Run all: python training-foundations.py
Run one: python training-foundations.py --lesson foundation-gradients
Check the additional numerical boundaries: python training-foundations.py --check

These examples verify the displayed arithmetic only. They do not perform neural
network training, framework validation, quantized model loading or benchmarking.
"""
from __future__ import annotations

import argparse
import math


def tensors() -> None:
    # BEGIN foundation-tensors
    rows = [[1, 2, 3], [4, 5, 6]]
    bias = [10, 20, 30]
    assert all(len(row) == len(bias) for row in rows)
    result = [[value + bias[j] for j, value in enumerate(row)]
              for row in rows]
    print((len(result), len(result[0])))
    print(result)
    # END foundation-tensors


def gradients() -> None:
    # BEGIN foundation-gradients
    x, target, w, lr = 2.0, 4.0, 1.0, 0.1
    prediction = w * x
    loss = (prediction - target) ** 2
    gradient = 2 * (prediction - target) * x
    w_new = w - lr * gradient
    new_loss = (w_new * x - target) ** 2
    print(f"loss={loss:.2f}, gradient={gradient:.2f}")
    print(f"w={w_new:.2f}, new_loss={new_loss:.2f}")
    # END foundation-gradients


def training_loop() -> None:
    # BEGIN foundation-training-loop
    train = [(1.0, 2.0), (2.0, 4.0)]
    validation = [(3.0, 6.0)]
    w, lr = 1.0, 0.1
    gradient = sum(2 * (w * x - y) * x for x, y in train) / len(train)
    w -= lr * gradient
    train_loss = sum((w * x - y) ** 2 for x, y in train) / len(train)
    w_before_validation = w
    validation_loss = sum((w * x - y) ** 2 for x, y in validation) / len(validation)
    assert w == w_before_validation
    print(f"w={w:.2f}, train_loss={train_loss:.3f}")
    print(f"validation_loss={validation_loss:.2f}, updated=False")
    # END foundation-training-loop


def sft_lora() -> None:
    # BEGIN foundation-sft-lora
    base = [[1.0, 0.0], [0.0, 1.0]]
    a = [[1.0, 2.0]]  # (rank=1, in=2)
    b = [[0.1], [0.2]]  # (out=2, rank=1)
    delta = [[b[i][0] * a[0][j] for j in range(2)] for i in range(2)]
    effective = [[base[i][j] + delta[i][j] for j in range(2)] for i in range(2)]
    x = [1.0, 1.0]
    output = [sum(row[j] * x[j] for j in range(2)) for row in effective]
    print("delta=", delta)
    print("output=", [round(value, 2) for value in output])
    print("base_unchanged=", base == [[1.0, 0.0], [0.0, 1.0]])
    # END foundation-sft-lora


def preferences() -> None:
    # BEGIN foundation-preferences
    import math

    policy_chosen, policy_rejected = 0.6, 0.2
    ref_chosen, ref_rejected, beta = 0.25, 0.25, 1.0
    margin = (math.log(policy_chosen / ref_chosen)
              - math.log(policy_rejected / ref_rejected))
    logit = beta * margin
    preference_probability = 1 / (1 + math.exp(-logit))
    loss = -math.log(preference_probability)
    print(f"margin={margin:.6f}")
    print(f"sigmoid={preference_probability:.2f}, loss={loss:.6f}")
    # END foundation-preferences


def inference_budget() -> None:
    # BEGIN foundation-inference-budget
    weights = [0.26, -0.14, 0.9]
    scale = 0.1
    quantized = [max(-7, min(7, round(value / scale))) for value in weights]
    restored = [value * scale for value in quantized]
    errors = [round(abs(a - b), 2) for a, b in zip(weights, restored)]
    parameters = 4_000_000_000
    kv_bytes = 2 * 32 * 1 * 2048 * 8 * 128 * 2
    print("q=", quantized, "errors=", errors)
    print(f"weights: fp16={parameters * 2 / 2**30:.2f} GiB, int4_lower_bound={parameters / 2 / 2**30:.2f} GiB")
    print(f"kv_estimate={kv_bytes / 2**30:.2f} GiB")
    # END foundation-inference-budget


def check_boundaries() -> int:
    """Independently check formulas and edge cases instead of only print output."""
    checks = 0

    def check(condition: bool, message: str) -> None:
        nonlocal checks
        if not condition:
            raise AssertionError(message)
        checks += 1

    def broadcast_shape(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
        """Educational shape checker for non-empty positive dimensions only."""
        if any(size <= 0 for size in left + right):
            raise ValueError('This small example only handles positive dimensions.')
        width = max(len(left), len(right))
        left = (1,) * (width - len(left)) + left
        right = (1,) * (width - len(right)) + right
        result = []
        for a, b in zip(left, right):
            if a != b and a != 1 and b != 1:
                raise ValueError('Incompatible dimensions')
            result.append(max(a, b))
        return tuple(result)

    check(broadcast_shape((2, 3), (3,)) == (2, 3), 'Column bias shape')
    check(broadcast_shape((2, 3), (2, 1)) == (2, 3), 'Row bias shape')
    check(broadcast_shape((2, 1), (2,)) == (2, 2), 'Silent cross-sample broadcast')
    check(broadcast_shape((2, 3), ()) == (2, 3), 'Scalar shape')
    try:
        broadcast_shape((2, 3), (2,))
    except ValueError:
        check(True, 'Incompatible shape rejected')
    else:
        check(False, 'Incompatible shape must fail')

    def loss(w: float) -> float:
        return (w * 2 - 4) ** 2

    h = 1e-5
    numerical_gradient = (loss(1 + h) - loss(1 - h)) / (2 * h)
    check(math.isclose(numerical_gradient, -8, rel_tol=1e-8), 'Finite difference gradient')
    check(math.isclose(loss(1.8), 0.16), 'Small step lowers this loss')
    check(loss(9) == 196 > loss(1), 'Large learning rate can worsen loss')
    check(((0.5 ** 2) + (1 ** 2)) / 2 == 0.625, 'Training mean loss')
    check((1.5 * 3 - 6) ** 2 == 2.25, 'Separate validation loss')
    check(math.isclose(-math.log(0.25), 1.3862943611198906), 'SFT negative log likelihood')
    check(8 * 1024 + 1024 * 8 == 16384, 'LoRA parameter count')
    delta = [[0.1, 0.2], [0.2, 0.4]]
    check(math.isclose(delta[0][0] * delta[1][1] - delta[0][1] * delta[1][0], 0, abs_tol=1e-12), 'Rank-one determinant')

    def dpo_loss(pc: float, pr: float, rc: float, rr: float, beta: float) -> float:
        if not all(0 < value <= 1 for value in (pc, pr, rc, rr)) or beta <= 0:
            raise ValueError('Positive probabilities and beta are required')
        margin = math.log(pc / rc) - math.log(pr / rr)
        z = beta * margin
        return max(0.0, -z) + math.log1p(math.exp(-abs(z)))

    check(math.isclose(dpo_loss(0.6, 0.2, 0.25, 0.25, 1), -math.log(0.75)), 'DPO worked loss')
    check(math.isclose(dpo_loss(0.25, 0.25, 0.25, 0.25, 1), math.log(2)), 'DPO equal ratios')
    check(dpo_loss(0.2, 0.6, 0.25, 0.25, 1) > dpo_loss(0.6, 0.2, 0.25, 0.25, 1), 'Reversed preferences increase loss')
    try:
        dpo_loss(0, 0.2, 0.25, 0.25, 1)
    except ValueError:
        check(True, 'Invalid log input rejected')
    else:
        check(False, 'Zero probability must fail')

    check(4_000_000_000 * 4 / 8 == 2_000_000_000, 'Int4 lower bound in bytes')
    check(max(-7, min(7, round(0.9 / 0.1))) == 7, 'Quantization clipping')
    check(math.isclose(abs(0.26 - round(0.26 / 0.1) * 0.1), 0.04), 'Rounding error')
    check(2 * 32 * 1 * 2048 * 8 * 128 * 2 == 268435456, 'KV cache estimate')
    check(2 * 32 * 1 * 4096 * 8 * 128 * 2 == 2 * 268435456, 'KV cache linear length scaling')
    return checks


DEMOS = {
    'foundation-tensors': tensors,
    'foundation-gradients': gradients,
    'foundation-training-loop': training_loop,
    'foundation-sft-lora': sft_lora,
    'foundation-preferences': preferences,
    'foundation-inference-budget': inference_budget,
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lesson', choices=tuple(DEMOS))
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.lesson:
        DEMOS[args.lesson]()
    else:
        for lesson_id, run in DEMOS.items():
            print(f'[{lesson_id}]')
            run()
    if args.check:
        print(f'boundary_checks={check_boundaries()}')


if __name__ == '__main__':
    main()
