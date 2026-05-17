import hashlib
import os
import random
import struct
import csv
import statistics
from pathlib import Path

import matplotlib.pyplot as plt


# ------------------------------------------------------------
# 1. Hashfunktionen
# ------------------------------------------------------------

def sha256(data: bytes) -> bytes:
    """Berechnet SHA-256 für gegebene Bytes."""
    return hashlib.sha256(data).digest()


def double_sha256(data: bytes) -> bytes:
    """Berechnet Double-SHA-256, wie es bei Bitcoin-Blockheadern verwendet wird."""
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()


# ------------------------------------------------------------
# 2. Hamming-Distanz
# ------------------------------------------------------------

def hamming_distance(hash_a: bytes, hash_b: bytes) -> int:
    """
    Berechnet die Hamming-Distanz zwischen zwei Hashwerten.
    Beide Hashes müssen gleich lang sein.
    """
    if len(hash_a) != len(hash_b):
        raise ValueError("Die Hashwerte müssen gleich lang sein.")

    distance = 0

    for byte_a, byte_b in zip(hash_a, hash_b):
        difference = byte_a ^ byte_b
        distance += difference.bit_count()

    return distance


def hamming_percent(distance: int, bit_length: int = 256) -> float:
    """Gibt die Hamming-Distanz als Prozentwert zurück."""
    return distance / bit_length * 100


# ------------------------------------------------------------
# 3. Minimale Änderung: genau ein Bit flippen
# ------------------------------------------------------------

def flip_random_bit(data: bytes) -> bytes:
    """
    Flipt genau ein zufälliges Bit in einer Bytefolge.
    Dadurch unterscheiden sich Original und Kopie wirklich nur in einem Bit.
    """
    modified = bytearray(data)

    byte_index = random.randrange(len(modified))
    bit_index = random.randrange(8)

    modified[byte_index] ^= (1 << bit_index)

    return bytes(modified)


# ------------------------------------------------------------
# 4. Vereinfachter Bitcoin-Blockheader
# ------------------------------------------------------------

def build_simplified_block_header(nonce: int) -> bytes:
    """
    Baut einen vereinfachten Bitcoin-Blockheader mit 80 Bytes.

    Aufbau:
    - version: 4 Bytes
    - previous block hash: 32 Bytes
    - merkle root: 32 Bytes
    - timestamp: 4 Bytes
    - bits: 4 Bytes
    - nonce: 4 Bytes

    Zusammen: 80 Bytes
    """
    version = struct.pack("<I", 1)
    previous_block_hash = os.urandom(32)
    merkle_root = os.urandom(32)
    timestamp = struct.pack("<I", 1710000000)
    bits = struct.pack("<I", 0x1d00ffff)
    nonce_bytes = struct.pack("<I", nonce)

    return version + previous_block_hash + merkle_root + timestamp + bits + nonce_bytes


def build_header_from_fixed_parts(previous_block_hash: bytes, merkle_root: bytes, nonce: int) -> bytes:
    """
    Baut einen Header, bei dem nur die Nonce verändert wird.
    Das ist wichtig für den Nonce-Test.
    """
    version = struct.pack("<I", 1)
    timestamp = struct.pack("<I", 1710000000)
    bits = struct.pack("<I", 0x1d00ffff)
    nonce_bytes = struct.pack("<I", nonce)

    return version + previous_block_hash + merkle_root + timestamp + bits + nonce_bytes


# ------------------------------------------------------------
# 5. Einzelbeispiel
# ------------------------------------------------------------

def demo_single_example():
    print("\n--- Einzelbeispiel: minimale Textänderung ---")

    input_a = b"Bitcoin"
    input_b = b"bitcoin"

    hash_a = sha256(input_a)
    hash_b = sha256(input_b)

    distance = hamming_distance(hash_a, hash_b)

    print(f"Eingabe A: {input_a}")
    print(f"Eingabe B: {input_b}")
    print(f"SHA-256 A: {hash_a.hex()}")
    print(f"SHA-256 B: {hash_b.hex()}")
    print(f"Hamming-Distanz: {distance} von 256 Bits")
    print(f"Veränderte Bits: {hamming_percent(distance):.2f} %")


# ------------------------------------------------------------
# 6. Statistische Simulation: Ein-Bit-Änderung
# ------------------------------------------------------------

def run_bit_flip_simulation(trials: int = 1000):
    """
    Führt viele Tests durch.
    In jedem Test wird eine zufällige 80-Byte-Eingabe erzeugt.
    Danach wird genau ein Bit verändert.
    Anschließend werden SHA-256 und Double-SHA-256 verglichen.
    """
    results = []

    for i in range(trials):
        original = os.urandom(80)
        modified = flip_random_bit(original)

        sha_a = sha256(original)
        sha_b = sha256(modified)

        double_a = double_sha256(original)
        double_b = double_sha256(modified)

        sha_distance = hamming_distance(sha_a, sha_b)
        double_distance = hamming_distance(double_a, double_b)

        results.append({
            "trial": i + 1,
            "experiment": "one_bit_flip",
            "sha256_distance": sha_distance,
            "sha256_percent": hamming_percent(sha_distance),
            "double_sha256_distance": double_distance,
            "double_sha256_percent": hamming_percent(double_distance),
        })

    return results


# ------------------------------------------------------------
# 7. Bitcoin-naher Nonce-Test
# ------------------------------------------------------------

def run_nonce_simulation(trials: int = 1000):
    """
    Führt einen Bitcoin-nahen Test durch.
    Pro Durchlauf bleiben previous block hash und merkle root gleich.
    Nur die Nonce wird um 1 erhöht.
    """
    results = []

    for i in range(trials):
        previous_block_hash = os.urandom(32)
        merkle_root = os.urandom(32)

        nonce_a = random.randrange(0, 2**32 - 2)
        nonce_b = nonce_a + 1

        header_a = build_header_from_fixed_parts(previous_block_hash, merkle_root, nonce_a)
        header_b = build_header_from_fixed_parts(previous_block_hash, merkle_root, nonce_b)

        sha_a = sha256(header_a)
        sha_b = sha256(header_b)

        double_a = double_sha256(header_a)
        double_b = double_sha256(header_b)

        sha_distance = hamming_distance(sha_a, sha_b)
        double_distance = hamming_distance(double_a, double_b)

        results.append({
            "trial": i + 1,
            "experiment": "nonce_plus_one",
            "sha256_distance": sha_distance,
            "sha256_percent": hamming_percent(sha_distance),
            "double_sha256_distance": double_distance,
            "double_sha256_percent": hamming_percent(double_distance),
        })

    return results


# ------------------------------------------------------------
# 8. Optionale Proof-of-Work-Mini-Simulation
# ------------------------------------------------------------

def count_leading_zero_bits(data: bytes) -> int:
    """Zählt führende Nullbits in einem Hashwert."""
    count = 0

    for byte in data:
        if byte == 0:
            count += 8
        else:
            count += 8 - byte.bit_length()
            break

    return count


def run_mini_pow_demo(difficulty_bits: int = 16, max_nonce: int = 2_000_000):
    """
    Kleine Proof-of-Work-Demo.
    Gesucht wird eine Nonce, deren Double-SHA-256-Hash mit einer bestimmten
    Anzahl führender Nullbits beginnt.

    difficulty_bits sollte für eine Demo klein bleiben, z. B. 16.
    """
    previous_block_hash = os.urandom(32)
    merkle_root = os.urandom(32)

    for nonce in range(max_nonce):
        header = build_header_from_fixed_parts(previous_block_hash, merkle_root, nonce)
        digest = double_sha256(header)

        if count_leading_zero_bits(digest) >= difficulty_bits:
            return {
                "found": True,
                "nonce": nonce,
                "hash": digest.hex(),
                "leading_zero_bits": count_leading_zero_bits(digest),
                "attempts": nonce + 1,
            }

    return {
        "found": False,
        "nonce": None,
        "hash": None,
        "leading_zero_bits": None,
        "attempts": max_nonce,
    }


# ------------------------------------------------------------
# 9. Auswertung
# ------------------------------------------------------------

def summarize(values):
    """Berechnet statistische Kennzahlen."""
    return {
        "count": len(values),
        "mean": statistics.mean(values),
        "median": statistics.median(values),
        "minimum": min(values),
        "maximum": max(values),
        "stdev": statistics.stdev(values) if len(values) > 1 else 0,
    }


def print_summary(name, values):
    summary = summarize(values)

    print(f"\n--- {name} ---")
    print(f"Anzahl Durchläufe: {summary['count']}")
    print(f"Mittelwert: {summary['mean']:.2f} Bits")
    print(f"Median: {summary['median']:.2f} Bits")
    print(f"Minimum: {summary['minimum']} Bits")
    print(f"Maximum: {summary['maximum']} Bits")
    print(f"Standardabweichung: {summary['stdev']:.2f} Bits")
    print(f"Durchschnittliche Veränderung: {summary['mean'] / 256 * 100:.2f} %")


def save_results_csv(results, output_path):
    """Speichert alle Ergebnisse als CSV-Datei."""
    fieldnames = [
        "trial",
        "experiment",
        "sha256_distance",
        "sha256_percent",
        "double_sha256_distance",
        "double_sha256_percent",
    ]

    with open(output_path, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)


def plot_histogram(values, title, output_path):
    """Erstellt ein Histogramm der Hamming-Distanzen."""
    plt.figure(figsize=(10, 6))
    plt.hist(values, bins=30, edgecolor="black")
    plt.axvline(128, linestyle="--", label="Erwartungswert: 128 Bits")
    plt.title(title)
    plt.xlabel("Hamming-Distanz in Bits")
    plt.ylabel("Häufigkeit")
    plt.legend()
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()


# ------------------------------------------------------------
# 10. Hauptprogramm
# ------------------------------------------------------------

def main():
    random.seed(42)

    output_dir = Path("simulation_results")
    output_dir.mkdir(exist_ok=True)

    trials = 1000

    demo_single_example()

    print("\nStarte Ein-Bit-Avalanche-Simulation...")
    bit_flip_results = run_bit_flip_simulation(trials)

    print("\nStarte Nonce-plus-1-Simulation...")
    nonce_results = run_nonce_simulation(trials)

    all_results = bit_flip_results + nonce_results

    save_results_csv(all_results, output_dir / "results.csv")

    bit_flip_sha = [r["sha256_distance"] for r in bit_flip_results]
    bit_flip_double = [r["double_sha256_distance"] for r in bit_flip_results]

    nonce_sha = [r["sha256_distance"] for r in nonce_results]
    nonce_double = [r["double_sha256_distance"] for r in nonce_results]

    print_summary("Ein-Bit-Änderung mit SHA-256", bit_flip_sha)
    print_summary("Ein-Bit-Änderung mit Double-SHA-256", bit_flip_double)
    print_summary("Nonce + 1 mit SHA-256", nonce_sha)
    print_summary("Nonce + 1 mit Double-SHA-256", nonce_double)

    plot_histogram(
        bit_flip_sha,
        "Avalanche Effect bei SHA-256: Ein-Bit-Änderung",
        output_dir / "histogram_bit_flip_sha256.png"
    )

    plot_histogram(
        bit_flip_double,
        "Avalanche Effect bei Double-SHA-256: Ein-Bit-Änderung",
        output_dir / "histogram_bit_flip_double_sha256.png"
    )

    plot_histogram(
        nonce_double,
        "Bitcoin-naher Test: Nonce + 1 mit Double-SHA-256",
        output_dir / "histogram_nonce_double_sha256.png"
    )

    print("\nStarte kleine Proof-of-Work-Demo...")
    pow_result = run_mini_pow_demo(difficulty_bits=16)

    print("\n--- Mini-Proof-of-Work-Demo ---")
    if pow_result["found"]:
        print(f"Gültige Nonce gefunden: {pow_result['nonce']}")
        print(f"Hash: {pow_result['hash']}")
        print(f"Führende Nullbits: {pow_result['leading_zero_bits']}")
        print(f"Benötigte Versuche: {pow_result['attempts']}")
    else:
        print("Keine gültige Nonce im gesetzten Bereich gefunden.")

    print(f"\nErgebnisse gespeichert im Ordner: {output_dir}")


if __name__ == "__main__":
    main()